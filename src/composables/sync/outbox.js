// Durable sync outbox (BRAIN-SYNC-SPEC §21-§22, Phase 3).
//
// While sync is enabled, every durable local write (persistence/
// durableWrite.js) queues what the server needs, in the same synchronous
// step as the local save itself:
//
//   session        one op per NEW history entry (entityId = sessionId),
//                  carrying the entry. Stored with its payload because
//                  local history is capped — an entry can be evicted from
//                  its history list before the device is next online, but
//                  its queued op survives until the server acknowledges it.
//   record         one op per stats/best/progress/learning key (entityId =
//                  storage key), coalesced: a newer write to the same key
//                  replaces the op (new operationId, version + 1). The
//                  payload is read at send time — every record merges as a
//                  join (sync/mergeEngine.js), so the latest state is all
//                  the server ever needs.
//   learningEvent  one op per Flags answer (entityId = learningEventId), so
//                  mastery can later be recomputed from the merged event
//                  set (§20). Only queued, never kept locally after ack.
//
// Each op lives under its own key (OUTBOX_PREFIX + type + id) rather than
// in one shared array, so two open tabs never lose each other's ops to a
// read-modify-write race. Ops live under brain:, so they're never exported.
//
// When sync is disabled (the default), nothing is ever queued.

import { SYNC_STATE_KEY, OUTBOX_PREFIX, isGameKey, isHistoryKey, isDeviceLocalKey } from '../../constants/storageKeys.js'
import { onDurableWrite } from '../persistence/durableWrite.js'
import { getDeviceId } from '../persistence/device.js'
import { randomUUID } from '../persistence/ids.js'

const defaultState = () => ({
  enabled: false,
  cursor: null,
  needsFullResync: false,
  lastSyncAt: null,
  lastAttemptAt: null,
  consecutiveFailures: 0,
  lastError: null,
})

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

export function getSyncState() {
  return { ...defaultState(), ...(readJSON(SYNC_STATE_KEY) ?? {}) }
}

export function updateSyncState(patch) {
  const next = { ...getSyncState(), ...patch }
  try {
    localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(next))
  } catch {
    // quota — sync bookkeeping only; local progress is unaffected
  }
  return next
}

export function isSyncEnabled() {
  return getSyncState().enabled === true
}

// §9: enabling sync never discards anything — the first sync pushes the
// whole local state (needsFullResync) and merges it with the cloud.
export function enableSync() {
  return updateSyncState({ enabled: true, needsFullResync: true })
}

// Stops syncing and drops the queue. Local progress is untouched (§39); a
// later enableSync() starts with a full resync, so nothing is lost.
export function disableSync() {
  clearOutbox()
  return updateSyncState({ enabled: false, cursor: null, needsFullResync: false, consecutiveFailures: 0, lastError: null })
}

const opKey = (entityType, entityId) => `${OUTBOX_PREFIX}${entityType}:${entityId}`

function putOp(entityType, entityId, payload, now) {
  const key = opKey(entityType, entityId)
  const existing = readJSON(key)
  const op = {
    operationId: randomUUID(),
    deviceId: getDeviceId(),
    entityType,
    entityId,
    payload,
    version: (existing?.version ?? 0) + 1,
    createdAt: existing?.createdAt ?? now,
    attemptCount: 0,
    lastAttemptAt: null,
  }
  try {
    localStorage.setItem(key, JSON.stringify(op))
  } catch {
    // Out of room for the queue: the data itself is saved; fall back to
    // pushing the complete local state on the next successful sync.
    updateSyncState({ needsFullResync: true })
  }
}

// The durable-write listener. `previousRaw` is the key's value before this
// write, used to find which history entries are genuinely new.
export function recordWrite(key, value, previousRaw, now = new Date().toISOString()) {
  if (!isSyncEnabled() || !isGameKey(key) || isDeviceLocalKey(key)) return
  if (isHistoryKey(key) && Array.isArray(value)) {
    let previous = []
    try {
      previous = JSON.parse(previousRaw) ?? []
    } catch {
      // unreadable previous value — treat every entry as potentially new;
      // duplicates are harmless (union by sessionId)
    }
    const known = new Set(Array.isArray(previous) ? previous.map((e) => e?.sessionId) : [])
    for (const entry of value) {
      if (typeof entry?.sessionId !== 'string') {
        putOp('record', key, null, now) // un-identified entry: push the whole list
      } else if (!known.has(entry.sessionId)) {
        putOp('session', entry.sessionId, { key, entry }, now)
      }
    }
    return
  }
  putOp('record', key, null, now)
}

// events: [{ countryCode, correct, wrongCode, timestamp }] for one round.
export function enqueueLearningEvents(game, level, events, now = new Date().toISOString()) {
  if (!isSyncEnabled()) return
  for (const e of events) {
    const learningEventId = randomUUID()
    putOp('learningEvent', learningEventId, {
      learningEventId,
      deviceId: getDeviceId(),
      game,
      level,
      countryCode: e.countryCode,
      correct: e.correct,
      wrongCode: e.wrongCode ?? null,
      answeredAt: e.timestamp ?? null, // informational only (§47)
    }, now)
  }
}

export function listOutbox() {
  const ops = []
  let keys = []
  try {
    keys = Object.keys(localStorage).filter((k) => k.startsWith(OUTBOX_PREFIX))
  } catch {
    return ops
  }
  for (const key of keys) {
    const op = readJSON(key)
    if (op && typeof op.operationId === 'string') ops.push(op)
  }
  return ops.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)) || opKey(a.entityType, a.entityId).localeCompare(opKey(b.entityType, b.entityId)))
}

export function pendingCount() {
  return listOutbox().length
}

// Updates only ops that are still the exact version that was sent — a
// newer local write to the same entity must not inherit an old attempt.
function withCurrentOp(op, fn) {
  const key = opKey(op.entityType, op.entityId)
  const current = readJSON(key)
  if (current?.operationId === op.operationId) fn(key, current)
}

export function markAttempted(ops, now = new Date().toISOString()) {
  for (const op of ops) {
    withCurrentOp(op, (key, current) => {
      try {
        localStorage.setItem(key, JSON.stringify({ ...current, attemptCount: current.attemptCount + 1, lastAttemptAt: now }))
      } catch {
        // bookkeeping only
      }
    })
  }
}

// Removes acknowledged ops. An op that was superseded after it was sent
// (new operationId) stays queued — the server hasn't seen that version.
export function acknowledge(operationIds, ops) {
  const acked = new Set(operationIds)
  for (const op of ops) {
    if (acked.has(op.operationId)) withCurrentOp(op, (key) => localStorage.removeItem(key))
  }
}

export function dropOp(op) {
  withCurrentOp(op, (key) => localStorage.removeItem(key))
}

export function clearOutbox() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith(OUTBOX_PREFIX)) localStorage.removeItem(key)
  } catch {
    // nothing to clear
  }
}

let uninstall = null

// Called once at startup (main.js). Idempotent.
export function installOutbox() {
  if (!uninstall) uninstall = onDurableWrite((key, value, previousRaw) => recordWrite(key, value, previousRaw))
  return () => {
    uninstall?.()
    uninstall = null
  }
}

// §41's states (see syncStatus.js for the wording shown to the player).
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
