// Brain Sync API entry point. Zero dependencies: node:http + node:sqlite.
//
//   node server/index.js
//
// Configuration (environment):
//   BRAIN_SYNC_PORT             default 8787
//   BRAIN_SYNC_HOST             default 127.0.0.1 (only the reverse proxy should reach it)
//   BRAIN_SYNC_DB               default ./brain-sync.sqlite
//   BRAIN_SYNC_ALLOWED_ORIGINS  comma-separated, e.g. https://brain.ebal.gr
//   BRAIN_SYNC_TRUST_PROXY      1 to honour X-Forwarded-Proto/-For (set behind nginx)
//   BRAIN_SYNC_REQUIRE_HTTPS    default 1; 0 only for local development
//   BRAIN_SYNC_OPS_RETENTION_DAYS  default 90 — how long operation IDs are remembered

import { createServer } from 'node:http'
import { openDatabase } from './db.js'
import { createApp } from './app.js'
import { pruneOperations, prunePairingTokens } from './sync.js'

const env = process.env
const port = Number(env.BRAIN_SYNC_PORT ?? 8787)
const host = env.BRAIN_SYNC_HOST ?? '127.0.0.1'
const retentionDays = Number(env.BRAIN_SYNC_OPS_RETENTION_DAYS ?? 90)

const db = openDatabase(env.BRAIN_SYNC_DB ?? './brain-sync.sqlite')
const app = createApp(db, {
  allowedOrigins: (env.BRAIN_SYNC_ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  trustProxy: env.BRAIN_SYNC_TRUST_PROXY === '1',
  requireHttps: env.BRAIN_SYNC_REQUIRE_HTTPS !== '0',
})

const prune = () => {
  const removed = pruneOperations(db, retentionDays)
  if (removed) console.log(`pruned ${removed} expired operation ids`)
  prunePairingTokens(db)
}
prune()
setInterval(prune, 60 * 60 * 1000).unref()

const server = createServer(app)
server.listen(port, host, () => console.log(`brain-sync listening on ${host}:${port}`))

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => { db.close(); process.exit(0) }))
}
