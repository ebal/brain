# Brain Sync — Local-First Anonymous Cross-Device Synchronization — Specification

## 1. Purpose
Add optional cross-device synchronization to Brain without weakening its most important property:

> **Brain must remain fully playable and writable offline.**

Users may play from several browsers, PWAs, phones, tablets, or computers. Progress created anywhere eventually merges into one anonymous Brain identity when Internet access returns. Cloud sync is enhancement/backup, never required for gameplay.

## 2. Non-negotiable principles
1. Local-first and offline-first.
2. Save every game/level locally **before** network work.
3. Cloud failure never blocks launch, gameplay, Results, progression, or local saving.
4. Sync is optional; existing local-only Brain remains valid.
5. No username, password, or email required.
6. One immutable random **Sync ID** identifies the profile.
7. Each browser/PWA installation has an immutable random **Device ID**.
8. Profile/device display names are optional mutable labels, never identifiers.
9. QR pairing or recovery code connects another installation.
10. Never use whole-profile "latest device wins".
11. Better durable progress must never be overwritten by worse/older progress.
12. Releases must migrate/preserve local data.
13. Active gameplay never waits for the server.

## 3. Architecture

```text
Brain PWA
   |
LOCAL DATA  ← immediate source of truth
   |
   +-- OFFLINE: play → save → unlock → queue changes
   |
   +-- ONLINE:  play → SAVE LOCAL FIRST → queue → background sync
                                                |
                                          Brain Sync API
                                                |
                                             Database
```

Correct completion flow:

```text
finish game
→ commit local state
→ show Results
→ unlock/update local progress
→ enqueue sync
→ return control to player
→ background network work
```

Forbidden: waiting for an API before saving/showing/unlocking.

## 4. Offline flight behavior
With Airplane Mode and Wi-Fi off, Brain must cold-start from its cached PWA, play normally, save sessions/levels/bests locally, queue pending sync, survive close/reopen and device reboot, and continue playing. When connectivity returns, synchronization happens automatically.

# Identity

## 5. Sync ID
Generate one cryptographically random immutable `syncId` (UUID/high-entropy equivalent). It is not derived from name, device, browser, IP, or fingerprint and never changes.

**Sync ID alone is not an authentication secret.**

## 6. Profile display name
Optional `displayName` such as `Evaggelos` or `My Brain`. It is mutable, need not be unique, and is never a database key. Renaming never changes Sync ID.

## 7. Device ID
Each installation generates an immutable random `deviceId`, e.g. `crypto.randomUUID()`. Never use fingerprinting, serial numbers, IMEI, hardware IDs, or IP-based identity.

## 8. Device labels
Each device may have a mutable, non-unique label:

```text
Blue
Green
Red
My iPhone
MacBook
```

Example:

```text
Sync ID abc...
├── Device ID A → Blue
├── Device ID B → Green
└── Device ID C → Red
```

Names have zero effect on synchronization.

# Pairing and recovery

## 9. Enable Sync
An existing local-only user chooses `Enable Brain Sync`. Create the anonymous identity and **merge/upload existing local progress**. Never require discarding local progress.

## 10. Add Device
Support:
1. QR pairing from an already trusted device.
2. Recovery code when a trusted device is unavailable.

No username/password.

## 11. QR security
QR must not contain merely a public/guessable Sync ID. Preferred flow:

```text
trusted device
→ request short-lived single-use pairing token
→ display QR
→ new device scans
→ server validates token
→ register new Device ID + credential
→ invalidate token
```

Treat QR contents as sensitive credentials.

## 12. Recovery code
Generate a cryptographically secure high-entropy recovery secret. Human formatting may use grouped characters, but entropy matters. Do not derive it from Sync ID. Do not store recoverable plaintext server-side where avoidable.

Explain clearly: without email/password/external identity, losing all trusted devices **and** the recovery secret may make cloud recovery impossible.

Support `Rotate Recovery Code`; old recovery credentials become invalid while already paired devices remain valid unless revoked.

