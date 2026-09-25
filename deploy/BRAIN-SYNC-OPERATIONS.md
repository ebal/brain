# Brain Sync — Operations Runbook

For whoever runs the optional Brain Sync server (`server/`). Brain works fully without it. Nothing
in this repository deploys anything: the files in `deploy/` are examples to adapt.

## 1. Before the first deployment

- [ ] Node.js ≥ 22.13 on the host (for built-in `node:sqlite`). No `npm install` is needed for the
      server: it has no dependencies.
- [ ] A dedicated host name for the API, such as `sync.example.org`, with TLS.
- [ ] Reverse proxy per `deploy/nginx.conf.example`:
  - TLS terminated at the proxy;
  - `X-Forwarded-Proto` and `X-Forwarded-For` set;
  - `client_max_body_size 8m`;
  - no logging of the `Authorization` header or request bodies (the default nginx access-log
    format logs neither).
- [ ] Service per `deploy/brain-sync.service.example`, with these settings:
  - `BRAIN_SYNC_TRUST_PROXY=1`
  - `BRAIN_SYNC_ALLOWED_ORIGINS=https://<your app origin>`: the exact app origin, not the API's
    own host name.
  - `BRAIN_SYNC_REQUIRE_HTTPS` left at its default (on).
  - `BRAIN_SYNC_DB` pointing at persistent storage.
- [ ] Daily backups (§4) scheduled **before** real users arrive.
- [ ] The app built with `VITE_BRAIN_SYNC_URL=https://sync.example.org`. A build without it has no
      sync UI at all, which is the safe default.
- [ ] Smoke test: `curl https://sync.example.org/v1/health` returns `{"ok":true,…}`, and one full
      enable → pair → sync round trip works in a browser.
- [ ] The manual acceptance tests in `specs/BRAIN-SYNC-ACCEPTANCE.md` are done on real devices.

Recommended for the **app** origin (not required by sync):

- `Permissions-Policy: camera=(self)`, since the in-app QR scanner is the only camera user.
- A Content-Security-Policy. The device credential is kept in `localStorage`, so the app should
  never load third-party scripts. It doesn't today. Start with `Content-Security-Policy-Report-Only`,
  for example `default-src 'self'; connect-src 'self' https://sync.example.org;
  img-src 'self' data:; style-src 'self' 'unsafe-inline'`. Enforce it only after checking the
  browser console for violations.

## 2. Configuration reference

| Variable | Default | Notes |
|---|---|---|
| `BRAIN_SYNC_HOST` / `BRAIN_SYNC_PORT` | `127.0.0.1` / `8787` | keep it on loopback behind the proxy |
| `BRAIN_SYNC_DB` | `./brain-sync.sqlite` | SQLite in WAL mode; also `-wal`/`-shm` files next to it |
| `BRAIN_SYNC_ALLOWED_ORIGINS` | none | comma-separated app origins allowed by CORS |
| `BRAIN_SYNC_TRUST_PROXY` | off | `1` behind a proxy; otherwise forwarded headers are ignored |
| `BRAIN_SYNC_REQUIRE_HTTPS` | on | `0` only for local development |
| `BRAIN_SYNC_OPS_RETENTION_DAYS` | `90` | how long operation IDs are remembered for idempotency |
| `BRAIN_SYNC_BACKUP_DIR` / `BRAIN_SYNC_BACKUP_KEEP` | `./backups` / `14` | for `server/backup.js` |

The limits built into the server (`server/sync.js` `LIMITS`, `server/app.js` rate limits):

| Limit | Value |
|---|---|
| Request body | 8 MB |
| Operations per request | 5,000 |
| Payload structure | nesting depth 32, 250k nodes, prototype-changing keys rejected |
| Sessions per identity | 250,000 |
| Records per identity | 5,000 |
| Learning events per identity | 2,000,000 |
| Size of one record | 256 KB |
| Rate limits (in memory) | identity creation 20/h per IP; authentication failures 30 per 10 min per IP; failed pairing claims 20 per 10 min per IP; failed recoveries 10/h per IP; sync 120/min per identity |
| HTTP timeouts | headers 15 s, request 60 s |

## 3. Upgrades

- **Server:** stop it, **take a backup (§4)**, update the code, start it. Server schema migrations
  (`server/db.js`) run automatically on start, in order, each in its own transaction. They are
  append-only and never edited once released. A test upgrades a Phase 4 database with every row
  and credential intact.
