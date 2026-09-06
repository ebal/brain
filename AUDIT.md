# Brain — Repository Audit

Scope: all six games (Stroop, Schulte, N-Back, Sudoku, SET, Sequence Memory), shared persistence,
PWA/offline config, docs, and build. Read-only investigation first; fixes applied afterward are
noted inline and summarized at the end.

Method: full read of every SPEC, every Vue component, every composable, every constants file;
grep-based sweep for network calls, `Date.now()` vs `performance.now()` usage, localStorage key
namespacing, and history caps; a full `npm run build`.

---

## Executive Summary

The suite is in good shape. Every game's core game-logic (deck/board/sequence generation,
validators, difficulty classifiers, scoring formulas) checked out correct against its own SPEC —
no rigged RNG, no biased trial generation, no wrong classification logic anywhere. The two real
defects worth fixing are narrow and isolated: a rendering bug in SET (all striped cards render
with the same stripe color) and a measurement-integrity gap in the two oldest games (Stroop,
Schulte) that never got the tab-visibility handling every later game has. Everything else found is
either already correct (much of the checklist below is "confirmed correct," not a defect list) or
a small, low-stakes edge case worth knowing about but not urgent.

The privacy/offline/local-first claims hold up: zero network calls anywhere in `src/`, all timing
uses `performance.now()` (never `Date.now()` for measurement — only for ID strings), and
`localStorage` keys are cleanly namespaced per game with no collisions.

**No automated tests exist anywhere in the repo** — `package.json` has no `test` script, no test
framework is installed, and there isn't a single `*.test.js` file. Notably, `NBack-SPEC.md` itself
says "deterministic seeded generation supported internally for testing" — the spec anticipated
tests that were never written. This isn't a bug, but it's the single biggest gap between the
project's own stated intent and what exists.

---

## Critical Issues (P0)

### P0-1 — SET: all striped cards render with the same (wrong) stripe color

`src/components/set/SetCard.vue:53-54`:

```js
let instanceCounter = 0
const patternId = `set-stripe-${instanceCounter++}`
```

This sits inside `<script setup>`, which re-executes fresh for every component instance — so
`instanceCounter` is redeclared at `0` every time, and every single `SetCard` computes the exact
same `patternId` (`"set-stripe-0"`). With 2+ striped cards visible at once (~1/3 of all cards are
striped, so this happens on nearly every real board), the SVG document ends up with multiple
`<pattern id="set-stripe-0">` elements, and `fill="url(#set-stripe-0)"` on every striped card
resolves to whichever one the browser matches — in practice, all striped cards on screen render
using **one card's** stripe color, not their own.

This directly undermines the "color" property's visual distinctness, a core mechanic (correctly
identifying a SET depends on visually distinguishing red/green/purple). It also affects the About
page's static examples and untimed practice board, which use the same component.

**Failure scenario**: deal a 12-card board; if two or more striped cards of different colors are
present (near-certain), they render as identical stripe colors, making them visually
indistinguishable by color while `isSet()`'s underlying math still correctly treats them as
different colors. A player can be visually misled on a mechanic the game's whole design depends on.

**Fix applied**: replaced with a module-scope counter (declared in a plain, non-`setup` `<script>`
block, which runs once per module load, not once per instance) so each card gets a genuinely
unique, monotonically increasing id. This is the standard Vue SFC idiom for "needs a stable
per-instance-unique id" and avoids `useId()`'s colon-containing output (which is unnecessary risk
inside a `fill="url(#...)"` attribute value).

---

## Measurement / Methodology Issues (P1)

### P1-1 — Stroop and Schulte have no tab-visibility handling; backgrounding corrupts stored stats

Every game added after these two (Sudoku, SET, Sequence Memory) pauses when the tab is hidden.
Stroop and Schulte — the two oldest games — never got this. Both use `performance.now()`
correctly, which is exactly the problem: `performance.now()` keeps advancing in a backgrounded tab
regardless of what a `setInterval`-driven visible countdown does, so any elapsed-time calculation
anchored to a `performance.now()` snapshot taken before backgrounding silently includes the entire
backgrounded wall-clock gap once the user returns and acts.

