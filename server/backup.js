// Consistent online backup of the Brain Sync database.
//
//   node server/backup.js                 # BRAIN_SYNC_DB -> BRAIN_SYNC_BACKUP_DIR
//   npm run sync-backup
//
// Uses SQLite's `VACUUM INTO`, which writes a transactionally consistent,
// compacted copy while the server keeps running (WAL mode) — no need to
// stop it. Keeps the newest BRAIN_SYNC_BACKUP_KEEP files (default 14) and
// deletes older ones. Run it daily from cron or a systemd timer.
//
// Backups contain every identity's progress plus hashed credentials and
// recovery codes: store them with the same care as the database itself.

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PREFIX = 'brain-sync-'
const SUFFIX = '.sqlite'

export function backupDatabase(dbPath, backupDir, { keep = 14, now = new Date() } = {}) {
  if (!existsSync(dbPath)) throw new Error(`database not found: ${dbPath}`)
  mkdirSync(backupDir, { recursive: true })
  const stamp = now.toISOString().replace(/[:.]/g, '-')
  const target = join(backupDir, `${PREFIX}${stamp}${SUFFIX}`)
  const db = new DatabaseSync(dbPath)
  try {
    db.prepare('VACUUM INTO ?').run(target)
  } finally {
    db.close()
  }
  const all = readdirSync(backupDir).filter((f) => f.startsWith(PREFIX) && f.endsWith(SUFFIX)).sort()
  const removed = all.slice(0, Math.max(0, all.length - keep))
  for (const file of removed) rmSync(join(backupDir, file))
  return { target, removed }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = process.env
  const { target, removed } = backupDatabase(
    env.BRAIN_SYNC_DB ?? './brain-sync.sqlite',
    env.BRAIN_SYNC_BACKUP_DIR ?? './backups',
    { keep: Number(env.BRAIN_SYNC_BACKUP_KEEP ?? 14) },
  )
  console.log(`backup written: ${target}${removed.length ? ` (removed ${removed.length} old)` : ''}`)
}
