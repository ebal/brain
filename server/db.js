// SQLite datastore for Brain Sync (BRAIN-SYNC-SPEC §36). Uses Node's
// built-in node:sqlite — no dependency, one file on disk, synchronous
// access (so every request runs as one serialized transaction; see
// sync.js). Server schema migrations are sequential and append-only, like
// the client's (§18): never edit a released step, add the next one.

import { DatabaseSync } from 'node:sqlite'

export const MIGRATIONS = [
  // 1 — anonymous identities, devices + credentials, idempotency log,
  // durable records, sessions, learning events, per-identity revisions.
  `
  CREATE TABLE identities (
    sync_id       TEXT PRIMARY KEY,
    display_name  TEXT,
    revision      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
  );
  CREATE TABLE devices (
    sync_id          TEXT NOT NULL REFERENCES identities(sync_id) ON DELETE CASCADE,
    device_id        TEXT NOT NULL,
    label            TEXT,
    credential_hash  TEXT UNIQUE,           -- SHA-256 of the bearer credential; NULL once revoked
    created_at       TEXT NOT NULL,
    last_seen_at     TEXT,
    revoked_at       TEXT,
    PRIMARY KEY (sync_id, device_id)
  );
  CREATE TABLE operations (
    sync_id       TEXT NOT NULL REFERENCES identities(sync_id) ON DELETE CASCADE,
    operation_id  TEXT NOT NULL,
    device_id     TEXT NOT NULL,
    received_at   TEXT NOT NULL,
    PRIMARY KEY (sync_id, operation_id)
  );
  CREATE INDEX operations_received ON operations(received_at);
  CREATE TABLE records (
    sync_id      TEXT NOT NULL REFERENCES identities(sync_id) ON DELETE CASCADE,
    storage_key  TEXT NOT NULL,
    value        TEXT NOT NULL,
    revision     INTEGER NOT NULL,
    updated_at   TEXT NOT NULL,
    PRIMARY KEY (sync_id, storage_key)
  );
  CREATE INDEX records_revision ON records(sync_id, revision);
  CREATE TABLE sessions (
    sync_id      TEXT NOT NULL REFERENCES identities(sync_id) ON DELETE CASCADE,
    session_id   TEXT NOT NULL,
    storage_key  TEXT NOT NULL,
    entry        TEXT NOT NULL,
    device_id    TEXT NOT NULL,
    revision     INTEGER NOT NULL,
    received_at  TEXT NOT NULL,
    PRIMARY KEY (sync_id, session_id)
  );
  CREATE INDEX sessions_revision ON sessions(sync_id, revision);
  CREATE TABLE learning_events (
    sync_id      TEXT NOT NULL REFERENCES identities(sync_id) ON DELETE CASCADE,
    event_id     TEXT NOT NULL,
    payload      TEXT NOT NULL,
    device_id    TEXT NOT NULL,
    received_at  TEXT NOT NULL,
    PRIMARY KEY (sync_id, event_id)
  );
  `,
  // 2 — pairing tokens (short-lived, single-use; hash only) and the
  // recovery-code hash (rotatable; plaintext never stored) (§11, §12).
  `
  CREATE TABLE pairing_tokens (
    token_hash   TEXT PRIMARY KEY,
    sync_id      TEXT NOT NULL REFERENCES identities(sync_id) ON DELETE CASCADE,
    created_by   TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    expires_at   TEXT NOT NULL,
    used_at      TEXT
  );
  CREATE INDEX pairing_tokens_identity ON pairing_tokens(sync_id);
  ALTER TABLE identities ADD COLUMN recovery_hash TEXT;
  ALTER TABLE identities ADD COLUMN recovery_rotated_at TEXT;
  CREATE UNIQUE INDEX identities_recovery_hash ON identities(recovery_hash) WHERE recovery_hash IS NOT NULL;
  `,
]

export function openDatabase(path = ':memory:') {
  const db = new DatabaseSync(path)
  db.exec('PRAGMA foreign_keys = ON')
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL')
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)')
  const current = db.prepare('SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations').get().v
  MIGRATIONS.forEach((sql, index) => {
    const version = index + 1
    if (version <= current) return
    transaction(db, () => {
      db.exec(sql)
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(version, new Date().toISOString())
    })
  })
  return db
}

export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export const SERVER_SCHEMA_VERSION = MIGRATIONS.length