- **Stroop** (`src/composables/useStroopGame.js:53,93`): `trialStartTime = performance.now()` is
  set when a trial is generated; `rt = performance.now() - trialStartTime` is computed on answer.
  Backgrounding the tab mid-trial and returning later injects that entire gap into `rt` for that
  one trial — a multi-minute "reaction time" gets averaged into `avgResponseTime`,
  `medianResponseTime`, and the interference score, then written permanently to score history.
  There is no outlier filtering anywhere in the pipeline to catch this after the fact.
- **Schulte** (`src/composables/schulte/useSchulteGame.js:73,88-99,111`): worse, because
  `completionTime` — Schulte's *primary, headline metric* — is `now - roundStartTime`, a single
  anchor set once at round start and never adjusted. Backgrounding at any point during an
  open-ended round (Schulte has no round timer) inflates the final completion time by the entire
  hidden duration, and also corrupts whichever single `interval` (search-time-between-picks)
  spanned the hidden period. Both are stored in history and shown on the results screen.

This can't silently create a false personal-best (inflated time makes the round *look slower*, not
faster, so `useBestTimes`' zero-error/fastest-time gate is never wrongly beaten) — but it does
produce a visibly wrong, misleading number in history that has no way to be identified or
excluded after the fact, and it's a real Sudoku/SET/Sequence-Memory-vs-Stroop/Schulte
inconsistency in how seriously the suite treats measurement integrity.

**Fix applied**: rather than bolting on a new "Paused" UI state (a bigger, more visible product
decision than this pass is meant to make — see Recommended Improvements), both composables now
shift their internal time anchors forward by however long the tab was actually hidden, using the
existing `document.visibilitychange` event exactly like the other three games already listen for.
The effect is invisible during normal play — no new screen, no new button — but background time no
longer leaks into any stored statistic. Stroop shifts `trialStartTime`; Schulte shifts
`roundStartTime` and `lastCorrectTime`. The round/trial timers players actually watch
(`timeLeft`, `elapsedMs`) already self-correct reasonably well because browsers throttle
`setInterval` while hidden — this fix targets the one thing that doesn't self-correct: the
`performance.now()`-anchored measurement math.

### P1-2 — Stroop: History page's "Best" tile shows the wrong number

`src/components/HistoryPage.vue:91`:

```js
const bestScore = computed(() => Math.max(...history.value.map((h) => h.score)))
```