- **App:** the service worker uses `registerType: 'prompt'`. Open tabs keep the build they loaded
  until the player accepts "Reload to update". Local data migrates in place on first launch of
  the new build and is never cleared. `npm run test:e2e-release` checks this upgrade from the last
  pre-sync release, including data played on it.
- A **newer app with an older server** gets `409 schema_version_mismatch` on sync. Play and local
  saving are unaffected, and changes wait in the queue. Upgrade the server first when a release
  bumps the storage schema.

## 4. Backups and restore

```bash
npm run sync-backup          # or: node server/backup.js
```

- **Method:** SQLite `VACUUM INTO` takes a consistent, compacted copy while the server keeps
  running.
- **Retention:** keeps the newest `BRAIN_SYNC_BACKUP_KEEP`.
- **Schedule:** daily, using the systemd timer in `deploy/brain-sync.service.example` or cron.
- **Off-host copies:** a backup on the same disk isn't a backup.
- **Sensitivity:** backups hold all progress plus hashed credentials and recovery codes. Protect
  them like the database.

**Restore:** stop the service, then replace `BRAIN_SYNC_DB` with the backup file. Remove any
leftover `-wal`/`-shm` files belonging to the old database, then start the service.

Devices that synced after the backup was taken still hold that progress locally. On their next sync
the server notices that their cursor is ahead of its restored revision. It sends them the full
state and asks them to re-upload everything they hold, which they do automatically. Every merge is
a union or a better-of, so a restore can't make any device lose progress. Tests cover this.
Devices paired after the backup was taken need pairing again, since their credential isn't in the
backup.

**Restore drill:** do one before launch, then quarterly. Restore into a scratch location, start a
second instance on another port, and check `/v1/health` and one test identity.

## 5. Logs and privacy (spec §37–§39)

- **What the server logs:** one line per request (`METHOD /route/template STATUS ms`), plus
  start-up and pruning lines. It never logs IPs, headers, bodies, Sync IDs, device IDs,
  credentials, pairing tokens or recovery codes. Tests enforce this.
- **Retention:** logs go to stdout. Keep them short, e.g. journald `MaxRetentionSec=14d` or Docker
  `--log-opt max-size=10m --log-opt max-file=3`.
- **Data held per identity:**
  - an optional display name and device labels;
  - device IDs (random, per installation);
  - hashes of credentials and the recovery code;
  - game sessions, stats, bests, level progress;
  - Flags learning events.

  There is no email, name, IP or other identifier.
- **Operation-ID log:** pruned after `BRAIN_SYNC_OPS_RETENTION_DAYS`. Expired pairing tokens are
  pruned hourly.
- **A deletion request:** the player uses **Delete Cloud Data** in the app, which removes every
  row for their identity. If they can't, they tell you a device name or roughly when they joined,
  and the Sync ID shown under Brain Sync → Advanced identifies the identity. Removing
  cloud data never touches what's on their devices.

## 6. Threat model and incidents

- **A device credential is full account authority.** It can sync, add devices, rotate the recovery
  code and delete the cloud data. That's inherent to a no-password design. Credentials are
  256-bit, revocable, stored hashed on the server, and never put in URLs, logs or exports.
- **Lost or stolen device:** from any other device, Brain Sync → Devices → Remove. Its credential
  stops working immediately, and the other devices keep theirs. Then create a new recovery code:
  whoever held the lost device could have used its credential to create their own code first.
  Rotating makes sure the only valid code is yours.
- **Leaked recovery code:** create a new one from any device. The old one stops working at once.
- **Lost every device and the recovery code:** the cloud copy can't be reached. This is by design
  (§12), and the UI states it when the code is shown.
- **Suspected abuse:** watch for 429s in the access log. Per-identity quotas stop a single
  credential filling the disk. To remove an identity administratively, back up first, then:
  `DELETE FROM identities WHERE sync_id = ?` (the delete cascades to all its rows).

## 7. Monitoring

- `GET /v1/health` → `200 {"ok":true,"schemaVersion":…,"serverSchemaVersion":…}`, reachable
  without HTTPS for local probes.
- Alert on repeated 5xx in the access log, on the process restarting, on free disk space, and on
  the backup timer failing.
- Players are never blocked by an outage (§43). The app shows "Sync unavailable · Progress is safe
  on this device" and catches up automatically. An outage is an inconvenience, not data loss.
