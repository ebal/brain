// Versioned, sequential, non-destructive storage migrations
// (BRAIN-SYNC-SPEC §15-§18, §33, §54). See specs/BRAIN-SYNC-AUDIT.md.
//
// schemaVersion describes the SHAPE of Brain's stored user data as a whole.
// It's independent of appVersion (package.json), each game's metricVersion
// (how a score is defined), level definitions and Flags' DATASET_VERSION —
// none of those bump it, and it bumps none of them.
//
//   v1 — everything Brain <= 1.1.1 wrote. No brain:meta key exists at all.
//   v2 — every history entry carries a globally unique `sessionId`; entries
//        written from v2 on also carry the writing installation's `deviceId`.
//
// A migration is a pure function (data snapshot in, new snapshot out) keyed
// by the version it produces. The snapshot is `{ [localStorageKey]: parsed
// JSON value }` for game keys only — the same shape as an export file's
// `data`, so imports of old backups run through exactly the same code.
//
// Adding v3: write `3: (data) => ...` below, bump CURRENT_SCHEMA_VERSION,
// commit tests/fixtures/storage/schema-v2.json's successor as schema-v3.json
// (see persistence/migrations.test.js), and never edit an already-released
// step — old data in the wild still has to pass through it unchanged.

import { META_KEY, MIGRATION_BACKUP_KEY, isGameKey, isHistoryKey } from '../../constants/storageKeys.js'
import { contentUUID, stableStringify } from './ids.js'

export const CURRENT_SCHEMA_VERSION = 2

// v1 -> v2: give every legacy history entry a deterministic sessionId
// derived from (storage key, entry content, occurrence index). Deterministic
// rather than random so the same legacy session held by two installations
// (e.g. one restored from the other's export) gets the same ID on both and
// merges as one record instead of two. The occurrence index keeps genuine
// exact duplicates within one list distinct — nothing is deduplicated or
// dropped here. Entries that already have a sessionId are left untouched,
// which makes the step idempotent.
function assignLegacySessionIds(key, entries) {
  const seen = new Map()
  return entries.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || typeof entry.sessionId === 'string') return entry
    const content = `${key}\n${stableStringify(entry)}`
    const occurrence = seen.get(content) ?? 0
    seen.set(content, occurrence + 1)
    return { ...entry, sessionId: contentUUID(`${content}\n${occurrence}`) }
  })
}

const MIGRATIONS = {
  2: (data) => {
    const out = {}
    for (const [key, value] of Object.entries(data)) {
      out[key] = isHistoryKey(key) && Array.isArray(value) ? assignLegacySessionIds(key, value) : value
    }
    return out
  },
}

// Pure: runs every step from `fromVersion` up to CURRENT_SCHEMA_VERSION.
// Throws on a version this code doesn't know how to read.
export function migrateData(data, fromVersion) {
  if (!Number.isInteger(fromVersion) || fromVersion < 1) throw new Error(`Unknown schema version: ${fromVersion}`)
  if (fromVersion > CURRENT_SCHEMA_VERSION) throw new Error(`Schema version ${fromVersion} is newer than this app supports (${CURRENT_SCHEMA_VERSION})`)
  let current = data
  for (let v = fromVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    current = MIGRATIONS[v](current)
  }
  return current
}

// The "no meaningful loss" invariant every migration must satisfy (§18, §54):
// every key survives; arrays never shrink; every original field of every
// object (including each array element) survives with the same value.
// Migrations may only ADD. Throws describing the first violation.
export function assertNoLoss(before, after) {
  for (const key of Object.keys(before)) {
    if (!(key in after)) throw new Error(`migration dropped key ${key}`)
    assertValuePreserved(before[key], after[key], key)
  }
}

function assertValuePreserved(a, b, path) {
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || b.length < a.length) throw new Error(`migration shrank ${path}`)
    a.forEach((item, i) => assertValuePreserved(item, b[i], `${path}[${i}]`))
    return
  }
  if (a && typeof a === 'object') {
    if (!b || typeof b !== 'object') throw new Error(`migration replaced object at ${path}`)
    for (const field of Object.keys(a)) {
      if (stableStringify(a[field]) !== stableStringify(b[field])) throw new Error(`migration changed ${path}.${field}`)
    }
    return
  }
  if (stableStringify(a) !== stableStringify(b)) throw new Error(`migration changed ${path}`)
}

