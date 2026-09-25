# Brain Sync — Phase 0 Persistence Audit (and Phase 1 record)

Audit of Brain's local persistence as of **1.1.1** (`45a9015`), per
[`BRAIN-SYNC-SPEC.md`](./BRAIN-SYNC-SPEC.md) §55/§65. The last section records what Phase 1
(§56) changed. No sync, merge engine, outbox or backend exists yet. Those are Phases 2–7.

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

**Stay on localStorage for Phase 1.** The data is small (JSON, capped) and access is synchronous,
and moving it now would itself be a release risk. Move to IndexedDB, non-destructively, **when
Phase 3 introduces the outbox and Flags learning events.** Those need append-heavy, uncapped,
transactional writes (a local save and its outbox enqueue should be atomic, §21), which
localStorage can't do. Sessions should move then too, which would allow lifting the history caps.

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
| 2 | Pure merge engine: sessions ∪, bests MAX/MIN with eligibility, level union + derived progression, counter derivation, `levelVersion`, best provenance. Blue/Green/Red tests, commutativity/associativity/idempotence properties | next |
| 3 | IndexedDB migration (non-destructive), durable outbox, Flags learning events, mock transport | |
| 4 | Backend (small HTTPS API + SQLite/Postgres): identity, devices, sync endpoint, cursors, idempotency | |
| 5 | QR pairing tokens, recovery code + rotation, revocation | |
| 6 | Status UI, Sync Now, auto-sync triggers, device management, cloud delete/disconnect | |
| 7 | Hardening, including the physical Airplane-Mode acceptance test (§52) | |

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
