# Brain Sync — Phase 0 Persistence Audit (and Phase 1–7 record)

Audit of Brain's local persistence as of **1.1.1** (`45a9015`), per
[`BRAIN-SYNC-SPEC.md`](./BRAIN-SYNC-SPEC.md) §55/§65. The last section records what Phase 1
(§56) through Phase 7 (§62) changed. §16 at the end gives the definition-of-done status.

## 1. Baseline

| Check | Result |
|---|---|
| `vitest run` | 60 files, 739 tests pass (see §8 for one pre-existing flaky test) |
| `vite build` | OK, 478 precache entries (~2.3 MiB) |
| Storage technology | `localStorage` only. No IndexedDB, sessionStorage, cookies or Cache API use for user data |
| Network use | None. No fetch/XHR anywhere in `src/` |

## 2. Storage inventory (schema v1)

Every value is JSON. Every writer wraps access in `try/catch` and **silently ignores write
failures** (quota, private mode). Keys are namespaced `<game>:` (the list is now in
`src/constants/storageKeys.js`).

### 2.1 Per-game keys

| Pattern | Games | Content | Sync relevance |
|---|---|---|---|
| `<g>:history…` | all 18 | array of completed-session records | **Durable sessions.** Needs IDs (done, Phase 1) |
| `<g>:stats:<diff\|level>[…]` | 15 (not Stroop/Schulte/N-Back) | `started`/`completed` counters, `best*` objects, capped `completions[]` samples, some streaks | Bests are MAX/MIN-mergeable. Counters and samples are **not** mergeable (see §4) |
| `<g>:best:…` | Stroop, Schulte, N-Back | single best-result object | MAX/MIN-mergeable, no provenance |
| `<g>:progress` | Hanoi, Lights Out, Emoji Mahjong, Whack-a-Mole, Flags | `highestUnlocked`, `completedLevels[]`, `totalStars`, cumulative totals | `completedLevels` is a set (union). `highestUnlocked`/`totalStars` are derivable. Totals are counters |
| `flagsoftheworld:learning` | Flags | per-country aggregate (attempts, streak, mastery, confusions) | **Order-dependent aggregate. Not mergeable** without events (§4.4) |
| `<g>:active` | Sudoku, SET, Sequence Memory, Memory Pairs, Marble Jump, Number Match, Emoji Mahjong, Hanoi, Lights Out, Flags | in-progress autosave | Device-local (spec §35) |
| `emojimahjong:tutorialSeen`, `targettap:last-target` | — | UI flags | Device-local |

Variant/mode segments inside keys: Stroop `:<mode>:<difficulty>`; Schulte, Switch Trail and Odd One
Out put a variant segment in the key except for `classic`, which keeps the pre-variant key shape.
Mental Rotation `untimed` gets its own segment. N-Back and Schulte difficulty *keys* differ from
their object property names (`'2L'`, `'very-hard'`).

### 2.2 History caps (silent loss by design)

| Cap | Keys |
|---|---|
| 20 per key | Stroop, Schulte, N-Back |
| 30 per key | every other `:history` key |
| 30 **shared across all difficulties** | `sudoku:history`, `set:history`, `sequence-memory:history`, `marblejump:history`, `numbermatch:history`, `mentalrotation:history` |
| 50 per key | `stats.completions[]` samples |

Once past the cap, the oldest sessions are dropped for good. Heavy play on one difficulty evicts
another difficulty's history from the shared keys.

### 2.3 Orphaned / retired-mode keys

Never read by any UI. Still exported (where under a game prefix), and deleted by Delete All Data:

- `emojimahjong:history`, `emojimahjong:stats:<easy…master>`: the difficulty-based Emoji Mahjong
  (replaced in `a978306`).
- `nback:history:1`, `nback:best:1`: the removed 1-back (`1f1e654`).
- `benchmark:*`: Benchmark Mode (`6373d5f`). Not exported, only deleted.

### 2.4 Export format

`{ schemaVersion: 1, exportedAt, appVersion, data: { key: value } }`. Before Phase 1 this was the
*export-file* version only. On-device data had no version at all.

## 3. Why releases can appear to lose progress

**No code path deletes or resets progress on upgrade.** There is no `localStorage.clear()`, no
version-triggered wipe, and the service worker (`registerType: 'prompt'`, Workbox precache) caches
only app assets. The likely causes, most probable first:

1. **Storage origin changes.** `localStorage` is per origin (scheme + host + port). Data played on
   `http://<lan-ip>:5173` (docker-compose dev server), `localhost`, a preview port, `www.` vs apex,
   or http vs https is invisible on `https://brain.ebal.gr`, and the other way round.
2. **iOS/iPadOS: Home Screen PWA ≠ Safari tab.** An installed web app has storage separate from
   Safari. Progress made in a Safari tab doesn't appear in the installed app, and deleting the Home
   Screen app deletes its data.
3. **Safari ITP 7-day cap.** For sites *not* added to the Home Screen, Safari deletes
   script-writable storage (localStorage included) after 7 days without user interaction.
   Infrequent Safari-tab play loses everything.
4. **Best-effort storage eviction.** The app never calls `navigator.storage.persist()`, so under
   storage pressure the browser may evict the origin (Chrome/Android, Safari).
5. **Retired modes look like loss.** The Emoji Mahjong difficulty→campaign replacement and the
   N-Back 1-back removal left old progress stored but never shown (§2.3).
6. **History caps** (§2.2), especially the shared 30-entry keys.
7. **Silent quota failures.** Once localStorage is full, *every* write fails silently, so new
   results are simply not saved.
8. **User actions:** Import → *Replace* wipes first; *Delete All Data*; browser "clear site data".

Causes 1–4 are outside the app's control and are the strongest argument for cloud sync/backup.
5–7 are addressable locally.

## 4. Records and their sync readiness

### 4.1 Records needing IDs

