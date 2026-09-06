# Brain — Improvement Plan

Companion to `AUDIT.md`. Phase 1 is done (this pass). Phases 2–7 are proposals — each needs your
go-ahead before work starts; none are implemented yet. Ordered so each phase's output is usable on
its own and a prerequisite for the next, not a big-bang rewrite.

---

## Phase 1 — Correctness + cleanup (DONE this pass)

**Goal**: fix what's actually broken and what's objectively stale, touch nothing else.

**Implemented**:
- SET: fixed the SVG pattern-id collision causing all striped cards to render with one card's
  stripe color (`src/components/set/SetCard.vue`).
- Stroop + Schulte: added `visibilitychange`-driven time-anchor correction so backgrounding the
  tab mid-round no longer injects bogus elapsed time into stored RT/interval/completion-time stats
  (`src/composables/useStroopGame.js`, `src/components/GameScreen.vue`,
  `src/composables/schulte/useSchulteGame.js`, `src/components/schulte/GameScreen.vue`). No new UI
  — this is invisible during normal play.
- Stroop: History page's "Best" tile now reads the real persisted best instead of approximating
  from the capped 20-round display window (`src/components/HistoryPage.vue`).
- Sequence Memory: fixed `highestLevel` off-by-one after a Continue-Game resume
  (`src/composables/sequence-memory/useSequenceMemory.js`).
- Stale facts corrected: `package.json` name, PWA manifest description (3 games → 6),
  README clone URL/directory name (old repo name → `brain`).

**Files affected**: 8 (listed above).
**Storage changes**: none — no schema/key changes, no migration needed.
**Tests**: none exist yet (see Phase 2) — changes were verified by direct code reading plus
tracing the exact invariants each fix depends on (documented in `AUDIT.md`).
**Migration concerns**: none.
**Offline/PWA implications**: none — no new network dependency, no new precached asset, PWA
manifest content changed (description text only, not structure).

---

## Phase 2 — Test infrastructure + deterministic unit tests

**Goal**: close the gap between "the specs assume this is testable" and "zero tests exist."

**Proposed approach**: add Vitest (zero-config with Vite, no new build tooling). No component/DOM
testing framework needed yet — the highest-value target is pure game-logic modules, most of which
are already framework-free functions (`sequenceGenerator.js`, `setValidator.js`, `setFinder.js`,
`deck.js`, `sudokuSolver.js`, `difficultyRater.js`, `nback/sequence.js`) or composables that can be
tested by calling their returned functions directly without mounting a component.

**Priority test targets** (highest value first):
1. Stroop: interference calculation, median RT, trial generation (congruent ratio holds over N runs).
2. Schulte: board generation (every number 1..N² exactly once), median/avg search time exclusion
   of wrong taps.
3. N-Back: `validateSequence()`'s own self-check, hit/miss/false-alarm/correct-rejection
   classification against hand-built fixtures.
4. Sudoku: `countSolutions` uniqueness, `difficultyRater` technique classification against known
   puzzles.
5. SET: 81-card deck completeness, `isSet`/`findCompletingCard` against exhaustive pair checks,
   `findAllSets` correctness on small fixed boards.
6. Sequence Memory: `extendSequence` no-consecutive-duplicate invariant, retry-replays-same-array.
7. Whatever the common session model (Phase 3) and import/export (Phase 4) end up needing.

**Files likely affected**: `package.json` (add `vitest` devDependency + `test` script),
`vite.config.js` (test config block or a separate `vitest.config.js`), new `*.test.js` files
alongside the modules above.
**Storage changes**: none.
**Migration concerns**: none.
**Offline/PWA implications**: none — dev/build-time only.

---

## Phase 3 — Common session-metadata model

**Goal**: a shared shape for "a session happened," additive alongside each game's existing
detailed history — not a replacement, not a universal score.

**Proposed shape** (matches the brief):

```js
{
  id,            // stable per-session id
  game,          // 'stroop' | 'schulte' | 'nback' | 'sudoku' | 'set' | 'sequence-memory'
  difficulty,
  sessionType,   // 'play' | 'benchmark' (Phase 5 introduces 'benchmark')
  startedAt,
  completedAt,
  duration,
  completed,     // false for an abandoned/lost session
  primaryMetric, // the game's own headline number — completionTime, longestSequence, score, etc.
  accuracy,      // null where not applicable
  medianRT,      // null where not applicable
  mistakes,
  hints,         // null where not applicable (Stroop/Schulte/N-Back have no hint concept)
}
```

Each game keeps writing its own detailed history exactly as it does now; this is a second,
parallel write (or a derived read — see below) that exists purely to support suite-wide views
(Phase 6) without forcing six different metric shapes into one schema.

