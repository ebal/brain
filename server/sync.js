// Brain Sync domain logic (BRAIN-SYNC-SPEC §5-§8, §14, §28-§30, §36, §39):
// anonymous identities, devices and their credentials, and the sync
// exchange. Merges use the exact same pure engine as the client
// (src/composables/sync/mergeEngine.js), so the server can never disagree
// with a device about which progress is "better".
//
// Authentication is by device credential ONLY. A Sync ID is an identifier,
// never a secret: nothing here accepts it as proof of anything (§5).

import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { transaction } from './db.js'
import { mergeKey, mergeData, mergeHistory, syncableData } from '../src/composables/sync/mergeEngine.js'
import { LEVEL_GAMES } from '../src/composables/sync/mergeRules.js'
import { isGameKey, isHistoryKey, isDeviceLocalKey } from '../src/constants/storageKeys.js'
import { stableStringify } from '../src/composables/persistence/ids.js'
import { CURRENT_SCHEMA_VERSION } from '../src/composables/persistence/migrations.js'

export const LIMITS = {
  maxOperations: 5000,
  maxLabelLength: 64,
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ENTITY_TYPES = new Set(['session', 'record', 'learningEvent'])

export class ApiError extends Error {
  constructor(status, code) {
    super(code)
    this.status = status
    this.code = code
  }
}

const now = () => new Date().toISOString()
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

// 256-bit random bearer credential. Only its SHA-256 is stored: the
// credential is already high-entropy, so a slow password hash buys nothing
// and a fast one allows an indexed lookup.
export function newCredential() {
  return `bsc_${randomBytes(32).toString('base64url')}`
}

export function hashCredential(credential) {
  return createHash('sha256').update(credential, 'utf8').digest('hex')
}

function cleanLabel(value) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw new ApiError(400, 'invalid_label')
  const trimmed = value.trim()
  if (trimmed.length > LIMITS.maxLabelLength) throw new ApiError(400, 'label_too_long')
  return trimmed || null
}

// ---- identities and devices ---------------------------------------------