| Record | Status before Phase 1 | Action |
|---|---|---|
| History entries (all games) | no ID. `sessionModel.js` synthesizes `game:diff:timestamp`, and dedupe on import was by exact JSON | **Done:** `sessionId` + `deviceId` on new entries, deterministic IDs for legacy ones |
| Best records (`best`, `bestClean`, `best:*` keys…) | no provenance, `date` only | Phase 2: add `sessionId` of the achieving session + eligibility context (§24) |
| Flags learning attempts | not stored as events at all, only aggregated | Phase 2/3 (see §4.4) |
| `stats.completions[]` samples | anonymous, capped | Derive from sessions instead (Phase 2) |

Naming note: SET history already has a `gameId` field meaning *SET's per-deal id*. The canonical
session therefore never uses `gameId` for the game type. The game is derived from the storage key.

### 4.2 Mutable counters (spec §27)

`stats.started`, `stats.completed`, `cleanCompletions`, `progress.totalPlayTime`/`totalMoves`/
`totalHints`/`totalHits`…, and Sudoku/SET `currentStreak`/`bestStreak` are device-local
increments. Merging them by MAX loses increments, and SUM double-counts. Plan: derive `completed`,
totals and play time from unique sessions. Keep `started` (abandon rate) and `currentStreak`
(order-dependent) device-local and do not sync them.

### 4.3 Level progress

`completedLevels[]` is already a per-level set, and per-level `stats.best.stars` gives stars.
Both merge cleanly (union, MAX). `highestUnlocked` and `totalStars` must be **re-derived** after a
merge, never merged. The current campaign rule is "any completion unlocks next" in all five
level games, so `highestUnlocked = min(max(completed)+1, levelCount)`. No level records a
`levelVersion` yet. Emoji Mahjong's campaign already replaced one level scheme without
versioning. Add `levelVersion` alongside level progress in Phase 2.

### 4.4 Flags learning state

`flagsoftheworld:learning` stores `currentCorrectStreak`, `mastery`, `lastSeenAt`, all
order-dependent. Two devices' aggregates cannot be merged correctly. Spec §20 calls for
per-attempt `learningEventId`s with mastery recomputed from the merged event log. **Deferred on
purpose:** an append-only event log (~15 events per round, forever) in localStorage risks hitting
the quota, and that failure mode (§3.7) silently stops *all* saving. The event log is the first
thing that justifies IndexedDB (§6). Until then, Flags sessions (with IDs) sync, but learning
state stays device-local.

## 5. Proposed canonical data model

One logical model, used by local storage, export/import, sync and migrations. It can stay
physically split across keys.

```text
BrainData (schemaVersion N)
├── installation (device-local, never exported/synced)
│   ├── brain:meta    { schemaVersion, appVersion, migratedAt }
│   └── brain:device  { deviceId, createdAt }
│   └── (Phase 5) sync credentials — separate key, never exported
├── sessions         UNION by sessionId
│   └── { sessionId, deviceId, completedAt, metricVersion, appVersion, …game fields }
│       game/mode/difficulty/level derived from the storage key
├── bests            MAX/MIN per metric, with provenance { sessionId, metricVersion, eligible }
├── levelProgress    per game: { [levelId]: { completed, stars(MAX), levelVersion } }
├── learningEvents   UNION by learningEventId  (Flags; IndexedDB)
└── device-local     active autosaves, UI flags, started counters, current streaks
```

Versions stay independent: `schemaVersion` (storage shape), `appVersion` (release),
`metricVersion` per game (score definition), `levelVersion` per level (Phase 2), Flags
`DATASET_VERSION`.

## 6. Storage technology decision (spec §16)

**Stay on localStorage.** The data is small (JSON, capped) and access is synchronous, and moving it
would itself be a release risk. The original plan was to move to IndexedDB when Phase 3 added the
outbox. Phase 3 then showed that a coalesced, write-through outbox in localStorage keeps a local
save and its enqueue in one synchronous step, which is *more* atomic than an async IndexedDB
outbox. See §11 for the decision and when to revisit it.

Also recommended (not done, so no UX change): call `navigator.storage.persist()` for installed
PWAs (standalone display mode). Firefox shows a permission prompt, so gate it.

## 7. Compatibility risks

- **Older builds reading v2 data** (rollback, or a stale tab before its update banner is
  accepted). Safe: v2 only *adds* fields, and old readers ignore them. An older build's export
  would claim `schemaVersion: 1` while containing v2 entries. Importing that runs v1→v2, which
  skips entries that already have a `sessionId`. Safe.
- **Newer data on an older build's migration runner.** The runner returns `newer` and never
  downgrades.
- **Older app importing a v2 export** is rejected ("exported by a newer version"). Correct, but
  users on stale builds must update first.
- **Quota.** The migration needs room for a backup of the changed keys (up to roughly double the
  history size). If there isn't enough room it aborts cleanly and retries on the next launch. The
  app keeps working on v1 data, since every reader tolerates entries without an ID.
- **Deterministic legacy IDs** hash each entry's content. Two *byte-identical* legacy entries under
  the same key are told apart by occurrence index, so both survive. The same legacy entry on two
  devices gets the same ID (intended, so it dedupes).

## 8. Staged plan

| Phase | Scope | Status |
|---|---|---|
| 0 | This audit | ✅ |
| 1 | schemaVersion, sequential migrations, fixtures, Device ID, session IDs, release-safety guard | ✅ (below) |
| 2 | Pure merge engine: sessions ∪, bests via each game's own order with eligibility, level union + derived progression, counters MAX. Blue/Green/Red tests, commutativity/associativity/idempotence properties | ✅ (§10) |
| 3 | Durable outbox (write-through, per-op keys), sync client + auto-sync triggers, Flags learning events, mock transport/server | ✅ (§11) |
| 4 | Backend: zero-dependency Node + SQLite API — identity, device credentials, sync endpoint, cursors/revisions, idempotency, device list/rename/revoke, cloud delete; browser HTTP client | ✅ (§12) |
| 5 | QR pairing (short-lived single-use tokens), recovery code + rotation, re-joining after revoke/disconnect/lost credential | ✅ (§13) |
| 6 | Status line, Brain Sync screen (enable, join by QR/pairing code/recovery code, Sync Now, devices, recovery code, disconnect, cloud delete), auto-sync start-up, semantic import merge, real-browser e2e | ✅ (§14) |
| 7 | Security hardening, best provenance + definition versions, exact completion counts, Flags mastery from events, release-upgrade and offline-flight browser tests, backups and lossless restore, operations runbook, manual acceptance plan | ✅ (§15), except the physical tests in `BRAIN-SYNC-ACCEPTANCE.md` |