## 13. Device revocation
Allow a device credential to be revoked without deleting that device's local Brain data or affecting other devices.

# Authentication/security

## 14. Device credentials
After pairing, each installation has conceptually:

```text
syncId
deviceId
device credential/token
```

The server authenticates every sync. Device credentials are revocable. Do not expose secrets in URLs, logs, analytics, exports, or normal UI. HTTPS only. Use established cryptographic libraries/primitives; no custom crypto.

# Local persistence and migrations

## 15. Canonical versioned data model
Define one canonical Brain user-data model used conceptually by local persistence, JSON export/import, cloud sync, and migrations. It may physically use multiple records.

Keep separate:
- `schemaVersion`
- `appVersion`
- `metricVersion`
- `levelVersion`
- learning/dataset versions

Do not conflate them.

## 16. Storage technology
First audit current localStorage. Do not migrate merely because sync exists. If sessions/events/outbox/indexing/transactions justify it, migrate structured durable data to IndexedDB through a non-destructive migration. Existing localStorage may remain where appropriate.

## 17. Release safety
A deployment must not erase user data. Service-worker/cache updates concern application assets, not user progress.

Never use `localStorage.clear()` or equivalent as an upgrade strategy.

## 18. Sequential migrations
Migrate deterministically:

```text
v1 → v2 → v3 → current
```

Process: read → preserve/copy → migrate → validate → commit → update schemaVersion. On failure preserve original data; never silently reset.

Maintain historical fixtures:

```text
tests/fixtures/storage/schema-v1.json
schema-v2.json
...
```

CI verifies old released data upgrades without meaningful loss.

# Durable record identities

## 19. Sessions
Every completed session receives a globally unique `sessionId`, plus `deviceId`, `gameId`, timestamp, metricVersion and appVersion. Never deduplicate by timestamp alone.

## 20. Learning events
Where useful (e.g. Flags), each learning attempt gets a unique `learningEventId`. Aggregate mastery may be recalculated from merged events.

# Outbox

## 21. Durable sync outbox
Every durable local change that should sync creates/updates an outbox operation. Local save + outbox enqueue should be as atomic as practical.

Each operation includes:

```text
operationId
deviceId
entityType
entityId
payload/version
createdAt
attemptCount
lastAttemptAt
```

Operation IDs make retries idempotent.

## 22. Retry/triggers
If offline/server unavailable, keep the item and retry later with bounded backoff.

Attempt sync after practical events such as app launch online, connectivity returning, game/level completion, foregrounding, and explicit `Sync now`.

Do not rely exclusively on browser Background Sync APIs; foreground sync must work on iPhone/Safari/PWA.

# Merge semantics

## 23. Core rule
**Whole-profile last-write-wins is forbidden.** Merge at the smallest meaningful entity/field.

Default durable merge semantics:

| Data | Merge |
|---|---|
| Completed level | OR / set union |
| Stars | MAX |
| Best score | MAX |
| Best accuracy | MAX |
| Best streak | MAX |
| Best valid completion time | MIN |
| Best eligible reaction time | MIN |
| Best valid moves | MIN |
| Sessions | UNION by sessionId |
| Learning events | UNION by event ID |

Do not use timestamps to decide which achievement is "better".

## 24. Eligibility-aware bests
A lower RT is only better if it satisfies that game's accuracy/eligibility rules. Store enough provenance (sessionId, metricVersion, eligibility/context) to validate merged records.

## 25. Level progress
Prefer per-level completion records rather than treating `highestUnlockedLevel` as authoritative:

```json
{
  "1": {"completed": true, "stars": 3},
  "2": {"completed": true, "stars": 2}
}
```

Merge by union/OR and derive highest unlocked progression from campaign rules.

## 26. Level-version changes
Store `levelId` + `levelVersion`. If a level changes materially, preserve historical completion/unlocks where appropriate and explicitly decide whether old best time/moves remain comparable. Never wipe campaign progress silently.

