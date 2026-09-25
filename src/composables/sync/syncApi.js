// Browser client for the Brain Sync API (server/app.js): the HTTP
// transport runSync() uses, plus identity/device management calls.
//
// The device credential is stored under SYNC_CREDENTIAL_KEY (brain:…), so
// it is never exported, never imported and never shown (§14, §40). It only
// ever travels in the Authorization header over HTTPS — never in a URL.
// Nothing here is called until the Phase 6 UI; enabling sync is always an
// explicit user action.

import { SYNC_CREDENTIAL_KEY } from '../../constants/storageKeys.js'
import { getDeviceId } from '../persistence/device.js'
import { enableSync, disableSync } from './outbox.js'

export class SyncHttpError extends Error {
  constructor(status, code) {
    super(`sync api ${status}${code ? ` ${code}` : ''}`)
    this.status = status
    this.code = code
  }
}

export function getStoredCredential() {
  try {
    const stored = JSON.parse(localStorage.getItem(SYNC_CREDENTIAL_KEY))
    return stored && typeof stored.credential === 'string' ? stored : null
  } catch {
    return null
  }
}

function storeCredential(value) {
  localStorage.setItem(SYNC_CREDENTIAL_KEY, JSON.stringify(value))
}

export function forgetCredential() {
  try {
    localStorage.removeItem(SYNC_CREDENTIAL_KEY)
  } catch {
    // nothing stored
  }
}

async function request(baseUrl, method, path, { credential, body, signal, fetchFn = globalThis.fetch } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (credential) headers.Authorization = `Bearer ${credential}`
  const response = await fetchFn(`${baseUrl.replace(/\/+$/, '')}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
    credentials: 'omit',
    cache: 'no-store',
  })
  let payload = null
  try {
    payload = await response.json()
  } catch {
    // empty or non-JSON body
  }
  if (!response.ok) throw new SyncHttpError(response.status, payload?.error)
  return payload
}

// The transport for syncClient.runSync(). Reads the credential at call
// time, so a re-pair or revocation takes effect on the next exchange.
export function createHttpTransport({ fetchFn } = {}) {
  return {
    async sync(body, { signal } = {}) {
      const stored = getStoredCredential()
      if (!stored) throw new SyncHttpError(401, 'no_credential')
      return request(stored.baseUrl, 'POST', '/v1/sync', { credential: stored.credential, body, signal, fetchFn })
    },
  }
}

// §9: "Enable Brain Sync" — creates the anonymous identity with this
// installation as its first device, stores the credential, and turns sync
// on (the first exchange then uploads all existing local progress).
export async function createIdentity({ baseUrl, displayName, deviceLabel, fetchFn } = {}) {
  const created = await request(baseUrl, 'POST', '/v1/identities', {
    body: { deviceId: getDeviceId(), displayName, deviceLabel },
    fetchFn,
  })
  storeCredential({ baseUrl, syncId: created.syncId, credential: created.credential })
  enableSync()
  return { syncId: created.syncId, deviceId: created.deviceId }
}

function authed(method, path, body, fetchFn) {
  const stored = getStoredCredential()
  if (!stored) return Promise.reject(new SyncHttpError(401, 'no_credential'))
  return request(stored.baseUrl, method, path, { credential: stored.credential, body, fetchFn })
}

export const getProfile = ({ fetchFn } = {}) => authed('GET', '/v1/profile', undefined, fetchFn)
export const renameProfile = (displayName, { fetchFn } = {}) => authed('PATCH', '/v1/profile', { displayName }, fetchFn)
export const listDevices = ({ fetchFn } = {}) => authed('GET', '/v1/devices', undefined, fetchFn).then((r) => r.devices)
export const renameDevice = (deviceId, label, { fetchFn } = {}) => authed('PATCH', `/v1/devices/${encodeURIComponent(deviceId)}`, { label }, fetchFn)
export const revokeDevice = (deviceId, { fetchFn } = {}) => authed('DELETE', `/v1/devices/${encodeURIComponent(deviceId)}`, undefined, fetchFn)

// §39: deletes the cloud identity and all its progress. Local progress on
// this device is kept; this device simply stops syncing.
export async function deleteCloudData({ fetchFn } = {}) {
  await authed('DELETE', '/v1/identity', undefined, fetchFn)
  forgetCredential()
  disableSync()
}

// §39: "Disconnect This Device" — revokes this device's own credential
// (best effort: works offline too, the server copy just stays valid until
// revoked from another device) and stops syncing. Local progress is kept.
export async function disconnectThisDevice({ fetchFn } = {}) {
  try {
    await revokeDevice(getDeviceId(), { fetchFn })
  } catch {
    // offline or already revoked — disconnect locally regardless
  }
  forgetCredential()
  disableSync()
}