**Open design question worth deciding before implementation**: write this as a genuinely separate
record at completion time (simple, but two sources of truth to keep in sync), or derive it
on-demand from each game's existing history when the Activity page reads it (single source of
truth, but requires a small per-game adapter function). Leaning toward the derive-on-demand
approach — it can't drift out of sync with the detailed history, and each adapter is a small, pure
function (`toSessionSummary(rawEntry) => CommonSession`) rather than a new write path threaded
through six games.

**Files likely affected**: one new adapter module per game (or one file with six small exported
functions), no changes to existing storage composables.
**Storage changes**: none, if derive-on-demand is chosen. A new `localStorage` key per game
(`<game>:sessions`) if written separately instead.
**Tests required**: one test per adapter function against a real history entry shape.
**Migration concerns**: none if derived; none needed even if written separately (purely additive,
old history format untouched).
**Offline/PWA implications**: none.

---

## Phase 4 — Data export / import / delete-all

**Goal**: the highest-priority feature per the project's own local-first philosophy — right now a
cleared browser profile, a private-mode session, or a new device is unrecoverable data loss.

**Export** (JSON):
```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-09-06T12:00:00.000Z",
  "appVersion": "1.0.0",
  "data": {
    "stroop": { "history": {...}, "best": {...} },
    "schulte": { "history": {...}, "best": {...} },
    "nback": { "history": {...}, "best": {...} },
    "sudoku": { "history": [...], "stats": {...}, "active": {...} },
    "set": { "history": [...], "stats": {...}, "active": {...} },
    "sequenceMemory": { "history": [...], "stats": {...}, "active": {...} }
  }
}
```
Effectively a structured dump of every `localStorage` key this app owns, namespaced to mirror the
existing key prefixes so a round-trip export→import is lossless.

**CSV export**: a flattened view of each game's *history* (not stats/active-game state, which
don't make sense as rows) — one CSV per game, or one combined CSV with a `game` column and only
the fields common across games populated. Given the common-session model from Phase 3 exists by
this point, CSV export is naturally "export the common session list" plus an optional per-game
detailed CSV.

**Import**: validate `schemaVersion` and required top-level fields before writing anything —
reject with a clear, specific error (not a generic "invalid file") on a schema mismatch, a future
schema version this build doesn't understand, or missing required fields. Offer **Merge** (append
history, keep the better of two "best"/"active" records) vs **Replace** (wipe first) vs **Cancel**,
per the brief — Merge is more complex (needs per-game merge logic, not just per-key overwrite) and
could ship as a fast-follow after Replace if that's a meaningful scope difference once designed.

**Delete All Data**: explicit confirmation (type-to-confirm or a double-tap-style confirmation,
not just a single "Are you sure?" button — this is irreversible). Clears every `localStorage` key
this app owns; must not unregister the Service Worker or otherwise break the installed PWA itself.

**Files likely affected**: a new top-level "Data" or "Settings" screen reachable from
`GameChooser.vue` or a new corner button in `App.vue`; a new shared module (not per-game) that
knows the full list of localStorage keys/prefixes across all six games, since export/import/delete
are the one place a cross-game shared utility genuinely earns its keep.
**Storage changes**: none to existing keys — export/import operate on them as-is.
**Tests required**: round-trip export→import produces byte-identical `localStorage` state;
reject-on-bad-schema-version; reject-on-missing-required-field; Merge logic once designed.
**Migration concerns**: `schemaVersion` exists from day one specifically so a future format change
doesn't have to guess what an old export means.
**Offline/PWA implications**: none — this is pure client-side file I/O (`Blob`/`<a download>` for
export, `<input type="file">` + `FileReader` for import), no network involved either way.

---

## Phase 5 — Benchmark mode

**Goal**: standardized, fixed configurations per game so results are comparable session-to-session,
kept structurally separate from normal Play.

**Proposed fixed configs** (subject to your review — these are starting proposals, not final):
- Stroop: Medium (6 colors, 60s, 65/35 mix) — Easy is too undemanding to show interference
  reliably at only 30s; Hard/Very Hard's higher incongruent ratio makes the *task* harder but
  doesn't obviously make it a *better benchmark*, just a harder one.