## 27. Counters
Avoid syncing mutable aggregate counters from devices. Derive values such as `gamesPlayed` from unique session IDs where feasible to avoid lost/double-counted increments.

# Sync protocol

## 28. Idempotency
Every push must be safely retryable. Database uniqueness constraints and unique operation/entity IDs prevent duplicate sessions/events/progress.

## 29. Sync exchange
Conceptually:
1. authenticate device
2. push pending operations
3. server applies idempotently/merges
4. server returns remote changes since cursor/revision
5. client semantically merges locally
6. advance cursor
7. remove acknowledged outbox items

Initial pairing may bootstrap full state; normal sync should become incremental.

## 30. Server authority
Server is authoritative for accepted cloud event set, registered/revoked devices, credentials and sync revisions. It is **not** authoritative in a way that blocks local gameplay.

# Initial linking

## 31. Empty device
Pair → download cloud state → merge into empty local store → ready.

## 32. Device already containing progress
Never force `KEEP LOCAL` vs `KEEP CLOUD` when semantic merge is possible:

```text
local + cloud → merge → write merged local → push missing durable records
```

Optionally summarize preserved additions.

## 33. Legacy records
When enabling sync, migrate legacy records lacking UUIDs using a safe one-time strategy while preserving history/bests/levels/benchmark/learning data.

# What syncs

## 34. Sync v1
Sync durable completed progress:
- completed sessions/history
- personal-best provenance
- level completion/stars/bests
- campaign progress
- learning events/mastery
- Benchmark sessions where schema-compatible
- derived/reconstructable baseline data where appropriate

## 35. Device-local in sync v1
Do not sync transient UI/animations/half selections/short active rounds. Cross-device continuation of active games is out of scope. Longer puzzles may continue local autosave exactly as today.

# Minimal backend

## 36. Backend shape
Use a small HTTPS API and relational datastore (PostgreSQL/SQLite-class depending deployment needs). Avoid distributed infrastructure.

Conceptual entities:
- sync identities
- devices
- sessions
- level progress
- learning events
- sync revisions/operations

Possible API concepts:
- create identity
- create pairing token
- pair device
- recover
- sync
- list/rename/revoke devices
- rename profile
- delete cloud data

Prefer a small API; exact REST routes are implementation choices.

# Privacy

## 37. Data minimization
Do not require real name, email, phone, social login, advertising ID, fingerprint, or precise location. Store only anonymous sync identity/device credentials and game progress needed for the feature.

## 38. Logging
Keep operational/security logging minimal with retention policy. Never log recovery secrets, bearer tokens, QR credentials, or full Authorization headers. Do not introduce invasive analytics.

## 39. Delete/disconnect semantics
`Delete Cloud Data` removes server-side identity/progress after confirmation but does not automatically delete local game data.

`Delete Local Data` remains separate and must not silently delete cloud data.

Disconnect/sign-out stops cloud sync and revokes/removes that device credential as appropriate; local progress remains by default.

# Export/import

## 40. JSON backup remains
Cloud sync does not replace Export/Import. Backups contain schema/app metadata and game/progress/history/learning data, but **not cloud bearer credentials or recovery secrets**.

Import on a synced device: validate → migrate → semantic merge local → enqueue missing records → eventually merge cloud. Never blindly replace better progress.

# UX

## 41. Status
Local-only:

```text
Progress stored on this device
[ Enable Sync ]
```

Synced:

```text
☁ Synced
```

Offline:

```text
✈ Offline
Progress saved locally
```

Pending:

```text
☁ 12 changes waiting to sync
```

Failure:

```text
Sync unavailable
Progress is safe on this device
```

Never imply cloud failure means local data loss.

## 42. Settings
Conceptually:

```text
Brain Sync

Profile: Evaggelos [Rename]
Status: ✓ Synced

Devices
Blue
Green
Red

[ Add Device ]
[ Show / Rotate Recovery Code ]
[ Sync Now ]
[ Disconnect This Device ]
[ Delete Cloud Data ]
```