export function createIdentity(db, { deviceId, deviceLabel, displayName } = {}) {
  if (typeof deviceId !== 'string' || !UUID.test(deviceId)) throw new ApiError(400, 'invalid_device_id')
  const syncId = randomUUID()
  const credential = newCredential()
  const at = now()
  transaction(db, () => {
    db.prepare('INSERT INTO identities (sync_id, display_name, created_at) VALUES (?, ?, ?)').run(syncId, cleanLabel(displayName), at)
    db.prepare('INSERT INTO devices (sync_id, device_id, label, credential_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(syncId, deviceId, cleanLabel(deviceLabel), hashCredential(credential), at, at)
  })
  return { syncId, deviceId, credential }
}

// Adds another installation to an existing identity and issues its
// credential. Deliberately not reachable over HTTP on its own: Phase 5's
// pairing-token and recovery-code endpoints are the only callers (§10-§12).
// Re-registering a revoked device ID issues a fresh credential.
export function registerDevice(db, syncId, { deviceId, label } = {}) {
  if (typeof deviceId !== 'string' || !UUID.test(deviceId)) throw new ApiError(400, 'invalid_device_id')
  const credential = newCredential()
  const at = now()
  db.prepare(`INSERT INTO devices (sync_id, device_id, label, credential_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT (sync_id, device_id) DO UPDATE SET credential_hash = excluded.credential_hash, revoked_at = NULL,
                label = COALESCE(excluded.label, devices.label), last_seen_at = excluded.last_seen_at`)
    .run(syncId, deviceId, cleanLabel(label), hashCredential(credential), at, at)
  return { syncId, deviceId, credential }
}

// Resolves a bearer credential to its (non-revoked) device, or throws 401.
export function authenticate(db, credential) {
  if (typeof credential !== 'string' || !credential.startsWith('bsc_') || credential.length > 128) throw new ApiError(401, 'unauthorized')
  const device = db.prepare('SELECT sync_id AS syncId, device_id AS deviceId FROM devices WHERE credential_hash = ? AND revoked_at IS NULL')
    .get(hashCredential(credential))
  if (!device) throw new ApiError(401, 'unauthorized')
  db.prepare('UPDATE devices SET last_seen_at = ? WHERE sync_id = ? AND device_id = ?').run(now(), device.syncId, device.deviceId)
  return { syncId: device.syncId, deviceId: device.deviceId }
}

export function getProfile(db, auth) {
  const identity = db.prepare('SELECT display_name AS displayName, created_at AS createdAt FROM identities WHERE sync_id = ?').get(auth.syncId)
  return { syncId: auth.syncId, deviceId: auth.deviceId, displayName: identity.displayName, createdAt: identity.createdAt }
}

export function renameProfile(db, auth, { displayName } = {}) {
  db.prepare('UPDATE identities SET display_name = ? WHERE sync_id = ?').run(cleanLabel(displayName), auth.syncId)
  return getProfile(db, auth)
}

export function listDevices(db, auth) {
  return db.prepare(`SELECT device_id AS deviceId, label, created_at AS createdAt, last_seen_at AS lastSeenAt, revoked_at AS revokedAt
                     FROM devices WHERE sync_id = ? ORDER BY created_at, device_id`).all(auth.syncId)
    .map((d) => ({ ...d, current: d.deviceId === auth.deviceId }))
}

function requireDevice(db, auth, deviceId) {
  const row = db.prepare('SELECT device_id FROM devices WHERE sync_id = ? AND device_id = ?').get(auth.syncId, deviceId)
  if (!row) throw new ApiError(404, 'device_not_found') // also what another identity's device looks like
}

export function renameDevice(db, auth, deviceId, { label } = {}) {
  requireDevice(db, auth, deviceId)
  db.prepare('UPDATE devices SET label = ? WHERE sync_id = ? AND device_id = ?').run(cleanLabel(label), auth.syncId, deviceId)
  return listDevices(db, auth).find((d) => d.deviceId === deviceId)
}

// §13: revokes one device's credential; its synced progress stays in the
// cloud and its local data is never touched (the server can't reach it).
export function revokeDevice(db, auth, deviceId) {
  requireDevice(db, auth, deviceId)
  db.prepare('UPDATE devices SET credential_hash = NULL, revoked_at = COALESCE(revoked_at, ?) WHERE sync_id = ? AND device_id = ?').run(now(), auth.syncId, deviceId)
  return listDevices(db, auth).find((d) => d.deviceId === deviceId)
}

// §39: removes the identity and every row belonging to it (cascade).
export function deleteIdentity(db, auth) {
  transaction(db, () => db.prepare('DELETE FROM identities WHERE sync_id = ?').run(auth.syncId))
  return { deleted: true }
}

// ---- sync exchange ------------------------------------------------------

function validateRequest(body) {
  if (!isPlainObject(body)) throw new ApiError(400, 'invalid_request')
  if (body.schemaVersion !== CURRENT_SCHEMA_VERSION) throw new ApiError(409, 'schema_version_mismatch')
  if (body.cursor !== null && body.cursor !== undefined && !(Number.isInteger(body.cursor) && body.cursor >= 0)) throw new ApiError(400, 'invalid_cursor')
  if (!Array.isArray(body.operations)) throw new ApiError(400, 'invalid_operations')
  if (body.operations.length > LIMITS.maxOperations) throw new ApiError(413, 'too_many_operations')
  for (const op of body.operations) {
    if (!isPlainObject(op) || typeof op.operationId !== 'string' || op.operationId.length > 64 || !ENTITY_TYPES.has(op.entityType) || typeof op.entityId !== 'string' || op.entityId.length > 200) {
      throw new ApiError(400, 'invalid_operation')
    }
  }
}

const syncable = (key) => typeof key === 'string' && isGameKey(key) && !isDeviceLocalKey(key)

function nextRevision(db, syncId) {
  db.prepare('UPDATE identities SET revision = revision + 1 WHERE sync_id = ?').run(syncId)
  return db.prepare('SELECT revision FROM identities WHERE sync_id = ?').get(syncId).revision
}

function upsertSession(db, auth, key, entry, touched) {
  if (!isHistoryKey(key) || !isPlainObject(entry) || typeof entry.sessionId !== 'string' || entry.sessionId.length > 64) return false
  const existing = db.prepare('SELECT storage_key AS key, entry FROM sessions WHERE sync_id = ? AND session_id = ?').get(auth.syncId, entry.sessionId)
  if (existing) {
    // Same session ID seen again: keep the deterministic merge winner.
    const stored = JSON.parse(existing.entry)
    const [winner] = mergeKey(key, [stored], [entry])
    if (stableStringify(winner) === stableStringify(stored)) return true
    db.prepare('UPDATE sessions SET entry = ?, revision = ? WHERE sync_id = ? AND session_id = ?')
      .run(JSON.stringify(winner), nextRevision(db, auth.syncId), auth.syncId, entry.sessionId)
    touched.add(existing.key)
    return true
  }
  db.prepare('INSERT INTO sessions (sync_id, session_id, storage_key, entry, device_id, revision, received_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(auth.syncId, entry.sessionId, key, JSON.stringify(entry), auth.deviceId, nextRevision(db, auth.syncId), now())
  touched.add(key)
  return true
}

function upsertRecord(db, auth, key, value, touched) {
  const row = db.prepare('SELECT value FROM records WHERE sync_id = ? AND storage_key = ?').get(auth.syncId, key)
  const current = row ? JSON.parse(row.value) : undefined
  const merged = mergeKey(key, current, value)
  if (merged === undefined) return false // structurally invalid and nothing valid stored (§45)
  if (current !== undefined && stableStringify(merged) === stableStringify(current)) return true
  const at = now()
  db.prepare(`INSERT INTO records (sync_id, storage_key, value, revision, updated_at) VALUES (?, ?, ?, ?, ?)
              ON CONFLICT (sync_id, storage_key) DO UPDATE SET value = excluded.value, revision = excluded.revision, updated_at = excluded.updated_at`)
    .run(auth.syncId, key, JSON.stringify(merged), nextRevision(db, auth.syncId), at)
  touched.add(key)
  return true
}

// Applies one op. Returns false when the op is invalid (it's still
// acknowledged, so a bad op can never jam a device's queue — it's simply
// never merged).
function applyOperation(db, auth, op, touched) {
  const payload = op.payload
  if (op.entityType === 'learningEvent') {
    if (!isPlainObject(payload) || payload.learningEventId !== op.entityId) return false
    db.prepare('INSERT OR IGNORE INTO learning_events (sync_id, event_id, payload, device_id, received_at) VALUES (?, ?, ?, ?, ?)')
      .run(auth.syncId, op.entityId, JSON.stringify(payload), auth.deviceId, now())
    return true
  }
  if (op.entityType === 'session') {
    if (!isPlainObject(payload) || !syncable(payload.key) || payload.entry?.sessionId !== op.entityId) return false
    return upsertSession(db, auth, payload.key, payload.entry, touched)
  }
  // record
  if (!syncable(op.entityId)) return false
  if (isHistoryKey(op.entityId)) {
    // A whole history list (bootstrap/full resync): stored as sessions.
    if (!Array.isArray(payload)) return false
    let ok = true
    for (const entry of payload) ok = upsertSession(db, auth, op.entityId, entry, touched) && ok
    return ok
  }
  return upsertRecord(db, auth, op.entityId, payload, touched)
}

// §25: campaign progression is re-derived server-side whenever a level
// game's progress or per-level bests change, exactly as the client does.
function rederiveProgress(db, auth, touched) {
  for (const game of Object.keys(LEVEL_GAMES)) {
    if (![...touched].some((key) => key.startsWith(`${game}:stats:`) || key === `${game}:progress`)) continue
    const rows = db.prepare("SELECT storage_key AS key, value FROM records WHERE sync_id = ? AND (storage_key = ? OR storage_key LIKE ? ESCAPE '\\')")
      .all(auth.syncId, `${game}:progress`, `${game}:stats:%`)
    const subset = Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]))
    const progress = subset[`${game}:progress`]
    if (!progress) continue
    const derived = mergeData(subset, {})[`${game}:progress`]
    if (stableStringify(derived) !== stableStringify(progress)) upsertRecord(db, auth, `${game}:progress`, derived, touched)
  }
}