- Schulte: 5×5 (already the suite's own designated "Classic, reference difficulty").
- N-Back: 2-back (already the suite's own designated "Classic, reference difficulty").
- SET: Medium (matches the existing convention of Medium being the least-assisted "normal"
  reference point — Easy explains failures, Hard removes visual assistance entirely, which adds a
  UI-familiarity variable on top of the cognitive one being measured).
- Sequence Memory: Medium (2 lives, normal speed).
- **Sudoku: excluded.** Puzzle-to-puzzle difficulty genuinely varies even within one labeled tier
  (a Hard puzzle needing quads is a measurably different task from one only needing pairs) —
  a Sudoku "benchmark" would actually be measuring which specific puzzle you got, not your
  performance on a fixed task. Forcing it in would make the benchmark less trustworthy, not more
  complete. Worth revisiting only if a future puzzle-difficulty *sub-score* (not just Easy/Medium/
  Hard) becomes precise enough to hold constant.

**Versioning**: `benchmarkVersion: 1` stored on every benchmark session record from day one, so a
future config change (e.g. deciding Stroop's benchmark should be Hard instead of Medium) doesn't
silently mix incompatible historical results — a version bump is a hard line, not a footnote.

**Files likely affected**: one new benchmark-config constants file; a "Benchmark" entry point
alongside (not replacing) `GameChooser.vue`; each game's `GameScreen.vue` needs to accept a
"benchmark mode" flag that pins the difficulty and tags the resulting session with
`sessionType: 'benchmark'` before it's saved — this reuses each game's existing engine unchanged,
it's purely a difficulty-lock + tagging layer on top.
**Storage changes**: benchmark sessions need to be stored separately from ordinary play history
(new key(s), e.g. `<game>:benchmark-history`) so Play results never silently feed a benchmark
baseline (Phase 6) or vice versa.
**Tests required**: benchmark config is actually locked (can't start a benchmark session at a
non-benchmark difficulty), `benchmarkVersion` is stamped on every benchmark record.
**Migration concerns**: none yet (v1 is the starting version) — the versioning exists precisely so
future migrations have a clean line to reason from.
**Offline/PWA implications**: none.

---

## Phase 6 — Personal baseline

**Goal**: "current performance vs. your own baseline," never "vs. a population" — there is no
normative dataset and none should be fabricated.

**Proposed rule**: minimum 3 benchmark sessions per game before a baseline exists at all; baseline
= median of each game's primary benchmark metric (+ secondary metrics where the brief specifies
them — e.g. N-Back's median accuracy *and* median RT, not just one). Before 3 sessions, show
"Play N more benchmark rounds to establish your baseline" rather than a baseline computed from 1–2
noisy data points.

**Files likely affected**: a baseline-calculation module per game (or one generic
median-over-benchmark-history function reused by all six, since the shape is the same once Phase 5
exists), a small UI surface on each game's Results/History screen showing current-vs-baseline.
**Storage changes**: baseline itself can be derived on-demand from benchmark history (same
derive-vs-store tradeoff as Phase 3) — recommend deriving, not storing, so it's never stale.
**Tests required**: the 3-session minimum gate, median calculation, "not enough data yet" state.
**Migration concerns**: none.
**Offline/PWA implications**: none.

---

## Phase 7 — Longitudinal statistics / Activity dashboard

**Goal**: a suite-wide Statistics/Activity page — the payoff phase that everything else built
toward.

**Proposed views**: 7 / 30 / 90 days / All time, per the brief. **Proposed stats**: games played,
active days, current streak, sessions per game, personal baseline, rolling median (preferred over
plain average per the brief), recent-vs-baseline delta, a simple robust variance measure (median
absolute deviation, computed the same way across all games since it's metric-agnostic), best
result, most recent result.

**Explicitly not doing**: a unified "Brain Score" across games, fake population percentiles, or
any framing beyond "your performance on these six specific tasks, over time."

**Also this phase**: the two pieces of copy the brief asked for but weren't added unilaterally in
Phase 1 — drafted below for your review, not yet placed:

> **Privacy** (proposed, for README and/or an in-app About/Settings screen): "No account. No
> backend. No analytics. No tracking. Your game history and performance data stay on this device —
> nothing is ever sent anywhere."

> **Practice effects** (proposed, for the README and/or a Baseline/Statistics screen where it's
> most relevant): "Results are best read as your performance on these specific tasks over time,
> not a general measure of cognitive ability. Repeated practice can improve scores just through
> familiarity with a task's mechanics — that's expected, and part of why comparing against your
> own baseline matters more than the raw number."

Both are short, non-alarming, and match the "modest, not diagnostic" positioning the audit
confirmed the app already has (no medical/IQ/diagnostic language exists anywhere currently to walk
back — these are additions, not corrections).

**Files likely affected**: new Activity/Statistics top-level screen, reachable from
`GameChooser.vue`; consumes Phase 3's common session model + Phase 6's baseline calculations —
this phase is why those two exist.
**Storage changes**: none new — purely a read/aggregation layer over what Phases 3–6 already
produce.
**Tests required**: rolling median and MAD calculations, streak calculation (including the
timezone edge case of "what counts as the same day"), each date-range filter boundary.
**Migration concerns**: none.
**Offline/PWA implications**: none — this page needs to work fully offline like everything else,
and since it only reads local data it naturally does.

---

## Explicitly deferred, no timeline

**IndexedDB migration**: not recommended at all under current or foreseeable data volume (see
`AUDIT.md` Persistence section — worst-case total storage is well under 100KB). Revisit only if a
future phase's design genuinely needs something `localStorage` can't do (e.g., querying across
thousands of entries), which nothing proposed above requires.