Pre-existing issue found, not fixed (out of scope):
`whackamole/useWhackAMoleGame.test.js › "a distractor tapped is a False Alarm…"` is **flaky on
unmodified `main`** (2 failures in 15 isolated runs), apparently depending on randomized spawns.

## 9. Phase 1 — what was implemented

- **`src/constants/storageKeys.js`**: the single list of game and deprecated prefixes, plus the
  `brain:meta`, `brain:device` and `brain:migration-backup` keys and `isHistoryKey()`. Moved out of
  `dataPortability.js` so migrations and export/import can't disagree.
- **`src/composables/persistence/ids.js`**: `randomUUID()` (CSPRNG, v4, with a
  `getRandomValues` fallback for non-secure contexts such as the LAN dev server) and
  `contentUUID()` (deterministic v8 UUID for legacy records, using a non-cryptographic identity
  hash, so no secure context is needed and startup stays synchronous).
- **`src/composables/persistence/device.js`**: stable random Device ID (never fingerprinted, never
  exported, survives Delete All Data) and `newSessionStamp()`.
- **All 18 history writers** now stamp `sessionId` + `deviceId` next to
  `metricVersion`/`appVersion`. No scoring, timing, cap or UI changed.
- **`src/composables/persistence/migrations.js`**
  - `CURRENT_SCHEMA_VERSION = 2`. A missing `brain:meta` means v1.
  - v1→v2 adds a deterministic `sessionId` to every legacy history entry, including retired-mode
    keys. It is idempotent.
  - `runStorageMigrations()` runs synchronously in `main.js` before mount: read → backup changed
    keys → pure migrate → `assertNoLoss` + unique-ID check → commit → bump `schemaVersion` →
    drop backup. It rolls back on a failed write, restores an interrupted run's backup on the
    next launch, never downgrades, never touches non-Brain or deprecated keys, and never throws
    into launch.
- **Export/import**: export `schemaVersion` now equals the storage schema version. Imports of
  older files run through the same migration (validated lossless) before writing. Merge dedupes
  history by `sessionId`. Invalid `schemaVersion`s are rejected, and import errors surface in the
  UI instead of throwing.
- **Fixtures**: `tests/fixtures/storage/schema-v1.json` was generated from the real 1.1.1 writers
  for all 18 games, plus hand-added legacy shapes. `schema-v2.json` is the golden migration
  output. Tests require a fixture per schema version, require each to upgrade losslessly, and
  require v1→v2 to reproduce the golden file exactly.
- **Release-safety guard**: a test fails if any source file calls `localStorage.clear()`,
  `sessionStorage.clear()` or `indexedDB.deleteDatabase()`.

Import → *Replace* was kept. It is an explicit, confirmed user action rather than an upgrade reset.
Spec §40 (never blindly replace better progress on a *synced* device) should turn it into a
merge-only path once sync exists (Phase 6).

## 10. Phase 2 — what was implemented

The merge engine is pure and deterministic, and the app doesn't call it yet. Two snapshots (the
canonical `{ storageKey: value }` shape at the current schema version) go in, and one merged
snapshot comes out.

- **`src/composables/sync/mergeRules.js`**: a declarative best-record rule for every game.
  Each rule restates the game's own "is this a new best" comparison, field by field
  (for example Emoji Mahjong compares stars, then score, then undos, then time). Eligibility is
  re-checked from each record's own fields: Target Tap's RT best needs hit rate ≥ 80 and false
  alarms ≤ 20, Mental Rotation's and Odd One Out's RT bests need accuracy ≥ 80, and every `bestClean`
  needs `hints === 0`. Those thresholds are now exported from the games' stats modules instead of
  copied. Campaign level counts come from the games' level constants.
- **`src/composables/sync/mergeEngine.js`**: `mergeData`, `mergeAll`, `describeMerge`,
  `syncableData`.

  | Data | Merge |
  |---|---|
  | history | union by `sessionId`; a same-ID conflict is resolved by content, deterministically |
  | best records | the game's own order; an ineligible record counts as absent; a full tie is broken by content, **never by timestamp** |
  | `completedLevels` | set union |
  | `highestUnlocked`, `totalStars`, `threeStarLevels` | **re-derived** from merged completions and per-level best stars, never merged; highest-unlocked is also kept ≥ its stored value |
  | counters, running totals, streaks | MAX |
  | `completions[]` samples | multiset union |
  | Flags learning | per country, the record with more attempts (interim, §4.4) |
  | autosaves, UI flags, non-Brain keys | never part of a sync snapshot |
  | anything else (e.g. retired-mode keys) | generic join: numbers MAX, booleans OR, arrays multiset-union, objects per field |

  A structurally invalid value (for example a non-array history) is treated as absent, so it can
  never displace valid data (§45). A key missing from the result means "nothing to write", never
  "delete".
- **Tests** (`mergeEngine.test.js`, 39 tests):
  - The §51 Blue/Green/Red Mahjong scenario, built with the real Emoji Mahjong save code. All
    six merge orders produce identical output, and it checks union of completions, derived
    unlock level 39, the preserved L30 ★★★ and best L37, and that no session is lost.
  - Each rule unit-tested: MAX, MIN, eligible-only RT, clean-only, timestamp-independence,
    union/OR, invalid payloads, device-local exclusion.
  - **Every rule cross-checked against the game's real save code**: for random result pairs
    where the game itself keeps the same bests regardless of the order it sees them in, merging
    two single-result devices must give exactly those bests.
  - Commutativity, associativity (all 3-device combinations), idempotence and "no regression"
    over randomized multi-game devices built with the real save code. A one-off heavier run
    (30 devices, 400 result pairs per game) also passed.