Do not prominently expose raw UUIDs except perhaps Advanced/debug UI.

# Failure behavior

## 43. Server unavailable
Gameplay/save/unlock works; outbox grows; sync status becomes pending/unavailable. No blocking modal.

## 44. Revoked/expired credential
Local Brain continues normally. Settings requests re-pair/recovery. Never delete local progress.

## 45. Invalid remote payload
Reject it and preserve valid local data.

## 46. Partial sync
Idempotency ensures accepted operations remain accepted; unacknowledged ones retry; duplicates are harmless.

## 47. Clock differences
Client timestamps are informational only. They never determine better progress. Server may record receive time.

## 48. Simultaneous devices
Two or more devices may sync concurrently. Uniqueness + semantic merges ensure neither erases the other and subsequent pulls converge.

# Testing

## 49. Local-first tests
Automate:
- network unavailable → games save
- API timeout → local save still succeeds
- Results appear before sync completion
- levels unlock offline
- outbox survives reload/restart
- reconnect drains pending changes

## 50. Merge tests
Test MAX score/stars/accuracy/streak, MIN eligible time/moves, OR completion, UNION sessions/events, including conflicts across 3 devices.

Merge engine should be deterministic and, where practical:

```text
merge(A,B) == merge(B,A)
merge(merge(A,B),C) == merge(A,merge(B,C))
merge(A,A) == A
```

Commutative, associative and idempotent merge behavior is highly desirable.

## 51. Required 3-device scenario
Example:

```text
Blue/iPhone: Mahjong level 37, L30 ★★★
Green/Chrome: Mahjong level 29, L28 ★★★
Red/Firefox: Mahjong level 39, L37 ★★☆
```

After convergence, union all valid completions, derive progression from merged state, preserve L30 ★★★, preserve the best L37 stars, and lose no unique sessions.

## 52. Physical flight acceptance test
1. sync online
2. enable Airplane Mode + Wi-Fi off
3. close/reopen installed PWA
4. play games and complete levels
5. verify local progress
6. close/reopen and reboot while still offline
7. verify progress
8. continue playing
9. restore Internet
10. verify automatic sync
11. open another paired device
12. verify offline-created progress arrives there

Mandatory before production-ready status.

## 53. Pairing/security tests
Test single-use/expiry QR token, recovery success/failure, recovery rotation, distinct new Device ID, revocation, Sync ID alone cannot authenticate, cross-profile access forbidden, malformed/oversized payload rejection, idempotent duplicate operations, secret-free logs, and reasonable pairing/recovery rate limiting.

## 54. Migration tests
Test every supported historical schema fixture. Histories, bests, levels, learning data survive. Failed migration never clears data.

# Implementation phases

## 55. Phase 0 — persistence audit
Before coding sync:
1. inventory every current storage key/schema
2. determine why releases currently appear to lose progress
3. inspect origin/PWA/Safari storage differences
4. identify records needing UUIDs
5. run current tests/build
6. produce `BRAIN-SYNC-AUDIT.md`

Do not refactor games.

## 56. Phase 1 — release-safe local persistence
Implement schemaVersion, sequential migrations, fixtures/tests, stable Device ID, UUIDs for new sessions/events, and remove any destructive reset behavior.

Success: **new releases preserve existing progress**.

## 57. Phase 2 — pure merge engine
Implement/test domain merge rules with synthetic Blue/Green/Red states, no backend.

Success: deterministic convergence and no progress regression.

## 58. Phase 3 — local outbox
Implement durable outbox + mock transport. Offline writes queue, reload preserves queue, mock online drains idempotently.

## 59. Phase 4 — minimal backend
Implement anonymous Sync identity, devices/credentials, sync endpoint, datastore, cursors/revisions and idempotency.

## 60. Phase 5 — pairing/recovery
Implement short-lived QR pairing, recovery code/rotation, device revocation, optional display names.

