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
import { isValidRecoveryCode, normalizeRecoveryCode } from './recoveryCode.js'
import { SYNC_SERVER_URL } from './config.js'

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
  // The recovery code is returned exactly once — the caller must show it
  // (and explain that losing every device AND the code can make cloud
  // recovery impossible, §12). It is never stored on the device.
  return { syncId: created.syncId, deviceId: created.deviceId, recoveryCode: created.recoveryCode }
}

// ---- pairing (§10, §11) --------------------------------------------------
//
// QR payload: `BRAINPAIR1.<token>.<base64url(baseUrl)>` — deliberately not
// a URL, so a camera app won't open it in a browser (and log it in history)
// and it can't be mistaken for a link to share. It carries a short-lived,
// single-use secret; treat it like one.

const PAIR_PREFIX = 'BRAINPAIR1'

function base64UrlEncode(text) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  return new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)))
}

export function encodePairingPayload(baseUrl, token) {
  return `${PAIR_PREFIX}.${token}.${base64UrlEncode(baseUrl)}`
}

// A pairing payload may only point at an HTTPS server, a local one, or the
// exact server this build was configured with (VITE_BRAIN_SYNC_URL, fixed at
// build time — e.g. a plain-http server on the LAN during development).
export function decodePairingPayload(text, { trustedServer = SYNC_SERVER_URL } = {}) {
  const parts = typeof text === 'string' ? text.trim().split('.') : []
  if (parts.length !== 3 || parts[0] !== PAIR_PREFIX || !/^bpt_[A-Za-z0-9_-]{20,}$/.test(parts[1])) return null
  try {
    const baseUrl = base64UrlDecode(parts[2])
    const url = new URL(baseUrl)
    const configured = trustedServer !== '' && baseUrl.replace(/\/+$/, '') === trustedServer
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' && !configured) return null
    return { token: parts[1], baseUrl }
  } catch {
    return null
  }
}

// On the trusted device: a fresh token, ready to render as a QR code.
export async function createPairingPayload({ fetchFn } = {}) {
  const stored = getStoredCredential()
  const { token, expiresAt } = await authed('POST', '/v1/pairing-tokens', undefined, fetchFn)
  return { payload: encodePairingPayload(stored.baseUrl, token), expiresAt }
}

export const cancelPairing = ({ fetchFn } = {}) => authed('DELETE', '/v1/pairing-tokens', undefined, fetchFn)

// Joining (by QR or recovery code) keeps any progress already on this
// device: sync is enabled with a full resync, so local + cloud are merged
// (§31/§32) — never "keep local" vs "keep cloud".
function joined(baseUrl, result) {
  storeCredential({ baseUrl, syncId: result.syncId, credential: result.credential })
  enableSync()
  return { syncId: result.syncId, deviceId: result.deviceId, displayName: result.displayName ?? null }
}

// On the new device: claim the scanned payload.
export async function pairWithPayload(payloadText, { deviceLabel, fetchFn } = {}) {
  const decoded = decodePairingPayload(payloadText)
  if (!decoded) throw new SyncHttpError(400, 'invalid_pairing_payload')
  const result = await request(decoded.baseUrl, 'POST', '/v1/pairing/claim', {
    body: { token: decoded.token, deviceId: getDeviceId(), deviceLabel },
    fetchFn,
  })
  return joined(decoded.baseUrl, result)
}

// The "paste a code" box accepts either kind of code, because the two are
// easy to mix up: a pairing code (BRAINPAIR1.…, from Add Device) or the
// recovery code (XXXX-XXXX-…). A recovery code pasted here is simply used as
// one, instead of being rejected as "not a pairing code".
export async function joinWithCode(text, { baseUrl, deviceLabel, fetchFn } = {}) {
  if (decodePairingPayload(text)) return pairWithPayload(text, { deviceLabel, fetchFn })
  if (normalizeRecoveryCode(text) !== null) return recoverWithCode(baseUrl, text, { deviceLabel, fetchFn })
  throw new SyncHttpError(400, 'invalid_pairing_payload')
}

// ---- recovery code (§12) -------------------------------------------------

export const getRecoveryStatus = ({ fetchFn } = {}) => authed('GET', '/v1/recovery-code', undefined, fetchFn)

// Replaces the recovery code; the old one stops working immediately.
export const rotateRecoveryCode = ({ fetchFn } = {}) => authed('POST', '/v1/recovery-code', undefined, fetchFn)

export async function recoverWithCode(baseUrl, recoveryCode, { deviceLabel, fetchFn } = {}) {
  // Checked locally first, so a typo never uses up a rate-limited attempt.
  if (!isValidRecoveryCode(recoveryCode)) throw new SyncHttpError(400, 'invalid_recovery_code_format')
  const result = await request(baseUrl, 'POST', '/v1/recover', {
    body: { recoveryCode: normalizeRecoveryCode(recoveryCode), deviceId: getDeviceId(), deviceLabel },
    fetchFn,
  })
  return joined(baseUrl, result)
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