export function readSchemaVersion(storage = globalThis.localStorage) {
  const meta = JSON.parse(storage.getItem(META_KEY) || 'null')
  // No meta key at all == every install from before schema versioning.
  return Number.isInteger(meta?.schemaVersion) ? meta.schemaVersion : 1
}

function ownKeys(storage) {
  return Object.keys(storage).filter(isGameKey)
}

// Restores an interrupted migration's pre-image. Safe because migrations
// run synchronously before the app mounts (main.js) — nothing can have
// written new progress between the interruption and this restore.
function restoreBackupIfPresent(storage) {
  const raw = storage.getItem(MIGRATION_BACKUP_KEY)
  if (!raw) return false
  const backup = JSON.parse(raw)
  for (const [key, original] of Object.entries(backup.raw || {})) {
    if (original === null) storage.removeItem(key)
    else storage.setItem(key, original)
  }
  storage.removeItem(MIGRATION_BACKUP_KEY)
  return true
}

// Upgrades this device's localStorage to CURRENT_SCHEMA_VERSION:
// read -> copy (backup of every key about to change) -> migrate (pure) ->
// validate (assertNoLoss + unique session IDs) -> commit -> bump
// schemaVersion -> drop backup. Any failure leaves the original data in
// place and returns a status instead of throwing — launch never depends on
// it, and every reader already tolerates un-migrated (v1) data. It never
// clears storage and never touches keys outside Brain's game prefixes.
export function runStorageMigrations({ storage = globalThis.localStorage, appVersion = null, now = () => new Date().toISOString() } = {}) {
  if (!storage) return { status: 'unavailable' }
  let backupWritten = false
  const written = {}
  try {
    const restored = restoreBackupIfPresent(storage)
    const fromVersion = readSchemaVersion(storage)
    // Data from a NEWER build (e.g. a rollback, or a stale cached build).
    // Never downgrade — leave it exactly as it is.
    if (fromVersion > CURRENT_SCHEMA_VERSION) return { status: 'newer', fromVersion, restored }
    if (fromVersion === CURRENT_SCHEMA_VERSION) return { status: 'current', fromVersion, restored }

    const raw = {}
    const before = {}
    for (const key of ownKeys(storage)) {
      raw[key] = storage.getItem(key)
      try {
        before[key] = JSON.parse(raw[key])
      } catch {
        // Unparseable value — left exactly as it is, never "repaired" away.
      }
    }

    const after = migrateData(before, fromVersion)
    assertNoLoss(before, after)
    assertUniqueSessionIds(after)

    const changed = Object.keys(after).filter((k) => stableStringify(after[k]) !== stableStringify(before[k]))
    if (changed.length > 0) {
      const backupRaw = {}
      for (const key of changed) backupRaw[key] = key in raw ? raw[key] : null
      storage.setItem(MIGRATION_BACKUP_KEY, JSON.stringify({ fromVersion, toVersion: CURRENT_SCHEMA_VERSION, createdAt: now(), raw: backupRaw }))
      backupWritten = true
      for (const key of changed) {
        storage.setItem(key, JSON.stringify(after[key]))
        written[key] = key in raw ? raw[key] : null // only once actually overwritten
      }
    }
    storage.setItem(META_KEY, JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, appVersion, migratedAt: now() }))
    if (backupWritten) storage.removeItem(MIGRATION_BACKUP_KEY)
    return { status: 'migrated', fromVersion, toVersion: CURRENT_SCHEMA_VERSION, keysChanged: changed.length, restored }
  } catch (error) {
    // Roll back whatever was already committed this run (e.g. quota hit
    // halfway through), then drop the now-redundant backup.
    try {
      for (const [key, original] of Object.entries(written)) {
        if (original === null) storage.removeItem(key)
        else storage.setItem(key, original)
      }
      if (backupWritten) storage.removeItem(MIGRATION_BACKUP_KEY)
    } catch {
      // Backup (if written) is still in place; the next launch restores it.
    }
    console.warn('[storage] migration skipped, existing data left untouched:', error?.message ?? error)
    return { status: 'failed', error: String(error?.message ?? error) }
  }
}

export function assertUniqueSessionIds(data) {
  const seen = new Set()
  for (const [key, value] of Object.entries(data)) {
    if (!isHistoryKey(key) || !Array.isArray(value)) continue
    for (const entry of value) {
      const id = entry?.sessionId
      if (typeof id !== 'string') continue
      if (seen.has(id)) throw new Error(`duplicate sessionId ${id} in ${key}`)
      seen.add(id)
    }
  }
}