## 61. Phase 6 — UX/automatic sync
Add subtle status, Sync Now, auto-sync on connectivity/foreground, device management and cloud-delete/disconnect flows.

## 62. Phase 7 — production hardening
Run migration, multi-device, flight/offline/reconnect, API/security, backup/import, and deployment-upgrade tests.

# Out of scope v1

Do not implement:
- username/password accounts
- mandatory email/social login
- public profiles/leaderboards/friends
- cloud-required gameplay
- real-time multi-device sync
- cross-device active short-round continuation
- browser fingerprinting
- analytics/tracking
- whole-profile last-write-wins
- a generic CRDT framework unless explicit domain merge rules prove insufficient

# Coding-agent guardrails

## 63. Preserve games
Do not change game rules, scores, timings, difficulty, level designs, Benchmark definitions, or UX merely to implement sync. Sync adapts to Brain.

## 64. Minimize dependencies
Before adding a dependency, document why it is needed, bundle/server impact, and why existing capabilities are insufficient. Avoid large client sync/state frameworks.

## 65. Audit before implementation
The first deliverable is `BRAIN-SYNC-AUDIT.md`, covering current keys/schemas, suspected release-loss cause, records requiring IDs, proposed canonical schema, compatibility risks, and staged plan.

**After the audit, implement Phase 1 only. Do not build the entire sync backend in one uncontrolled change.**

# Definition of done

## 66. Local persistence
Production release upgrades preserve all supported existing Brain data.

## 67. Offline
With zero connectivity Brain cold-starts, plays, saves sessions, unlocks levels, updates bests, queues sync, and survives close/reopen/reboot.

## 68. Sync
After connectivity returns, pending changes upload, remote changes download, semantic merge occurs, paired devices eventually converge, and no better progress is lost.

## 69. Identity
One immutable Sync ID can own devices named Blue, Green, Red, or anything else; labels never affect identity.

## 70. Recovery
A new device joins through trusted-device QR pairing or recovery code, with no username/password/email.

## 71. Privacy
Brain remains fully usable without Sync. Sync requires no real-world identity. Devices can be revoked and cloud data deleted independently from local data.

# Final v1 decisions

1. Brain remains local-first/offline-first.
2. Cloud sync optional.
3. No username/password/email required.
4. Immutable random Sync ID per profile.
5. Optional mutable profile display name.
6. Immutable random Device ID per installation.
7. Optional mutable/non-unique device labels.
8. Names never participate in identity/merge.
9. Short-lived single-use QR pairing.
10. High-entropy recovery code + rotation.
11. Sync ID alone never authenticates.
12. Revocable credential per paired device.
13. Save locally before any cloud operation.
14. Cloud never blocks Results/progression.
15. Durable offline outbox.
16. Auto-sync when connectivity returns; foreground sync supported.
17. UUID every completed session.
18. UUID learning events where applicable.
19. Whole-profile last-write-wins forbidden.
20. Completed levels = union/OR.
21. Stars/scores/accuracy/streak = MAX.
22. Eligible best time/RT/moves = MIN.
23. Sessions/events = union by UUID.
24. Derive aggregate counters from unique records where feasible.
25. Prefer deriving highest unlocked level from completion state.
26. Level version and schema version are separate.
27. Releases never intentionally clear progress.
28. Sequential migrations + historical fixtures mandatory.
29. Export/import remains.
30. Backups exclude sync secrets.
31. Sync v1 covers durable completed progress, not transient UI.
32. Cross-device active-game continuation out of scope.
33. Device revocation and separate local/cloud deletion supported.
34. No fingerprinting/invasive analytics.
35. Implement staged: audit → local persistence → merge → outbox → backend → pairing → UX → hardening.
36. Pure merge engine heavily tested before backend.
37. Physical iPhone Airplane Mode → reconnect → second-device convergence test mandatory.
38. **Cloud failure must never prevent Brain from launching, playing, completing a game, unlocking a level, or saving progress locally.**
