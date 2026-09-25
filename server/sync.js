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
import { LEVEL_GAMES, completionScopeOf } from '../src/composables/sync/mergeRules.js'
import { isGameKey, isHistoryKey, isDeviceLocalKey } from '../src/constants/storageKeys.js'
import { stableStringify } from '../src/composables/persistence/ids.js'
import { CURRENT_SCHEMA_VERSION } from '../src/composables/persistence/migrations.js'
import { generateRecoveryCode, normalizeRecoveryCode, isValidRecoveryCode } from '../src/composables/sync/recoveryCode.js'
import { withinLimits } from '../src/composables/sync/payloadLimits.js'
import { updateCountryLearning } from '../src/composables/flags/learning.js'

export const LIMITS = {
  maxOperations: 5000,
  maxLabelLength: 64,
  pairingTtlMs: 5 * 60 * 1000, // §11: short-lived
  maxOpenPairingTokens: 5, // per identity; the oldest is dropped beyond this
  // Per-identity storage quotas — orders of magnitude above real use (a
  // heavy player writes a few thousand sessions a year), there so one
  // credential can't fill the disk. Ops beyond a quota are rejected, not
  // merged; nothing already stored is touched.
  maxSessionsPerIdentity: 250000,
  maxRecordsPerIdentity: 5000,
  maxLearningEventsPerIdentity: 2000000,
  maxRecordBytes: 256 * 1024,
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
  const id = deviceId.toLowerCase()
  const at = now()
  // Every identity starts with a recovery code (§12), returned only here.
  const recovery = transaction(db, () => {
    db.prepare('INSERT INTO identities (sync_id, display_name, created_at) VALUES (?, ?, ?)').run(syncId, cleanLabel(displayName), at)
    db.prepare('INSERT INTO devices (sync_id, device_id, label, credential_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(syncId, id, cleanLabel(deviceLabel), hashCredential(credential), at, at)
    return rotateRecoveryCode(db, { syncId, deviceId: id })
  })
  return { syncId, deviceId: id, credential, recoveryCode: recovery.recoveryCode }
}

// Adds an installation to an existing identity and issues its credential.
// Not reachable over HTTP on its own: claiming a pairing token and
// recovering with the recovery code are the only callers (§10-§12), and
// both are proof of full authority over the identity. Re-registering a
// known device ID (a revoked or disconnected installation, or one that
// lost its local credential) replaces that device's credential; the old one
// stops working immediately.
export function registerDevice(db, syncId, { deviceId, label } = {}) {
  if (typeof deviceId !== 'string' || !UUID.test(deviceId)) throw new ApiError(400, 'invalid_device_id')
  deviceId = deviceId.toLowerCase()
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

// ---- pairing (§10, §11) ---------------------------------------------------
//
// A trusted device asks for a short-lived, single-use token and shows it as
// a QR code; the new device claims it. Only the token's SHA-256 is stored.

function newPairingToken() {
  return `bpt_${randomBytes(32).toString('base64url')}`
}

export function createPairingToken(db, auth, { at = Date.now() } = {}) {
  const token = newPairingToken()
  const expiresAt = new Date(at + LIMITS.pairingTtlMs).toISOString()
  transaction(db, () => {
    db.prepare('INSERT INTO pairing_tokens (token_hash, sync_id, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
      .run(hashCredential(token), auth.syncId, auth.deviceId, new Date(at).toISOString(), expiresAt)
    db.prepare(`DELETE FROM pairing_tokens WHERE sync_id = ? AND token_hash NOT IN (
                  SELECT token_hash FROM pairing_tokens WHERE sync_id = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT ?)`)
      .run(auth.syncId, auth.syncId, LIMITS.maxOpenPairingTokens)
  })
  return { token, expiresAt }
}

// Cancels every outstanding token for this identity (e.g. the QR screen was
// closed, or a code was shown somewhere it shouldn't have been).
export function cancelPairingTokens(db, auth) {
  const cancelled = db.prepare('DELETE FROM pairing_tokens WHERE sync_id = ? AND used_at IS NULL').run(auth.syncId).changes
  return { cancelled }
}

export function claimPairingToken(db, { token, deviceId, deviceLabel } = {}, { at = Date.now() } = {}) {
  if (typeof token !== 'string' || !token.startsWith('bpt_') || token.length > 128) throw new ApiError(401, 'invalid_pairing_token')
  if (typeof deviceId !== 'string' || !UUID.test(deviceId)) throw new ApiError(400, 'invalid_device_id')
  return transaction(db, () => {
    const row = db.prepare('SELECT sync_id AS syncId, created_by AS createdBy, expires_at AS expiresAt, used_at AS usedAt FROM pairing_tokens WHERE token_hash = ?')
      .get(hashCredential(token))
    // Unknown, expired and already-used tokens are indistinguishable (§53).
    if (!row || row.usedAt || Date.parse(row.expiresAt) <= at) throw new ApiError(401, 'invalid_pairing_token')
    if (row.createdBy === deviceId.toLowerCase()) throw new ApiError(409, 'cannot_pair_with_self')
    db.prepare('UPDATE pairing_tokens SET used_at = ? WHERE token_hash = ?').run(new Date(at).toISOString(), hashCredential(token))
    const device = registerDevice(db, row.syncId, { deviceId: deviceId.toLowerCase(), label: deviceLabel })
    return { ...device, displayName: identityDisplayName(db, row.syncId) }
  })
}

export function prunePairingTokens(db, { at = Date.now() } = {}) {
  const cutoff = new Date(at - 24 * 60 * 60 * 1000).toISOString()
  return db.prepare('DELETE FROM pairing_tokens WHERE expires_at < ? OR used_at < ?').run(new Date(at).toISOString(), cutoff).changes
}

function identityDisplayName(db, syncId) {
  return db.prepare('SELECT display_name AS displayName FROM identities WHERE sync_id = ?').get(syncId)?.displayName ?? null
}

// ---- recovery code (§12) --------------------------------------------------
//
// Generated here from the CSPRNG, returned exactly once, stored only as a
// SHA-256 of its canonical form (135 bits of entropy make a slow hash
// pointless and allow an indexed lookup — recovery can't know the Sync ID
// in advance). Rotating replaces the hash, so the old code stops working
// at once; paired devices are unaffected.

export function rotateRecoveryCode(db, auth) {
  const code = generateRecoveryCode((n) => randomBytes(n))
  const rotatedAt = now()
  db.prepare('UPDATE identities SET recovery_hash = ?, recovery_rotated_at = ? WHERE sync_id = ?')
    .run(hashCredential(normalizeRecoveryCode(code)), rotatedAt, auth.syncId)
  return { recoveryCode: code, rotatedAt }
}

export function recoveryStatus(db, auth) {
  const row = db.prepare('SELECT recovery_hash IS NOT NULL AS configured, recovery_rotated_at AS rotatedAt FROM identities WHERE sync_id = ?').get(auth.syncId)
  return { configured: row.configured === 1, rotatedAt: row.rotatedAt }
}

export function recoverWithCode(db, { recoveryCode, deviceId, deviceLabel } = {}) {
  if (!isValidRecoveryCode(recoveryCode)) throw new ApiError(401, 'invalid_recovery_code')
  if (typeof deviceId !== 'string' || !UUID.test(deviceId)) throw new ApiError(400, 'invalid_device_id')
  return transaction(db, () => {
    const row = db.prepare('SELECT sync_id AS syncId FROM identities WHERE recovery_hash = ?').get(hashCredential(normalizeRecoveryCode(recoveryCode)))
    if (!row) throw new ApiError(401, 'invalid_recovery_code')
    const device = registerDevice(db, row.syncId, { deviceId: deviceId.toLowerCase(), label: deviceLabel })
    return { ...device, displayName: identityDisplayName(db, row.syncId) }
  })
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

function upsertSession(db, auth, key, entry, touched, quota) {
  if (!isHistoryKey(key) || !isPlainObject(entry) || typeof entry.sessionId !== 'string' || entry.sessionId.length > 64) return false
  if (!withinLimits(entry) || JSON.stringify(entry).length > 16 * 1024) return false
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
  if (quota && !quota.take('sessions')) return false
  db.prepare('INSERT INTO sessions (sync_id, session_id, storage_key, entry, device_id, revision, received_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(auth.syncId, entry.sessionId, key, JSON.stringify(entry), auth.deviceId, nextRevision(db, auth.syncId), now())
  touched.add(key)
  return true
}

function upsertRecord(db, auth, key, value, touched, quota) {
  const row = db.prepare('SELECT value FROM records WHERE sync_id = ? AND storage_key = ?').get(auth.syncId, key)
  if (!row && quota && !quota.take('records')) return false
  const current = row ? JSON.parse(row.value) : undefined
  const merged = mergeKey(key, current, value)
  if (merged === undefined) return false // structurally invalid and nothing valid stored (§45)
  if (current !== undefined && stableStringify(merged) === stableStringify(current)) return true
  if (JSON.stringify(merged).length > LIMITS.maxRecordBytes) return false
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
function applyOperation(db, auth, op, touched, quota) {
  const payload = op.payload
  if (!withinLimits(payload)) return false // §45/§53: too deep, too large, or prototype-changing keys
  if (op.entityType === 'learningEvent') {
    if (!isPlainObject(payload) || payload.learningEventId !== op.entityId) return false
    if (typeof payload.countryCode !== 'string' || payload.countryCode.length > 8 || typeof payload.correct !== 'boolean') return false
    if (!db.prepare('SELECT 1 FROM learning_events WHERE sync_id = ? AND event_id = ?').get(auth.syncId, op.entityId) && !quota.take('learningEvents')) return false
    touched.add(`learning:${payload.countryCode}`)
    db.prepare('INSERT OR IGNORE INTO learning_events (sync_id, event_id, payload, device_id, received_at) VALUES (?, ?, ?, ?, ?)')
      .run(auth.syncId, op.entityId, JSON.stringify(payload), auth.deviceId, now())
    return true
  }
  if (op.entityType === 'session') {
    if (!isPlainObject(payload) || !syncable(payload.key) || payload.entry?.sessionId !== op.entityId) return false
    return upsertSession(db, auth, payload.key, payload.entry, touched, quota)
  }
  // record
  if (!syncable(op.entityId)) return false
  if (isHistoryKey(op.entityId)) {
    // A whole history list (bootstrap/full resync): stored as sessions.
    if (!Array.isArray(payload)) return false
    let ok = true
    for (const entry of payload) ok = upsertSession(db, auth, op.entityId, entry, touched, quota) && ok
    return ok
  }
  return upsertRecord(db, auth, op.entityId, payload, touched, quota)
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

// §27: exact completion counts from the full, uncapped session history.
// Each device's own `completed` counter only knows its own games (and the
// merge can only take the MAX of them); the server has every session, so
// for every history list this request touched it recounts completions per
// stats record and joins the count in. `started` is lifted to at least
// `completed` so a completion rate can't exceed 100%. Only raises values —
// a count can never go down through this.
function rederiveCompletionCounts(db, auth, touched, quota) {
  const counts = new Map()
  for (const key of [...touched].filter(isHistoryKey)) {
    for (const row of db.prepare('SELECT entry FROM sessions WHERE sync_id = ? AND storage_key = ?').all(auth.syncId, key)) {
      const statsKey = completionScopeOf(key, JSON.parse(row.entry))
      if (statsKey) counts.set(statsKey, (counts.get(statsKey) ?? 0) + 1)
    }
  }
  for (const [statsKey, completed] of counts) {
    const row = db.prepare('SELECT value FROM records WHERE sync_id = ? AND storage_key = ?').get(auth.syncId, statsKey)
    if (!row) continue // never invent a stats record a device hasn't written
    const stats = JSON.parse(row.value)
    if ((stats.completed ?? 0) >= completed && (stats.started ?? 0) >= completed) continue
    upsertRecord(db, auth, statsKey, { completed, started: completed }, touched, quota)
  }
}

// §20: Flags mastery recomputed from the merged per-answer events of every
// device, replaying them through the game's own updateCountryLearning in
// answer order (answeredAt, then event ID — client clocks only order the
// replay, they never decide what counts as better, §47). The result joins
// the learning record like any device's copy: per country, the record
// built from more attempts wins, so a device's pre-sync history is kept
// until the shared event log has seen more answers than that device did.
function rederiveLearning(db, auth, touched, quota) {
  const countries = [...touched].filter((k) => k.startsWith('learning:')).map((k) => k.slice('learning:'.length))
  if (countries.length === 0) return
  const derived = {}
  for (const code of countries) {
    const events = db.prepare("SELECT event_id AS id, payload FROM learning_events WHERE sync_id = ? AND json_extract(payload, '$.countryCode') = ?")
      .all(auth.syncId, code)
      .map((row) => ({ id: row.id, ...JSON.parse(row.payload) }))
      .sort((a, b) => (a.answeredAt ?? 0) - (b.answeredAt ?? 0) || a.id.localeCompare(b.id))
    let state
    for (const e of events) state = updateCountryLearning(state, { correct: e.correct, wrongCode: e.wrongCode ?? undefined, timestamp: e.answeredAt })
    if (state) derived[code] = state
  }
  if (Object.keys(derived).length > 0) upsertRecord(db, auth, 'flagsoftheworld:learning', derived, touched, quota)
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

// Remaining quota for this request, counted once up front.
function quotaFor(db, syncId) {
  const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE sync_id = ?`).get(syncId).n
  const left = {
    sessions: LIMITS.maxSessionsPerIdentity - count('sessions'),
    records: LIMITS.maxRecordsPerIdentity - count('records'),
    learningEvents: LIMITS.maxLearningEventsPerIdentity - count('learning_events'),
  }
  return {
    take(kind) {
      if (left[kind] <= 0) return false
      left[kind] -= 1
      return true
    },
  }
}

export function sync(db, auth, body) {
  validateRequest(body)
  return transaction(db, () => {
    // A cursor ahead of this identity's revision means the server has lost
    // data the device already synced (e.g. restored from an older backup).
    // Ask the device to re-upload everything it holds, and send it the
    // full current state rather than "changes since" a revision that no
    // longer exists. Devices never lose progress through a restore.
    const revisionBefore = db.prepare('SELECT revision FROM identities WHERE sync_id = ?').get(auth.syncId).revision
    const resync = Number.isInteger(body.cursor) && body.cursor > revisionBefore
    const quota = quotaFor(db, auth.syncId)
    const touched = new Set()
    const acknowledged = []
    const rejected = []
    const seen = db.prepare('SELECT 1 FROM operations WHERE sync_id = ? AND operation_id = ?')
    const remember = db.prepare('INSERT INTO operations (sync_id, operation_id, device_id, received_at) VALUES (?, ?, ?, ?)')
    for (const op of body.operations) {
      if (!seen.get(auth.syncId, op.operationId)) {
        // §28: an operation is applied at most once per identity; a retry
        // (lost response, second tab) is acknowledged without re-applying.
        if (!applyOperation(db, auth, op, touched, quota)) rejected.push(op.operationId)
        remember.run(auth.syncId, op.operationId, auth.deviceId, now())
      }
      acknowledged.push(op.operationId)
    }
    rederiveCompletionCounts(db, auth, touched, quota)
    rederiveLearning(db, auth, touched, quota)
    rederiveProgress(db, auth, touched)
    const cursor = db.prepare('SELECT revision FROM identities WHERE sync_id = ?').get(auth.syncId).revision
    const response = { acknowledged, rejected, changes: changesSince(db, auth.syncId, resync ? null : body.cursor), cursor }
    if (resync) response.resync = true
    return response
  })
}

// Operation IDs only need remembering for as long as a device could still
// retry them; the data itself is idempotent regardless (joins + unique
// session/event IDs), so pruning old IDs never risks duplication.
export function pruneOperations(db, olderThanDays = 90) {
  const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString()
  return db.prepare('DELETE FROM operations WHERE received_at < ?').run(cutoff).changes
}