Known limits, taken on deliberately:

- **Counters (MAX) are a lower bound.** Two devices that each completed a level 3 times show 3
  after merging, not 6. Nothing is double-counted and nothing regresses. Exact totals need
  counters derived from full session history, which only the server holds (Phase 4). The derivation
  itself is Phase 7.
- **Flags learning is not fully mergeable yet.** Phase 3 queues per-answer events; recomputing
  mastery from the merged event set is Phase 7 (the server has stored the events since Phase 4).
- **Best provenance (`sessionId` on best records) and `levelVersion` are deferred to Phase 7.**
  Nothing consumes them yet (eligibility is validated from each record's own fields), and every
  level is currently at version 1, so a missing value reads as 1.

## 11. Phase 3 — what was implemented

### Decision: no IndexedDB migration (yet)

§6 expected the outbox to be what justifies moving to IndexedDB. The design below makes that
unnecessary, and §16 says not to migrate merely because sync exists:

- **Atomicity.** A local save and its outbox entry happen in the *same synchronous step*.
  IndexedDB is asynchronous, so moving only the outbox there would *weaken* "local save + enqueue
  as atomic as practical" (§21). Moving everything there would make every save path async across
  18 games.
- **Size is bounded.** Record ops are *coalesced per storage key*, and their payload is read at
  send time (records merge as joins), so repeated play doesn't grow the queue. Only new-session
  ops (~300 bytes each) and Flags learning events grow with offline play, and they're removed
  once acknowledged. Weeks offline is roughly 100s of KB.
- **Cap-safety without uncapping.** A session op carries its entry, so the local 20/30-entry
  history cap can evict a session before the device is back online without it being lost for
  sync.

Reconsider IndexedDB if the local history caps are ever lifted (full on-device history) or if
learning events must be kept on the device.

### What changed

- **`persistence/durableWrite.js`: `persistJSON()`**, the single durable write path. All 22
  durable writers (18 stats/history modules, the three standalone best modules, import) now use
  it instead of `localStorage.setItem(key, JSON.stringify(value))`. It behaves identically,
  including throwing into each caller's existing try/catch. After a *successful* write it
  notifies listeners, and a failing listener can't affect the save. Autosaves (`storage.js`) and
  UI flags deliberately bypass it.
- **`sync/outbox.js`**
  - Operations carry the spec's fields: `operationId`, `deviceId`, `entityType`, `entityId`,
    payload/version, `createdAt`, `attemptCount`, `lastAttemptAt`.
  - Each operation is stored under its own `brain:sync:op:<type>:<id>` key, so two open tabs
    can't lose each other's entries. Operations are never exported.
  - The queue is inert unless `enableSync()` was called; sync is off by default.
  - `enableSync()` triggers a one-time full-state push, so existing local progress is merged,
    never discarded (§9).
  - `disableSync()` drops the queue and keeps all local data.
  - If the queue runs out of room, it falls back to a full resync instead of losing the change.
- **`sync/syncClient.js`: `runSync()`**
  - It is single-flight (overlapping triggers share one exchange) and has a 15 s timeout.
  - It pushes the queue, validates the response and rejects a malformed one wholesale (§45),
    merges remote changes through the merge engine, and writes only keys that actually changed.
    Remote data is written raw, not re-queued.
  - It acknowledges only the exact operation version that was sent, so a write made during an
    in-flight sync stays queued.
  - Bootstrap operation IDs are derived from content, so retries are idempotent.
  - Backoff is bounded exponential with jitter (5 s → 15 min).
  - On 401/403 it reports `needs-pairing` and stops automatic retries (§44).
  - `getSyncStatus()` returns §41's states: `local-only`, `synced`, `pending`, `offline`,
    `unavailable`, plus `needs-pairing`.
- **`sync/autoSync.js`**: sync on launch while online, on the `online` event, when the app comes
  back to the foreground, 2 s after any durable write (i.e. a completion), on a retry timer
  after a failure, and on `syncNow()`. It uses no Background Sync API (§22). It isn't started
  yet, because there is no real transport until Phase 4.
- **Flags**: every answer is queued as a learning event with a unique `learningEventId` (§20).
  Events are only queued for the server, never kept locally, and nothing is queued while sync
  is off.
- **Delete All Data** also drops queued operations (they're copies of local data). It never
  touches cloud data (§39), the device ID, or sync settings.
- **`sync/mockServer.js`**: an in-memory stand-in for the Phase 4 API. It skips operations it
  has already applied (by `operationId`), merges on accept, keeps per-key revisions and cursors,
  and can be switched to offline, hang (timeout), lost-response, unauthorized, or garbage
  responses. Tests only; it is not in the app bundle.

### Tests (`sync/outbox.test.js`, 24 tests)

- **Everything §49 lists:**
  - saving and unlocking with the network down;
  - an API timeout after the local save has already succeeded;
  - recording that returns synchronously with no network work inside it;
  - the queue surviving a reload;
  - reconnecting draining the whole queue.
- **Also covered:**
  - 35 offline Sudoku completions against the 30-entry cap all reach the server;
  - a lost response is retried with no duplicates;
  - a write during an in-flight sync is not wrongly acknowledged;
  - garbage responses are rejected with local data untouched;
  - a revoked credential leaves local play working;
  - enabling sync on a device with existing progress pushes it all once, then goes incremental;
  - all auto-sync triggers, retry backoff, and no attempt while offline.
- **End to end:** Blue, Green and Red each play offline, then sync through the mock server in
  different orders. All three end up with **identical** local data (L30 ★★★, L28 ★★★, L37 ★★,
  unlock level 39, every session present) and empty queues.

Main bundle: +2.1 kB (+0.7 kB gzipped). The merge engine and sync client aren't loaded until a
transport exists.

### Known limits

- The acknowledgement check-then-remove is not atomic across tabs. If another tab rewrites the
  same record key in the microseconds between the check and the removal, that newer version
  isn't pushed until the key is written again. The data stays on the device in either case.
- Remote history is written uncapped. The game's own cap trims it again on that game's next
  save, and the trimmed sessions are already on the server.

## 12. Phase 4 — what was implemented

### Stack decisions (§36, §64)

- **Node + built-in `node:sqlite` + `node:http`, zero dependencies.** The alternatives (a web
  framework, an ORM, Postgres) add dependency and operational weight a single-user-scale API
  doesn't need. SQLite in WAL mode is one file to back up.
- **The server imports the client's merge engine** (`src/composables/sync/mergeEngine.js`) rather
  than re-implementing the rules. Server and devices therefore can't disagree on which progress
  is better, and the Phase 2 property tests cover the server too.
- **Credentials are 256-bit random bearer tokens (`bsc_…`), stored only as SHA-256 hashes.** A
  slow password hash buys nothing for high-entropy tokens and would prevent an indexed lookup.
  Only `node:crypto` is used, with no custom crypto (§14).
- **Requests are serialized:** `node:sqlite` is synchronous, so every sync runs as one
  `BEGIN IMMEDIATE` transaction. Concurrent devices (§48) can't interleave half-applied changes.

### What changed

- **`server/db.js`**: sequential, append-only server schema migrations (`schema_migrations`), WAL,
  foreign keys. Tables: `identities` (holds the per-identity revision counter), `devices`,
  `operations` (idempotency log), `records`, `sessions` (one row per session, uncapped),
  `learning_events`.
- **`server/sync.js`**
  - Identities, devices and credentials: create, authenticate, profile rename, device
    list/rename/revoke, delete identity with a cascade over every table.
  - The sync exchange:
    - validates the request (schema version → 409, sizes → 413, shapes → 400);
    - applies each `operationId` at most once per identity;
    - merges records with the shared engine;
    - stores whole history lists (from bootstrap) as individual session rows;
    - re-derives campaign progression server-side;
    - returns changes since the cursor, with history in the engine's canonical order;
    - acknowledges invalid operations but never merges them (listed as `rejected`), so a bad
      operation can't block a device's queue.
  - Operation IDs expire after 90 days. Pruning can't cause duplicates, because the data itself
    is idempotent.
  - `registerDevice()` exists for Phase 5 pairing and isn't reachable over HTTP.
- **`server/app.js`** (routes listed in its header)
  - Credentials are accepted only in the `Authorization` header.
  - HTTPS is enforced, and `X-Forwarded-Proto` is trusted only when configured.
  - CORS answers only listed origins.
  - Rate limits: identity creation and repeated authentication failures, per client IP, held in
    memory only.
  - The access log is `METHOD /route/template STATUS ms` only.
  - Every response is `Cache-Control: no-store`.
- **`server/index.js`**: environment-based config; listens on `127.0.0.1` by default; daily
  pruning; graceful shutdown.
- **`src/composables/sync/syncApi.js`** (browser client)
  - The HTTP transport for `runSync()`, whose timeout now aborts the in-flight request.
  - `createIdentity()` is "Enable Brain Sync": the anonymous identity, this device as its first
    device, and sync turned on, with the first exchange uploading all existing local progress.
  - Profile/device calls, `deleteCloudData()` and `disconnectThisDevice()`; both keep local
    progress.
  - The credential lives in `brain:sync:credential`, so it is never exported, imported or shown.
- `npm run sync-server`; an opt-in `docker compose --profile sync` dev service; a
  reverse-proxy example in `deploy/nginx.conf.example`. **Nothing has been deployed.**

### Tests (`server/server.test.js`, 27 tests, against a real HTTP server on SQLite)

- **Blue, Green and Red over HTTP.** Blue had local-only progress and enables sync. Green and Red
  are added and play offline. After syncing, all three devices are identical: L30 ★★★, L28 ★★★,
  L37 ★★, unlock level 39, every session (102) present, and all queues empty.
- **Two devices pushing concurrently** both land, and neither erases the other.
- **The server keeps the full history:** 35 Sudoku sessions against the 30-entry client cap.
  Replayed requests and re-sent sessions create no duplicates. Cursors return only newer changes.
  Progression is derived server-side, and a worse best never wins.
- **§53 security:**
  - a Sync ID alone, a forged credential or no credential gets 401;
  - credentials are stored hashed only;
  - one identity can't read, rename or revoke another identity's devices or data;
  - malformed, oversized and too-many-operation requests are rejected;
  - invalid operations never merge;
  - HTTPS is required, and the forwarded header is only trusted when configured;
  - identity creation and authentication failures are rate-limited;
  - CORS answers only listed origins;
  - logs contain no credential, Sync ID, device ID or `Bearer`.
- **§13/§39/§44:**
  - devices can be renamed with duplicate labels, which never change identity;
  - a revoked device gets `needs-pairing` and keeps all local progress and keeps playing, while
    the other devices are unaffected;
  - Delete Cloud Data empties every server table for that identity and keeps local progress.
- **Datastore:** server migrations run once when reopening a file; pruning removes only expired
  operation IDs.
- A manual smoke test of `node server/index.js` with curl (health, identity, devices, sync) also
  passed, and its log contained only route templates.

The app bundle is unchanged: nothing in the app imports `syncApi.js` until Phase 6.

### Moved out of Phase 4

Best provenance, `levelVersion` stamping and session-derived counters moved to Phase 7. Nothing
consumes them yet, and each needs care of its own (the counters need a per-game mapping from
stats scope to session history).

## 13. Phase 5 — what was implemented

### Pairing (§10, §11)

- A trusted device requests a **pairing token** (`POST /v1/pairing-tokens`): 256 random bits,
  valid for **5 minutes**, **single-use**, stored only as a SHA-256 hash. Each identity keeps at
  most 5 open tokens (the oldest is dropped), and `DELETE /v1/pairing-tokens` cancels them all.
- The QR payload is `BRAINPAIR1.<token>.<base64url(server URL)>`.
  - It is deliberately **not a URL**, so a phone camera won't open it in a browser and leave the
    secret in browser history.
  - Decoding rejects anything malformed, and any non-HTTPS server other than localhost.
- The new device claims the token (`POST /v1/pairing/claim`, no auth) with its own Device ID.
  - Unknown, expired and already-used tokens all give the same `401 invalid_pairing_token` (§53).
  - A device can't claim a token it created itself (409).
  - The token is marked used in the same transaction that issues the new device's credential.

### Recovery code (§12)

- Format (`src/composables/sync/recoveryCode.js`, shared by server and browser): 27 CSPRNG
  Crockford-base32 symbols (**135 bits**) plus a check symbol, shown as `XXXX-XXXX-…` (7 × 4).
- Reading is forgiving: case, spaces and dashes are ignored, I/L read as 1, O as 0.
- The check symbol (weighted sum mod 31) catches every single-symbol typo and every swap of two
  neighbouring symbols, except those between `0` and `Z`. This is verified exhaustively in tests.
  A typo is therefore caught on the device and never uses up a rate-limited server attempt.
- **Generated server-side, returned exactly once, stored only as a SHA-256 hash.** It isn't
  kept on the device either. `createIdentity` issues the first code. "Show / Rotate" is
  implemented as **rotate and show**, because the server can't show a code it doesn't store.
  - Rotating makes the old code stop working immediately; paired devices are unaffected.
  - `GET /v1/recovery-code` returns only `{ configured, rotatedAt }`.
- `POST /v1/recover` (no auth) adds the device to the identity with no trusted device needed.
- **The consequence the UI must explain (§12):** with no email or password, losing every trusted
  device *and* the recovery code makes cloud recovery impossible.
- Identities created on a Phase 4 server have no recovery code (`configured: false`). The
  Phase 6 UI should prompt for one.

### Rejoining, and the Device ID rule

Pairing and recovery both call `registerDevice()`. Re-registering a known Device ID replaces that
device's credential, and the old one stops working immediately. That one rule covers three cases:

- a revoked device coming back;
- a device that disconnected itself;
- a device that lost its local credential but kept its Device ID.

Both flows already prove full authority over the identity, so allowing this adds no power.
Joining keeps any progress already on the joining device: sync starts with a full resync, and
local and cloud data are merged, never "keep local" vs "keep cloud" (§31/§32).

### Abuse limits and logging (§38, §53)

- Failed claims (20 per 10 min) and failed recoveries (10 per hour) are rate-limited per client
  IP, in memory only. Once the limit is hit, even a correct code is refused until the window
  passes.
- Tokens, recovery codes and credentials travel only in request bodies or the `Authorization`
  header, never in URLs, and never appear in logs.
- Expired tokens, and tokens used more than a day ago, are pruned hourly.

### Server schema

Migration 2 adds `pairing_tokens`, `identities.recovery_hash` (with a unique index) and
`recovery_rotated_at`. A test builds a database exactly as the Phase 4 server left it and checks
it upgrades with every row intact and existing credentials still working.

### Tests

**`server/pairing.test.js`** (20 tests):

- the full QR flow between two devices, where the joining device's earlier offline play is
  merged in both directions;
- single use, expiry, indistinguishable token failures, cancel, the open-token cap, and no
  self-claim;
- a Sync ID or a credential never works as a pairing token; malformed payloads are rejected;
  only hashes are stored;
- recovery issued once and kept on neither the server nor the device;
- recovery on a new device with its own progress;
- a typo caught locally with no request sent, and a well-formed but unknown code rejected;
- rotation invalidates the old code while paired devices keep syncing;
- rejoining after revoke, after disconnect, and after a lost credential, with the old credential
  staying dead;
- cloud delete removes the recovery code and open tokens;
- rate limits, and secret-free logs.

**`recoveryCode.test.js`** (6 tests): format, uniform symbol use, forgiving reads, the exhaustive
typo and swap detection above.

**Also:** the server schema upgrade test, and a manual `node server/index.js` smoke test
(create → token → claim 201 → reclaim 401 → recover 201 → 3 devices) with a log containing
route templates only.

## 14. Phase 6 — what was implemented

### Switched on per build

`VITE_BRAIN_SYNC_URL` (build time, `sync/config.js`) names the sync server. **Without it, which is
the default, a build has no status line, no Brain Sync link and no network calls:** it's exactly
the app as before. The production site doesn't change until someone builds it with a URL.

### What the player sees (§41, §42)

- **Status line** on the landing screen (`SyncStatusLine.vue`, reactive `sync/syncStatus.js`), in
  §41's wording:
  - "Progress stored on this device · Enable Sync"
  - "☁ Synced"
  - "☁ 12 changes waiting to sync"
  - "✈ Offline · Progress saved locally"
  - "Sync unavailable · Progress is safe on this device"
  - "Sync paused · …reconnect in Brain Sync"

  A test checks that no state's wording implies progress was lost. The line is informational
  only and never blocks.
- **Brain Sync screen** (`SyncSettings.vue`, its own lazy chunk):
  - **Local-only:** Enable Brain Sync (optional profile and device names). The **recovery code is
    shown exactly once**, groups never break across lines, and there is a §12 warning. **Done**
    stays disabled until "I've saved my recovery code" is ticked.
  - **Join:** Scan QR code, Paste pairing code, or Use recovery code (a typo is flagged as you
    type), each with an optional device name. Joining merges the progress already on the device.
  - **Connected:**
    - status with Sync Now;
    - profile with Rename;
    - devices (name, "This device", last seen) with Rename and Remove;
    - **Add Device** (QR with a 5:00 countdown, "Can't scan? Copy pairing code", live "✓ Green
      is now connected", and leaving cancels the open token);
    - recovery code (created/rotated date, create a new one, a prompt if none exists yet, which
      covers identities from the Phase 4 server);
    - Disconnect This Device;
    - Delete Cloud Data (type DELETE);
    - Advanced, which shows the raw IDs only there (§42).
  - **Needs pairing** (revoked or credential lost): reconnect by QR, pairing code or recovery
    code, or stop syncing. Local progress is always kept.
- **Automatic sync** starts after mount, only on a build with a server and a device that enabled
  it (`sync/syncRuntime.js`, loaded lazily and never awaited). Launch and play never wait for it.

### QR codes: two small dependencies (§64)

| Package | Why | Cost |
|---|---|---|
| `uqr` 0.1 (MIT, no dependencies) | encodes the pairing payload; rendered as our own SVG, always dark-on-white | inside the Brain Sync chunk |
| `jsqr` 1.4 (Apache-2.0, no dependencies) | decodes camera frames where there's no native `BarcodeDetector` (iOS Safari, Firefox); the native one is used when present | its own chunk, **47 kB gzipped, excluded from the service-worker precache** (pairing needs the network anyway) |

QR encoding and decoding are the kind of code not to hand-roll, and iOS Safari, the main PWA
target, has no built-in decoder. The scanner runs *inside the app*, not the phone's camera app,
because an iOS Home Screen app and Safari don't share storage. The camera stops as soon as a code
is read or the screen is left.

Main bundle: +4.9 kB (+1.75 kB gzipped) for the status line. The merge engine, the API client and
the QR code load only with the Brain Sync screen, or at startup on devices that enabled sync.

### Manage Your Data changes (§39, §40)

- **Import → Merge now uses the sync merge engine:** the better personal best wins whichever side
  it's on, history is combined by session, and campaign progress is re-derived from the whole
  local state. Before, the local best always won. In-progress autosaves still only fill gaps.
- **On a synced device:**
  - Import → Replace is hidden, with an explanation (synced progress would come straight back).
  - Delete All Data explains that it deletes only this device's copy, and resets the sync cursor
    so the cloud copy downloads again. Removing it everywhere is Delete Cloud Data.

### Tests

- **Unit tests (14 new):**
  - §41 status wording;
  - the status store following real writes and connectivity;
  - the default build has no server;
  - runtime start conditions and Sync Now;
  - a real round trip: pairing payload → QR matrix → pixels → jsQR;
  - native `BarcodeDetector` preferred, jsQR fallback on a canvas;
  - semantic import merge (a better imported best wins, a better local best is kept, progress
    re-derived, autosaves fill gaps only);
  - Delete All Data resets the cursor only on synced devices.
- **Real-browser end to end (`npm run test:e2e-sync`, `tests/e2e/sync-ui.mjs`).** Headless
  Firefox over WebDriver BiDi, with no test dependencies. It builds the app against a throwaway
  local server, and each device is an isolated browser profile. It checks:
  - Blue enables sync; the recovery code is shown once, must be acknowledged, and isn't stored;
  - Red, with its own progress, joins by recovery code after a caught typo, and both devices end
    up with both sets of progress;
  - Blue's **QR as rendered on screen decodes to the exact pairing payload**;
  - Green joins with the pairing code, Blue sees it arrive and lists Blue, Red, Green;
  - the landing screen shows "☁ Synced";
  - with the sync server killed, Sync Now and the landing screen show "Sync unavailable ·
    Progress is safe on this device" and nothing blocks.

  The server's log from that run contained no credentials, tokens or IDs. Mobile-sized
  screenshots were reviewed; that review led to recovery-code groups never splitting across lines
  and a device-name field on every join screen.

### Not covered yet (Phase 7)

- A real camera scan on a phone. The scanner code path is tested with synthetic frames and the
  rendered QR, not a physical camera.
- The §52 physical Airplane Mode acceptance test.
- Best provenance, `levelVersion`, session-derived counters.
- Server-side mastery recomputation from Flags learning events.

## 15. Phase 7 — production hardening

### Security fixes found by probing (§45, §53)

- **A remote `__proto__` key replaced a merged object's prototype.** It didn't reach the global
  `Object.prototype`, but the merged object was corrupted. **A 20,000-level nested payload crashed
  the recursive merge** with a `RangeError`, which the server would return as a 500 on every
  retry. `sync/payloadLimits.js` now caps depth (32) and size (250k nodes) and rejects
  prototype-changing keys, using an iterative check. The merge engine treats such values as
  absent and never assigns unsafe keys. The server acknowledges such operations but never merges
  them, so they can't jam a device's queue.
- **Per-identity quotas:** sessions, records, learning events and the size of one record. **A
  sync rate limit per identity.** **HTTP timeouts:** headers, request and keep-alive. A client
  whose merge of a response throws now reports a failed sync and keeps its queue, instead of an
  unhandled rejection.

### Data correctness items deferred from earlier phases

- **Best provenance (§24/§26).** Every newly set best records the session that set it (the same
  `sessionId` as its history entry), its `metricVersion` and, for campaign levels, its
  `levelVersion` (`constants/levelVersions.js`, per level, all 1 today). When two bests are on
  different definitions, the newer definition wins. Unstamped bests count as the definition in
  force when stamping began (`UNSTAMPED_METRIC_VERSIONS`, frozen). Probing found that the first
  version of this rule could form a **cycle** once versions mix, which would break convergence;
  that is fixed, with a test that fails on the old rule. The heavy stress run passes.
- **Exact completion counts (§27).** The server recounts completions from its uncapped session
  rows for every history list a sync touches. It follows each game's own rule
  (`completionScopeOf`: campaign levels, per-scope lists, shared lists split by difficulty, Number
  Match cleared boards only, Switch Trail completed runs only). It joins the result in and lifts
  `started` to at least `completed`. Two devices that each finished a level 3 times now both show
  6. Counts never go down, and no stats record is invented. Other running totals (such as play
  time) remain MAX lower bounds.
- **Flags mastery from events (§20).** The server replays every device's answers for a country
  through the game's own `updateCountryLearning`, in answer order. The result joins the learning
  record, where the record built from more attempts wins. So a streak started on one device and
  continued on another is recognised, and a wrong answer anywhere resets it.

### Release safety, offline and multi-device, in a real browser

`npm run test:e2e-release` (`tests/e2e/release-offline.mjs`):

- **Release upgrade:** builds the last pre-sync release (v1.1.1, extracted with `git archive`) and
  **plays a real Hanoi level on it**. It then deploys this build to the same origin. The installed
  service worker keeps the old app running until **"Reload to update"** is clicked. The new app
  then migrates in place: schema 2, the legacy session byte-for-byte plus a deterministic
  `sessionId`, and unlocks intact.
- **Offline:** with the app server, the sync server **and the browser's own network** gone
  (Firefox offline emulation), the app **cold-starts from the PWA cache**. A level is played to
  the Results screen, saved and queued. The status reads "✈ Offline · Progress saved locally ·
  3 changes to sync". Everything survives an offline reload.
- **Reconnect:** once the network is back, the queue drains **with no button pressed**. A second
  device paired by recovery code receives both sessions and the correct completion count.

`npm run test:e2e-sync` (Phase 6) is refactored onto the shared `tests/e2e/harness.mjs` and
still passes.

### Operations

- **Backups:** `server/backup.js` (`npm run sync-backup`) takes a consistent online snapshot with
  `VACUUM INTO` and keeps the newest N. A test restores one with credentials and data intact.
- **Lossless restore:** writing the runbook exposed that restoring an older backup would strand
  progress. The server's revision went back while device cursors stayed ahead, so devices neither
  re-uploaded nor pulled again. **Fixed:** a cursor ahead of the server's revision gets the full
  state and `resync: true`, and auto-sync immediately re-uploads the device's whole local state.
  A test restores a server to an earlier point and checks that two devices bring everything back.
- `deploy/BRAIN-SYNC-OPERATIONS.md`: a checklist, configuration and limits, upgrade order,
  backup and restore drill, log retention, privacy, threat model, incidents and monitoring.
- `deploy/brain-sync.service.example`: a sandboxed systemd unit plus a backup timer, checked with
  `systemd-analyze verify`. **Nothing was deployed.**
- `specs/BRAIN-SYNC-ACCEPTANCE.md`: the tests that need real hardware.

## 16. Definition of done (spec §66–§71)

| § | Requirement | Status |
|---|---|---|
| 66 | Release upgrades preserve all supported existing data | ✅ historical fixtures + migration tests; real v1.1.1 → this build upgrade in a browser |
| 67 | Zero connectivity: cold start, play, save, unlock, bests, queue, survive close/reopen/reboot | ✅ automated in a browser except **reboot**: manual test A7 |
| 68 | Pending changes upload, remote download, semantic merge, convergence, no better progress lost | ✅ property tests, 3-device convergence over HTTP and in a browser, automatic reconnect |
| 69 | One Sync ID owns devices with any labels; labels never affect identity | ✅ server and UI tests |
| 70 | New device joins by QR or recovery code, no username/password/email | ✅ in a browser (rendered QR decoded; pairing and recovery flows). **A real camera scan is manual test B** |
| 71 | Usable without sync, no real-world identity, revocation, independent local/cloud deletion | ✅ builds without a URL have no sync at all; revoke, disconnect and delete are tested |

**Still to do before calling it production-ready:** the physical tests in
`BRAIN-SYNC-ACCEPTANCE.md`. Section A, the §52 Airplane Mode flight test on a real iPhone
including a reboot, is **mandatory per the spec**. Section B is camera pairing on real devices.
They need hardware and a person. Deployment is deliberately left to the maintainer.

Pre-existing and unrelated: `whackamole/useWhackAMoleGame.test.js › "a distractor tapped…"` is
still flaky on unmodified code (§8).

## 17. After v1.2.0: fixes from manual LAN testing

- **Pairing with a plain-http development server** (e.g. `http://192.0.2.10:8787`) was impossible,
  because pairing codes only allowed HTTPS or localhost servers. They now also accept the exact
  server the build is configured with (`VITE_BRAIN_SYNC_URL`, fixed at build time). Any other
  insecure server is still rejected.
- **A recovery code pasted into "Paste pairing code"** was rejected in the browser without ever
  reaching the server. The box now accepts either kind of code, and the error messages name both
  formats, the 5-minute pairing expiry, and "only the newest recovery code works".
- **Vite no longer reads `.env` files** (`envDir: false`). The repo's `.env` belongs to
  docker-compose. With `VITE_BRAIN_SYNC_URL` in it for LAN testing, every `npm run build` would
  otherwise have shipped that LAN server. Real environment variables still work.
- The About, Activity and Manage Your Data screens said "nothing is ever sent anywhere", which is
  untrue once a player enables sync. They now show sync-aware wording on synced devices and are
  unchanged otherwise.

## 18. Sync on by default, on the app's own origin

Sync used to need a server URL fixed at build time, plus a CORS allow-list naming the app's exact
address. On a LAN that meant hard-coding one machine's IP. Now:

- **`VITE_BRAIN_SYNC_URL` unset (the default)** means the app calls `/v1` on whatever origin
  served the page (`sync/config.js`, `resolveSyncServerUrl`). The dev and preview servers forward
  `/v1` to the sync server (`vite.config.js`, `BRAIN_SYNC_PROXY_TARGET`), and so does the
  production reverse proxy (`deploy/nginx.conf.example`). It's a same-origin request, so there's
  no CORS to configure and it works on any host or LAN address.
- **`off`** builds without sync. An explicit URL still targets a server on another origin (with
  CORS).
- **`docker compose up`** always starts `brain-sync`. It isn't published on its own port: it's
  reachable only through the dev server's proxy, which is why it can trust the forwarded client
  address for rate limiting.
- A pairing code from another device on the same address passes the pairing check unchanged,
  because the configured server is now the page's own origin.

`git clone` + `docker compose up` gives a working app with sync on any network, with nothing to
configure.