This computes "best" from whatever's in the capped last-20-rounds rolling window — it never reads
the real persisted best from `useBestScores` (which `HistoryPage.vue` doesn't even import). Once a
player has logged more than 20 rounds and their actual best round ages out of the window, the
History page's "Best" tile silently understates the true personal best still shown correctly on
the Results screen after a new round — two different, disagreeing numbers under the same
unqualified "Best" label, with no indication either could be wrong.

**Failure scenario**: play 25 rounds at Easy/Color, with the best score in round 3. Play 22 more
mediocre rounds. History's "Best" tile now shows the best of only the last 20 rounds (excludes
round 3's true best), while `ResultsScreen`/`useBestScores` still correctly know the real best.

**Fix applied**: `HistoryPage.vue` now imports `useBestScores` and reads the real persisted best
for the active mode/difficulty instead of recomputing an approximation from the display window.

### P1-3 — Sequence Memory: `highestLevel` off by one after a Continue-Game resume, if the resumed attempt is then lost

`src/composables/sequence-memory/useSequenceMemory.js:163`:

```js
highestLevel.value = Math.max(saved.level, 1)
```

`saved.level` is the level **currently being attempted**, not the last one actually completed —
`level` only advances (in `handleLevelSuccess`) after a level is won. The invariant that holds
everywhere else in this composable is `highestLevel === level - 1` (with a floor of `1` for the
very first attempt, before any success) — resume breaks that invariant by reusing `saved.level`
directly instead of `saved.level - 1`.

**Failure scenario**: complete levels 1–4, level 5 begins and autosaves (`level: 5` in the
snapshot). Close the app. Reopen via Continue Game, then lose all remaining lives on level 5
without ever completing it. Final results report **"Highest Level 5"** even though level 5 was
never actually completed — only level 4 was.

Notably, the adjacent `longestSequence` calculation on the same line block (`saved.sequence.length
- 1`) is *not* a bug — sequence length grows by exactly 1 per completed level, so that subtraction
is mathematically exact. `highestLevel` needed the same `- 1` treatment and didn't get it.

**Fix applied**: `Math.max(saved.level - 1, 1)`.

---

## Bugs — confirmed correct (checked, not defects)

Documented here because the audit brief asked what's already solid, not just what's broken:

- **Stroop**: congruent/incongruent generation, interference formula (gated at ≥5 trials/side),
  median RT, fixed per-difficulty button positions, `performance.now()`-only RT measurement,
  practice-demo isolation from real storage.
- **Schulte**: board built once and never reshuffled after generation, zero-error best-time gate
  enforced before write, true Fisher-Yates shuffle, wrong-tap handling, practice-demo isolation.
- **N-Back**: hit/miss/false-alarm/correct-rejection truth table, exact 30% target ratio with a
  pre-play `validateSequence()` self-check, unscored setup stimuli never scored/targeted,
  `performance.now()`-only RT restricted to scored trials, synchronous double-answer guard,
  genuinely self-paced (no hidden fixed-rate timeout), practice-mode isolation.
- **Sudoku**: real `countSolutions(puzzle, 2) !== 1` uniqueness check (not assumed), difficulty
  technique lists exactly match spec/README (no X-Wing/Swordfish/forcing chains present),
  hint-disqualifies-Clean-Best logic (and undo deliberately does *not* refund the hint count — an
  initial "looks like a bug" that on inspection matches SPEC §10 exactly), timer pause/resume
  accumulation traced across multiple cycles with no drift, undo restores exact prior notes state,
  autosave fires after every mutating action, history capped at exactly 30.
- **SET**: full 81-card deck (no dupes/gaps), Fisher-Yates shuffle, `isSet`/`findCompletingCard`
  mod-3 logic, exhaustive `findAllSets`-based no-SET-on-board detection and board growth,
  progressive hints drawn from a real existing SET, `useSetGame(onChange)` correctly wired to
  autosave in `GameScreen.vue`, history capped at 30, practice-demo isolation.
- **Sequence Memory**: `extendSequence` correctly appends exactly one non-consecutive-duplicate
  cell without mutating the prior array, mistakes replay the byte-identical sequence array (never
  regenerated), pause/resume always restarts the current level cleanly from its intro, tap-timing
  measurement, `useSequenceMemory(onChange)` correctly wired to autosave, history capped at 30.
- **Cross-cutting**: zero network calls anywhere in `src/` (verified by grep — no `fetch`, `axios`,
  `XMLHttpRequest`, `WebSocket`, analytics/telemetry SDKs); every localStorage key is cleanly
  namespaced per game (`stroop:`, `schulte:`, `nback:`, `sudoku:`, `set:`, `sequence-memory:`) with
  no collisions; history caps match documentation exactly (20 for Stroop/Schulte/N-Back, 30 for
  Sudoku/SET/Sequence Memory); production build is clean with no warnings.

---

## Minor / Edge-Case Findings (P2 — not fixed in this pass, flagged for a decision)

- **Sudoku** (`useSudokuGame.js:115`): `resumeFromSave()` always sets `status = 'playing'`
  immediately, even if the puzzle was saved while paused — Continue Game never re-shows the PAUSED
  overlay for a puzzle closed mid-pause. Likely fine (opening the app and tapping Continue is
  itself an explicit resume) but was never a deliberate decision.
- **Sudoku** (`GameScreen.vue:166-174`): if `continueGame: true` is passed but `getActive()`
  returns `null` (a race between the menu's "Continue" button appearing and the save being
  cleared elsewhere), the screen never starts a puzzle and never shows an error — it falls into
  the default template branch and renders an empty all-zero board with no clues and no way out
  except the browser back gesture. Rare, but a real dead-end.
- **SET** (`useSetGame.js:214-218`): `pause()` doesn't cancel a pending `feedbackTimeoutId` — a
  mistake/valid-SET feedback timeout keeps running in the background during a pause and can fire
  (clearing selection, calling `onChange`) while the game is nominally frozen. Cosmetic, no data
  loss.
- **N-Back** (`useNBackGame.js:53`): `nextStimulusColor()` uses `Math.random()`, not the seeded
  RNG used for the actual scored sequence. Harmless — color isn't a measured variable — but
  technically means "deterministic seeded generation" doesn't extend to 100% of what's on screen.
- **General**: no `beforeunload`/`pagehide` handler anywhere. `visibilitychange` (tab hidden)
  already covers the realistic mobile-backgrounding case for Sudoku/SET/Sequence Memory's
  autosave, but a hard-kill immediately after an explicit Resume (with no other action in between)
  could persist an `elapsedTime` that's stale by however long the resumed-but-idle period lasted.
  Narrow and low-stakes.
- **SET / Sequence Memory**: a ~500ms–1.4s window exists where closing the app *during* a
  deferred feedback/result timeout (valid-SET removal, level-success/mistake resolution) can lose
  that specific transition's persistence — same structural cause the `onChange` callback pattern
  already solves for the common case, just an unavoidable few-hundred-millisecond gap at the
  boundary.

---

## Architecture

Sound and consistent. Per-game subfolder isolation avoids the filename collisions the project
explicitly designed around; the `useXGame(onChange)` callback pattern (added for SET, carried
forward into Sequence Memory) correctly distinguishes games with async/delayed state resolution
from games where a synchronous post-action `autosave()` wrapper is sufficient (Sudoku). No
over-engineering, no premature abstraction — six games' worth of near-identical persistence
plumbing (`useXStorage.js`, `useXStats.js`) is duplicated rather than unified behind a shared
helper, which is the right call for a project this size (see Recommended Improvements for where a
*thin, additive* shared layer would help without forcing games together).

## Persistence

All `localStorage` access is wrapped in try/catch (private-mode/quota-exceeded fails silently
rather than throwing). Storage volume is trivial: 30-entry history caps × 6 games, each entry a
small flat JSON object (a few hundred bytes at most) — worst case is comfortably under 100KB
total, nowhere near `localStorage`'s typical 5–10MB per-origin limit. **No migration to IndexedDB
is warranted** — see Recommended Improvements/Phase 9 discussion.

## PWA / Offline

Confirmed sound: Service Worker precaches the entire built app shell (16 entries, ~347KB), no
runtime network dependency exists for gameplay, all `localStorage` data works identically offline.
One real drift found and fixed (see Documentation Drift): the PWA manifest's `description` field in
`vite.config.js` still said *"Stroop Effect Test, Schulte Tables, and Number N-Back —
offline-capable"* — three games out of date, and this string is what iOS/Android surface in the
"Add to Home Screen" / install-app dialog, so it's user-visible, not just internal docs.

**Not independently verified this pass**: physical-device installation and a genuine airplane-mode
cold-start-and-play cycle (Phase 11 of the brief). What *was* verified: a clean `npm run build`,
correct precache manifest generation, and (from earlier sessions building each game) headless
browser checks of gameplay and localStorage persistence — but not on a real iPhone, and not with
Wi-Fi/cellular actually disabled. Flagging this explicitly rather than claiming device testing that
didn't happen.

## Documentation Drift

Fixed in this pass (all are objectively-stale facts, not judgment calls):

- `package.json`: `"name": "stroop-test"` → `"brain"` (private package, no registry impact, purely
  internal — but the repo, both git remotes, and every recent commit message now say "brain").
- `vite.config.js`: PWA manifest `description` updated to mention all six games instead of three.
- `README.md`: "From source" clone instructions still pointed at
  `https://github.com/ebal/Stroop-Effect-Test.git` / `cd Stroop-Effect-Test` — both remotes were
  renamed to `brain` since. Updated to `https://github.com/ebal/brain.git` / `cd brain`.

**Deliberately left alone** (see Things That Should NOT Be Changed):

- `SPEC.md` §10's changelog line "all three games" — this is a dated historical changelog entry
  describing the state of the project *when PWA support was added*, not a live claim. Rewriting
  history in a changelog to match the present would make the changelog less useful, not more
  accurate.
- `Schulte-SPEC.md` documents 5 grid sizes; the app now has 6 (Extreme 8×8 was added later, see
  commit `b17b5c7`). Same reasoning — this is expected, additive spec drift matching how `SPEC.md`
  itself already handles evolution via an explicit changelog section, not an inconsistency that
  needs correcting by editing the original design doc.
- The overall app name/branding ("Cognitive Test Suite" in the README `<h1>` and PWA manifest
  `name`/`short_name`) was **not** changed, despite the repo now being called `brain`. Renaming the
  user-facing product name is a product decision, not a documentation-drift fix — see Recommended
  Improvements.

## Recommended Improvements

Roughly in priority order; none of these were implemented in this pass — see
`IMPROVEMENT-PLAN.md` for how they'd be broken into phases.

1. **Add a test framework and deterministic unit tests for game math** (Vitest is the natural
   choice — zero-config with Vite, already a dev dependency's sibling project). Highest-value
   targets: Stroop interference/median calc, Schulte board/timing calc, N-Back
   generation/classification (the spec already assumes this is testable), Sudoku uniqueness +
   difficulty rating, SET deck/validator/finder, Sequence Memory generation/retry/stats,
   import/export validation (once it exists). This closes the single biggest gap between stated
   intent and reality.
2. **Common session-metadata model** for suite-wide history/analytics, additive alongside (not
   replacing) each game's existing detailed metrics.
3. **Data export/import/delete** — the highest-priority feature per the project's own local-first
   philosophy: right now, a cleared browser profile or a new device is unrecoverable data loss with
   no way to back up or migrate.
4. **Benchmark mode** and **personal baseline** — both require the common session model as a
   prerequisite; Sudoku's puzzle-to-puzzle difficulty variance genuinely makes it a poor fit for a
   short standardized benchmark (a Hard puzzle needing quads is measurably different from one that
   only needs pairs) — recommend excluding Sudoku from Benchmark mode rather than forcing it in.
5. **Explicit Privacy and Practice-Effects wording** in the README/About pages — the brief asked
   for both; drafted, ready-to-add copy is included in `IMPROVEMENT-PLAN.md` rather than added
   directly, since exact tone/wording is worth a look before it becomes permanent user-facing text.
6. **App branding decision** (keep "Cognitive Test Suite," or move to "Brain" /
   "Personal Cognitive Performance Lab" as the brief suggests) — deliberately left as an open
   question rather than decided unilaterally.
7. Small P2 edge cases listed above (Sudoku dead-end continue state, SET pause not canceling a
   pending timeout, etc.) — worth batching into a small cleanup pass once the bigger items are
   settled, not urgent enough to justify touching now.

## Things That Should NOT Be Changed

- The per-game subfolder architecture and duplicated-but-isolated persistence composables — this
  is the right amount of structure for six small games, not under- or over-engineered.
  Unifying them behind a shared abstraction before Benchmark/Baseline actually need one common
  shape would be premature.
- `SPEC.md`'s and `Schulte-SPEC.md`'s historical/changelog content describing a prior state of the
  app (see Documentation Drift above) — these are records of design decisions at a point in time,
  not living specs that need to track the current game count.
- Each game's own primary metric and scoring approach — the brief is explicit that a universal
  "Brain Score" is not wanted, and nothing found in this audit suggests otherwise.
- Sudoku's undo-doesn't-refund-hint-count behavior — confirmed intentional (matches SPEC §10)
  despite looking, on first read, like a bug.
- localStorage as the storage layer — current volume is nowhere near a scale that benefits from
  IndexedDB; migrating now would add real complexity for zero present benefit.

## Proposed Implementation Order

See `IMPROVEMENT-PLAN.md` for the full phase breakdown. Summary:

1. ~~Correctness + cleanup~~ — **this pass**: P0 SET rendering bug, P1 Stroop/Schulte
   visibility-integrity gap, P1 Stroop History "Best" bug, P1 Sequence Memory resume off-by-one,
   stale `package.json`/PWA-manifest/README facts.
2. Test infrastructure (Vitest) + deterministic unit tests for existing game math.
3. Common session-metadata model (additive).
4. Data export / import / delete-all.
5. Benchmark mode (fixed configs, `benchmarkVersion`, Sudoku excluded with reasoning).
6. Personal baseline (≥3 benchmark sessions, median-based).
7. Longitudinal statistics / activity dashboard.

Each of phases 2–7 needs your sign-off before work starts, per the brief.
