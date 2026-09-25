// One sync exchange (BRAIN-SYNC-SPEC §29), transport-agnostic:
//
//   1. build the push: queued ops (+ the whole local state on a full resync)
//   2. transport.sync(request) — bounded by a timeout
//   3. validate the response (§45); reject it wholesale if malformed
//   4. merge the returned remote changes into local state (mergeEngine) and
//      write only keys whose value actually changed
//   5. acknowledge ops, advance the cursor
//
// Everything here runs AFTER local saves and never blocks gameplay: a
// failure only leaves ops queued and returns a status (§2, §43, §46).
//
// A transport is `{ sync(request) => Promise<response> }`:
//   request  { schemaVersion, deviceId, cursor, operations: [{ operationId,
//              deviceId, entityType, entityId, payload, version }] }
//   response { acknowledged: [operationId], changes: { storageKey: value },
//              cursor }
// Phase 4's HTTPS client and mockServer.js both implement it.

import { CURRENT_SCHEMA_VERSION } from '../persistence/migrations.js'
import { getDeviceId } from '../persistence/device.js'
import { contentUUID, stableStringify } from '../persistence/ids.js'
import { isGameKey } from '../../constants/storageKeys.js'
import { mergeData, syncableData } from './mergeEngine.js'
import { getSyncState, updateSyncState, listOutbox, markAttempted, acknowledge, dropOp } from './outbox.js'

export const SYNC_TIMEOUT_MS = 15000
const BACKOFF_BASE_MS = 5000
const BACKOFF_MAX_MS = 15 * 60 * 1000

// Bounded exponential backoff with jitter (§22): 5s, 10s, 20s … capped at 15min.
export function backoffDelay(consecutiveFailures, random = Math.random) {
  if (consecutiveFailures <= 0) return 0
  const ceiling = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (consecutiveFailures - 1))
  return Math.round(ceiling * (0.5 + random() * 0.5))
}

function readLocalSyncable() {
  const data = {}
  for (const key of Object.keys(localStorage)) {
    if (!isGameKey(key)) continue
    try {
      data[key] = JSON.parse(localStorage.getItem(key))
    } catch {
      // unparseable local value — never pushed, never overwritten
    }
  }
  return syncableData(data)
}

function buildOperations(state) {
  const deviceId = getDeviceId()
  const queued = []
  const outgoing = []
  for (const op of listOutbox()) {
    if (op.entityType === 'record') {
      let value
      try {
        value = JSON.parse(localStorage.getItem(op.entityId))
      } catch {
        value = null
      }
      if (value === null || value === undefined) {
        dropOp(op) // the key no longer exists locally — nothing to push
        continue
      }
      outgoing.push({ ...op, payload: value })
    } else {
      outgoing.push(op)
    }
    queued.push(op)
  }
  if (state.needsFullResync) {
    // §9/§31/§32: bootstrap — every durable key, merged server-side as a
    // join. IDs derive from (device, key, content) so a retried bootstrap of
    // unchanged data is recognized as the same operation (§28).
    for (const [key, value] of Object.entries(readLocalSyncable())) {
      const operationId = contentUUID(`bootstrap\n${deviceId}\n${key}\n${stableStringify(value)}`)
      outgoing.push({ operationId, deviceId, entityType: 'record', entityId: key, payload: value, version: 0 })
    }
  }
  return { queued, outgoing }
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

export function validateResponse(response) {
  if (!isPlainObject(response)) throw new Error('invalid sync response')
  if (!Array.isArray(response.acknowledged) || !response.acknowledged.every((id) => typeof id === 'string')) throw new Error('invalid sync response: acknowledged')
  if (!isPlainObject(response.changes)) throw new Error('invalid sync response: changes')
  if (response.cursor === undefined) throw new Error('invalid sync response: cursor')
  return response
}

function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`sync timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// Writes merged remote changes. Raw setItem, NOT persistJSON: data that
// came from the server must not be queued straight back to it.
function applyRemoteChanges(changes) {
  const remote = syncableData(changes)
  if (Object.keys(remote).length === 0) return []
  const local = readLocalSyncable()
  const merged = mergeData(local, remote)
  const written = []
  for (const [key, value] of Object.entries(merged)) {
    if (stableStringify(value) === stableStringify(local[key])) continue
    try {
      localStorage.setItem(key, JSON.stringify(value))
      written.push(key)
    } catch {
      // quota: keep what we have; the server still holds it and a later
      // pull (or full resync) retries
    }
  }
  return written
}

let inFlight = null

// Single-flight: overlapping triggers share one exchange.
export function runSync(options) {
  if (!inFlight) inFlight = doSync(options).finally(() => { inFlight = null })
  return inFlight
}

async function doSync({ transport, online = true, timeoutMs = SYNC_TIMEOUT_MS, now = () => new Date().toISOString() } = {}) {
  const state = getSyncState()
  if (!state.enabled) return { status: 'disabled' }
  if (!transport) return { status: 'no-transport' }
  if (!online) return { status: 'offline', pending: listOutbox().length }

  const { queued, outgoing } = buildOperations(state)
  const request = { schemaVersion: CURRENT_SCHEMA_VERSION, deviceId: getDeviceId(), cursor: state.cursor, operations: outgoing }
  const attemptAt = now()
  markAttempted(queued, attemptAt)
  updateSyncState({ lastAttemptAt: attemptAt })

  let response
  try {
    response = validateResponse(await withTimeout(Promise.resolve().then(() => transport.sync(request)), timeoutMs))
  } catch (error) {
    const unauthorized = error?.status === 401 || error?.status === 403
    const next = updateSyncState({
      consecutiveFailures: state.consecutiveFailures + 1,
      lastError: unauthorized ? 'unauthorized' : String(error?.message ?? error),
    })
    // §44: a revoked/expired credential isn't retried automatically — it
    // needs re-pairing. Local play is unaffected either way.
    return { status: unauthorized ? 'unauthorized' : 'failed', error: next.lastError, retryInMs: unauthorized ? null : backoffDelay(next.consecutiveFailures) }
  }

  const pulled = applyRemoteChanges(response.changes)
  acknowledge(response.acknowledged, queued)
  const ackedAll = outgoing.every((op) => response.acknowledged.includes(op.operationId))
  const patch = { cursor: response.cursor, lastSyncAt: now(), consecutiveFailures: 0, lastError: null }
  // Only a completed bootstrap clears the flag — never one raised meanwhile.
  if (state.needsFullResync && ackedAll) patch.needsFullResync = false
  updateSyncState(patch)
  return { status: 'synced', pushed: outgoing.length, pulled: pulled.length, pending: listOutbox().length }
}

// §41's states, for the status line Phase 6 adds.
export function getSyncStatus({ online = true } = {}) {
  const state = getSyncState()
  const pending = listOutbox().length
  if (!state.enabled) return { state: 'local-only', pending }
  if (state.lastError === 'unauthorized') return { state: 'needs-pairing', pending }
  if (!online) return { state: 'offline', pending }
  if (state.consecutiveFailures > 0) return { state: 'unavailable', pending }
  if (pending > 0 || state.needsFullResync) return { state: 'pending', pending }
  return { state: 'synced', pending, lastSyncAt: state.lastSyncAt }
}