function changesSince(db, syncId, cursor) {
  const since = cursor ?? 0
  const changes = {}
  for (const row of db.prepare('SELECT storage_key AS key, value FROM records WHERE sync_id = ? AND revision > ? ORDER BY storage_key').all(syncId, since)) {
    changes[row.key] = JSON.parse(row.value)
  }
  const sessions = {}
  for (const row of db.prepare('SELECT storage_key AS key, entry FROM sessions WHERE sync_id = ? AND revision > ?').all(syncId, since)) {
    ;(sessions[row.key] ??= []).push(JSON.parse(row.entry))
  }
  // Canonical (merge-engine) order, not arrival order — a device with no
  // local copy of a key stores this list as-is, and must end up with the
  // exact same list as a device that merged it.
  for (const [key, entries] of Object.entries(sessions)) changes[key] = mergeHistory(entries, [])
  return syncableData(changes)
}

export function sync(db, auth, body) {
  validateRequest(body)
  return transaction(db, () => {
    const touched = new Set()
    const acknowledged = []
    const rejected = []
    const seen = db.prepare('SELECT 1 FROM operations WHERE sync_id = ? AND operation_id = ?')
    const remember = db.prepare('INSERT INTO operations (sync_id, operation_id, device_id, received_at) VALUES (?, ?, ?, ?)')
    for (const op of body.operations) {
      if (!seen.get(auth.syncId, op.operationId)) {
        // §28: an operation is applied at most once per identity; a retry
        // (lost response, second tab) is acknowledged without re-applying.
        if (!applyOperation(db, auth, op, touched)) rejected.push(op.operationId)
        remember.run(auth.syncId, op.operationId, auth.deviceId, now())
      }
      acknowledged.push(op.operationId)
    }
    rederiveProgress(db, auth, touched)
    const cursor = db.prepare('SELECT revision FROM identities WHERE sync_id = ?').get(auth.syncId).revision
    return { acknowledged, rejected, changes: changesSince(db, auth.syncId, body.cursor), cursor }
  })
}

// Operation IDs only need remembering for as long as a device could still
// retry them; the data itself is idempotent regardless (joins + unique
// session/event IDs), so pruning old IDs never risks duplication.
export function pruneOperations(db, olderThanDays = 90) {
  const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString()
  return db.prepare('DELETE FROM operations WHERE received_at < ?').run(cutoff).changes
}
