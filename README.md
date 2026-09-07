# Cognitive Test Suite

A browser-based set of quick cognitive tests and puzzles, built with Vue 3 and Vite: a landing
screen lets you pick between them, and each keeps its own scoring, history, and personal bests —
plus a suite-wide [Benchmark mode](#benchmark-mode) with [personal baselines](#personal-baseline),
an [Activity dashboard](#activity-dashboard), and full [data export/import](#your-data).

## Stroop Effect Test

The classic [Stroop effect](https://en.wikipedia.org/wiki/Stroop_effect) task. You're shown a
color name rendered in an ink color and must click the swatch matching the **ink color**, ignoring
what the word says — most trials are deliberately incongruent (word ≠ ink color), which is what
produces the measurable slowdown the test is named for.

- **Two game modes**: Color Match (tap the ink color — the classic task) and Word Match (tap what the word says — the "word reading" control condition, which shows much less interference).
- **Four difficulty tiers** that scale on two axes at once — more color choices and a higher incongruent ratio:

  | Difficulty | Colors | Duration | Incongruent / Congruent mix |
  | --- | --- | --- | --- |
  | Easy | 4 | 30 s | 50% / 50% |
  | Medium | 6 | 60 s | 65% / 35% |
  | Hard | 8 | 60 s | 80% / 20% |
  | Very Hard | 10 | 90 s | 90% / 10% |

- **End-of-round stats**: accuracy, average/median response time (correct trials only), interference score (avg RT<sub>incongruent</sub> − avg RT<sub>congruent</sub>, correct trials only, shown once at least 5 valid trials of each type exist), and a speed/accuracy-weighted total score.
- **Score history**: the last 20 rounds per mode + difficulty, with a sparkline trend, stored in the browser via `localStorage` — no backend, no login.
- **About / How to Play** page: rule explanation, congruent/incongruent examples, a full reference of every in-game color, and a live untimed practice trial.
- Mobile-first layout with large tap targets.

See [`SPEC.md`](./SPEC.md) for the full design rationale and changelog.

## Schulte Tables

A [Schulte Table](https://en.wikipedia.org/wiki/Schulte_table) visual-search and attention drill:
find numbers 1..N² in ascending order on a square grid, as fast as you can. The grid is generated
once per round and never moves — the task measures scanning and attention, not memory or tracking.

- **Six grid sizes**: 3×3 (Easy) through 8×8 (Extreme), with 5×5 (1–25) as the Classic,
  reference difficulty.
- **No round timer** — a round ends only when the final number is found; the running clock is
  purely informational.
- **End-of-round stats**: completion time (the primary metric), errors, accuracy, average/median
  search time between consecutive correct picks, and fastest/slowest search.
- **Personal bests require a zero-error round** — a fast round full of mistakes can't set a record.
- **Score history**: the last 20 rounds per difficulty, with a completion-time sparkline, stored in `localStorage`.
- **About / How to Play** page with a static example and an untimed practice board.

See [`Schulte-SPEC.md`](./Schulte-SPEC.md) for the full design rationale.

## Number N-Back

A continuous working-memory task: numbers appear one at a time, and for each one (after N unscored
setup stimuli) you decide whether it matches the number shown **N positions earlier** — not just
whether it's appeared before.

- **Four N levels**: 1-back (Easy) through 4-back (Very Hard), with 2-back as the Classic,
  reference difficulty. Difficulty comes purely from how far back you have to remember, not from
  a larger number pool (always 1–9).
- **Self-paced** — the stimulus waits for your response; no live reaction-time pressure (RT is
  measured but hidden during play and doesn't affect score).
- **Deliberately generated sequences**: ~30% of scored trials are real n-back matches, targets are
  placed and validated before play so the ratio is stable and accidental matches can't sneak in.
- **End-of-round summary split into Performance** (score, accuracy) **and N-Back Metrics** (hits,
  misses, false alarms, correct rejections, average/median correct RT), kept visually separate on
  purpose.
- **Personal bests**: highest score, tied-broken by accuracy then lower median RT, tracked
  separately per N level.
- **Score history**: the last 20 rounds per N level, with score *and* accuracy trend sparklines.
- **About / How to Play** page with a 2-back walkthrough and untimed 1/2/3-back practice.

See [`NBack-SPEC.md`](./NBack-SPEC.md) for the full design rationale.

## Sudoku

Classic 9×9 Sudoku, rated by an actual **human-technique logical solver** rather than clue count —
a puzzle is Easy/Medium/Hard based on the hardest technique genuinely required to solve it (naked
and hidden singles → pairs, locked candidates → triples and quads), and generation rejects anything
that would need guessing or expert-tier techniques (X-Wing, Swordfish, forcing chains — explicitly
out of scope). Every puzzle is verified to have exactly one solution.

- **Easy and Medium generate live**, off the main thread in a Web Worker, and are consistently
  fast. **Hard** is served from a small pool of pre-vetted puzzles bundled with the app — live
  generation measured real attempts taking well over a minute in the worst case (genuinely
  "needs triples/quads but nothing harder" is a narrow slice of the puzzle space), so Hard puzzles
  are generated once, offline, verified with the same solver, and shipped as a static asset — the
  approach the spec itself allows for exactly this situation.
- **Notes (pencil marks)**: candidates auto-clear from every peer cell (row/column/box) when a
  value is correctly placed; Undo restores both the value and any notes it auto-cleared, without
  ever rewinding the timer, mistake count, or hint count.
- **Immediate mistake checking** — a wrong entry flashes and counts against you but is never
  placed; there's no three-strikes fail state, you can always finish the puzzle.
- **Hints** are unlimited but disqualify that solve from the **Clean Best** time (zero-hint solves
  only), tie-broken by fewer mistakes.
- **Autosave & Continue Game** — the active puzzle (including notes and full undo history)
  survives a refresh or closed tab; starting a new puzzle over an unfinished one asks first.
- **Timer pauses automatically** when the tab is hidden or Pause is tapped, and hides the board
  while paused so you can't keep studying it.
- Stats tracked per difficulty (started/completed/streaks/clean solves/avg+median time) plus a
  combined, difficulty-filterable history of the last 30 completed puzzles.

See [`Sudoku-SPEC.md`](./Sudoku-SPEC.md) for the full design rationale.

## SET

The classic pattern-recognition card game, rendered entirely with inline SVG (no card images —
keeps it offline-capable for free). Every card has four independent properties (number, shape,
color, shading), each with three values; three cards form a SET only if *every* property is either
all the same or all different across them, using the actual mathematical rule rather than a
maintained list.

- Start with 12 cards; if none of them form a SET, 3 more are dealt automatically (repeatedly, if
  needed) — the board can temporarily grow to 15, 18, or more before shrinking back toward 12 as
  SETs are found.
- **Easy** explains exactly which property failed on a wrong guess; **Medium** just says "Not a
  SET"; **Hard** drops the explanation and visual assistance, without changing the underlying math
  or board-size behavior.
- **Progressive hints**: 1st press highlights one card of a real SET on the board, 2nd press a
  second card, 3rd reveals the complete SET — unlimited, but any hint use disqualifies that game
  from a new **Clean Best** time.
- **Autosave & Continue Game**, auto-pause on tab-hidden (board hidden while paused), and
  per-difficulty stats/streaks plus a combined, filterable history of the last 30 games — the same
  conventions as Sudoku.
- No synthetic score — completion time, SETs found, mistakes, hints, and median find time are the
  primary measurements.

See [`SET-SPEC.md`](./SET-SPEC.md) for the full design rationale.

## Sequence Memory

A "Simon Says"-style visuospatial memory game: watch a sequence of flashes on a 3×3 grid, then tap
the same cells back in the same order. Each success extends the *same* sequence by one more step —
it's never regenerated — so the game measures how long a pattern you can hold, not luck.

- **Difficulty changes lives and playback speed only** — Easy (3 lives, slow), Medium (2 lives,
  normal), Hard (1 life, faster) — never the grid size or how fast playback speeds up as you climb
  levels, so results stay comparable across a session.
- **A mistake replays the exact same sequence** (never a new one) if a life remains — only running
  out of lives ends the game.
- **Cells carry no permanent identity** — no colors, numbers, or icons — only temporary flash
  states, so what's being remembered is spatial position and order, nothing else.
- **Pausing (manual or tab-hidden) always restarts the current level from its playback**, never
  mid-sequence, and never costs a life — interruptions like a phone call are never penalized.
- **Autosave & Continue Game**, per-difficulty stats/streaks, and a combined, filterable history
  with a Longest-Sequence trend — the same conventions as Sudoku/SET.
- **Longest sequence successfully completed** is the primary result and personal-best metric, tied
  broken by fewer mistakes, then higher accuracy, then lower median tap time.

See [`Sequence-Memory-SPEC.md`](./Sequence-Memory-SPEC.md) for the full design rationale.

## Switch Trail

A Trail Making-inspired task-switching game: tap spatially scattered targets in alternating order —
`1 → A → 2 → B → 3 → C ...` — before the time limit expires. Targets are placed once per round with
random (non-overlapping) positions and never move, so the task measures visual search, sequencing,
and switching between numbers and letters, not memory of where things are.

- **Three difficulties**: Easy (12 targets / 30s), Medium (16 / 45s), Hard (24 / 90s) — difficulty
  comes from target density and switching, not tiny circles or poor contrast.
- **Rejection-sampling board generation** guarantees no overlaps, readable labels, and practical
  mobile tap targets; layouts support an internal deterministic seed for reproducibility/testing.
- **A wrong tap costs points and flashes red** but never ends the round or resets progress — only
  running out of time or completing every target ends a round.
- **Score rewards both speed and accuracy**: +100 per correct target, −50 per error, a
  remaining-time bonus and a +250 clean-completion bonus on a fully completed trail (incomplete
  rounds get no time bonus), floored at 0.
- **Best Score and Best Completion Time tracked separately** per difficulty, plus per-target
  transition timing (average/median/fastest/slowest, and number→letter vs. letter→number direction).
- **Pausing (tab-hidden) hides the board and shows Resume/Restart/Quit**, with a fresh 3-2-1 before
  the board reappears — time spent hidden never counts against the round.
- **About / How to Play** page with an untimed six-target practice trail.

See [`Switch-Trail-SPEC.md`](./Switch-Trail-SPEC.md) for the full design rationale.

## Benchmark Mode

Standardized, fixed-difficulty runs of six of the seven games, reachable via **Run a Benchmark**
below the game grid — so a result from today is genuinely comparable to one from months ago, not
just a personal best set on whatever difficulty you happened to pick that day. Starting a benchmark
bypasses each game's own difficulty picker entirely and locks the configuration: Stroop (Medium,
Color Match), Schulte (5×5 Classic), N-Back (2-Back), SET (Medium), Sequence Memory (Medium),
Switch Trail (Medium, 16 targets).

- **Sudoku is deliberately excluded.** Puzzle-to-puzzle difficulty genuinely varies even within one
  labeled tier — a Hard puzzle needing quads is a measurably different task from one only needing
  pairs — so a fixed "Sudoku benchmark" would mostly measure which specific puzzle you got, not
  your performance on a repeatable task.
- **A benchmark run also counts as a normal play session** in that game's own history, stats, and
  personal bests — nothing about normal recording is suppressed or altered; the session is simply
  *additionally* written to a separate benchmark history.
- Every benchmark session is stamped with a `benchmarkVersion`, so if these fixed configurations
  ever change, old and new benchmark results can never be silently mixed into the same comparison.

## Personal Baseline

Once a game has **at least 3 recorded benchmark sessions**, a baseline exists: the median of that
game's primary benchmark metric (completion time, score, or longest sequence, depending on the
game). Every benchmark run after that shows a comparison against your own history *before* that
run — e.g. `Baseline (n=5): 2.5s — Today: 2.1s (+16.0% better)` — never a population average and
never another player, since no such dataset exists or is fabricated. Before 3 sessions exist, the
banner tells you how many more are needed instead of computing a "baseline" from 1–2 noisy results.

## Activity Dashboard

A suite-wide view, reachable via **Activity**, of how much you've actually played and how your
benchmark performance is trending — filterable to the last 7/30/90 days or all time.

- **Overview**: current activity streak (consecutive days played — still counted through yesterday
  if you haven't played yet today, so a live streak never looks broken before the day is even
  over), games played, active days, and total sessions.
- **Sessions by Game**: a per-game session-count breakdown for the selected range.
- **Benchmark Performance**: per game (Sudoku excluded, same reasoning as Benchmark Mode above) —
  your baseline, rolling median, a consistency measure (median absolute deviation, i.e. how much
  your results vary, not just where they land), your best result, most recent result, and
  today-vs-baseline.

Deliberately **not** a unified cross-game score, and no invented population percentiles. A short
note on the page itself makes clear these numbers describe performance on specific tasks over
time, not a general or diagnostic claim about cognitive ability — and that repeated practice can
improve scores through task familiarity alone, independent of anything else changing.

## Your Data

Reachable via **Manage Your Data**, since this app has no account and no backend of its own to
recover data from if the browser's storage is ever cleared:

- **Export All Data (JSON)** — a complete backup (history, stats, personal bests, benchmark
  history, and any in-progress game) across every game, versioned via `schemaVersion` so a future
  export format change can never be silently misread as an older one.
- **Export History (CSV)** — a flattened, spreadsheet-friendly view of every session across every
  game.
- **Import** — restore from a previously exported JSON file. Shows a preview (how many records,
  broken down by game) before anything is written, and a choice between **Merge** (combines
  history from both, keeps your current device's stats/bests on any conflict) and **Replace**
  (wipes existing data first). Rejects anything that isn't a recognizable export, with a specific
  reason why.
- **Delete All Data** — permanently erases everything this app has stored on this device. Gated
  behind typing `DELETE` to confirm, since it can't be undone.

## Offline / installable (PWA)

The whole suite is installable as a Home Screen app (iOS/Android/desktop) and works fully offline
once installed — no network dependency exists for gameplay in the first place (no fonts, CDNs,
analytics, or API calls anywhere in the app), so the entire app shell (HTML/JS/CSS/icons/manifest)
just gets precached by a Service Worker and served from cache afterward. All `localStorage` data
(scores, history, stats, an in-progress Sudoku) works identically offline, since it was never
network-backed.

This only applies to a **production build** (`npm run build`, served via `npm run preview` or
similar) — `npm run dev` intentionally serves no Service Worker, so local development is unaffected.
Installing on a physical phone additionally requires the page to be served over a real HTTPS secure
context (a browser-enforced rule, not a setting) — see §10 of [`SPEC.md`](./SPEC.md) for the details
and the reasoning behind each choice.

## Installation

### Requirements

- [Node.js](https://nodejs.org/) 20+ and npm — for local development.
- [Docker](https://www.docker.com/) and Docker Compose — optional, if you'd rather not install Node locally (see below).

### From source

```bash
git clone https://github.com/ebal/brain.git
cd brain
npm install
```

## Usage

### Local development

```bash
npm run dev
```

Starts the Vite dev server (with hot reload) — open the printed local URL in your browser.

### Production build

```bash
npm run build   # outputs static files to ./dist
npm run preview # serve the build locally to sanity-check it
```

### Tests

```bash
npm test
```

Runs the automated test suite ([Vitest](https://vitest.dev/)) — deterministic unit tests for the
actual game math and generation logic across all seven games (trial/board/sequence generation,
validators, difficulty classification, scoring, statistics), plus the shared session model,
Benchmark, and Baseline logic. No component/DOM testing yet — everything covered so far is plain
JS logic, testable without mounting a Vue component. Each tested module has a co-located
`*.test.js` file next to it.

### Docker (dev server, no build step)

Runs the Vite dev server itself inside the container, directly against the bind-mounted source,
with full hot-reload — no Node install on the host, no build, no rebuild step.

```bash
docker compose up
```

Open `http://localhost:5173` — edit any file and the browser updates instantly. Stop with
`docker compose stop`.

Note this runs Vite's own dev server (unminified, dev-only tooling) rather than serving an
optimized production build — fine for local/personal use, but if you ever want a hardened
production deployment (e.g. nginx serving a minified `npm run build` output), that's a deliberate
step back up in complexity this repo no longer ships out of the box; `npm run build && npm run
preview` (below) is the closest built-in equivalent.

#### File ownership

The container bind-mounts the whole project and writes into it (`node_modules`, `.npm-cache`), so
it runs as `${DOCKER_UID:-1000}:${DOCKER_GID:-1000}` instead of root — otherwise those files would
end up root-owned on your host. The default (`1000:1000`) matches the first regular user on most
single-user Linux installs; if your account uses a different UID/GID, set it once in a local `.env`
file (already gitignored, so it stays machine-specific):

```bash
printf "DOCKER_UID=%s\nDOCKER_GID=%s\n" "$(id -u)" "$(id -g)" > .env
```

Compose picks up `.env` automatically from then on — no need to pass anything on the command line.

## Project structure

All seven games live in one Vue app, picked from a landing screen (`GameChooser.vue`) in `App.vue`.
Stroop's files stay flat under `components/`/`composables/`/`constants/`; the other six each live
in their own subfolder, so filenames that repeat across games (`MainMenu.vue`, `GameScreen.vue`,
`useScoreHistory.js`, ...) never collide. Benchmark Mode, the Activity dashboard, and Data
Management are cross-cutting (not per-game), so their components/composables stay top-level
alongside `GameChooser.vue`. Every tested module has a co-located `*.test.js` (omitted below —
see [Tests](#tests)).

```
stroop/
├── SPEC.md
├── Schulte-SPEC.md
├── NBack-SPEC.md
├── Sudoku-SPEC.md
├── SET-SPEC.md
├── Sequence-Memory-SPEC.md
├── AUDIT.md                         # repository audit — findings, what was/wasn't changed
├── IMPROVEMENT-PLAN.md              # phased plan this audit led to (this app's own changelog of sorts)
├── docker-compose.yml
├── package.json
├── vite.config.js
├── vitest.config.js
├── index.html
├── public/                          # PWA icons (see Offline / PWA support below)
└── src/
    ├── main.js
    ├── App.vue                      # top-level: game chooser + every game's/feature's screen state
    ├── components/
    │   ├── GameChooser.vue          # landing screen — pick a game
    │   ├── BenchmarkMenu.vue        # Benchmark Mode — fixed-config entry point per game
    │   ├── ActivityDashboard.vue    # Activity dashboard — engagement + benchmark performance
    │   ├── DataManagement.vue       # Your Data — export/import/delete
    │   ├── MainMenu.vue             # Stroop
    │   ├── AboutPage.vue
    │   ├── HistoryPage.vue
    │   ├── GameScreen.vue
    │   ├── ResultsScreen.vue
    │   ├── ColorButton.vue
    │   ├── schulte/                 # Schulte Tables
    │   │   ├── MainMenu.vue
    │   │   ├── AboutPage.vue
    │   │   ├── HistoryPage.vue
    │   │   ├── GameScreen.vue
    │   │   ├── ResultsScreen.vue
    │   │   └── SchulteCell.vue
    │   ├── nback/                   # Number N-Back
    │   │   ├── MainMenu.vue
    │   │   ├── AboutPage.vue
    │   │   ├── HistoryPage.vue
    │   │   ├── GameScreen.vue
    │   │   ├── ResultsScreen.vue
    │   │   └── ResponseButtons.vue
    │   ├── sudoku/                  # Sudoku
    │   │   ├── MainMenu.vue
    │   │   ├── AboutPage.vue
    │   │   ├── HistoryPage.vue
    │   │   ├── GameScreen.vue
    │   │   ├── ResultsScreen.vue
    │   │   ├── SudokuBoard.vue
    │   │   ├── SudokuCell.vue
    │   │   ├── NumberPad.vue
    │   │   └── GameControls.vue
    │   ├── set/                     # SET
    │   │   ├── MainMenu.vue
    │   │   ├── AboutPage.vue
    │   │   ├── HistoryPage.vue
    │   │   ├── GameScreen.vue
    │   │   ├── ResultsScreen.vue
    │   │   ├── SetBoard.vue
    │   │   └── SetCard.vue           # inline-SVG card rendering — no images
    │   ├── sequence-memory/         # Sequence Memory
    │   │   ├── MainMenu.vue
    │   │   ├── AboutPage.vue
    │   │   ├── HistoryPage.vue
    │   │   ├── GameScreen.vue
    │   │   ├── ResultsScreen.vue
    │   │   ├── MemoryGrid.vue
    │   │   └── MemoryCell.vue
    │   └── switchtrail/              # Switch Trail
    │       ├── MainMenu.vue
    │       ├── AboutPage.vue
    │       ├── HistoryPage.vue
    │       ├── GameScreen.vue
    │       ├── ResultsScreen.vue
    │       ├── TrailBoard.vue
    │       └── TrailTarget.vue
    ├── composables/
    │   ├── mathStats.js             # avg/median — shared by every game's results/stats calc
    │   ├── sessionModel.js          # common session shape, derived on-demand from each game's history
    │   ├── benchmarkHistory.js      # separate, versioned storage for Benchmark Mode sessions
    │   ├── baseline.js              # personal baseline: median of benchmark history, 3-session minimum
    │   ├── activityStats.js         # Activity dashboard: date-range filtering, streaks, MAD, per-game performance
    │   ├── dataPortability.js       # export (JSON/CSV) / import (merge or replace) / delete-all
    │   ├── useStroopGame.js         # Stroop: trial generation, timer, scoring
    │   ├── useBestScores.js
    │   ├── useScoreHistory.js
    │   ├── schulte/
    │   │   ├── useSchulteGame.js    # board generation, timing, selection validation
    │   │   ├── useBestTimes.js
    │   │   └── useScoreHistory.js
    │   ├── nback/
    │   │   ├── sequence.js          # pure, seedable sequence generation + validation
    │   │   ├── useNBackGame.js      # stimulus progression, timing, classification, scoring
    │   │   ├── useBestScores.js
    │   │   └── useScoreHistory.js
    │   ├── sudoku/
    │   │   ├── sudokuSolver.js      # grid validity, full-grid generation, uniqueness checking
    │   │   ├── difficultyRater.js   # human-technique solver — the actual difficulty classifier
    │   │   ├── sudokuGenerator.js   # carves + classifies a puzzle for a requested difficulty
    │   │   ├── generator.worker.js  # runs generation off the main thread
    │   │   ├── useSudokuGenerator.js # promise-based wrapper around the worker
    │   │   ├── useSudokuGame.js     # selection, input, notes, undo, mistakes, hints, timer/pause
    │   │   ├── useSudokuStorage.js  # autosave / Continue Game
    │   │   └── useSudokuStats.js    # per-difficulty stats + combined history
    │   ├── set/
    │   │   ├── deck.js              # createDeck/shuffleDeck — pure, no Vue
    │   │   ├── setValidator.js      # isSet / findCompletingCard / firstFailingProperty
    │   │   ├── setFinder.js         # findAllSets (internal — never exposed during play)
    │   │   ├── useSetGame.js        # selection, board expansion/replenish, hints, timer/pause
    │   │   ├── useSetStorage.js     # autosave / Continue Game
    │   │   └── useSetStats.js       # per-difficulty stats + combined history
    │   ├── sequence-memory/
    │   │   ├── sequenceGenerator.js # pure, seedable sequence generation (no consecutive repeats)
    │   │   ├── useSequenceMemory.js # playback/input state machine, lives, timer/pause
    │   │   ├── useMemoryStorage.js  # autosave / Continue Game
    │   │   └── useMemoryStats.js    # per-difficulty stats + combined history
    │   └── switchtrail/
    │       ├── trailSequence.js     # pure: 1-A-2-B... sequence generation per difficulty
    │       ├── trailLayout.js       # pure, seedable: rejection-sampling board placement
    │       ├── scoring.js           # pure: score + transition-time stats
    │       ├── useSwitchTrailGame.js # countdown/playing/paused state machine, timing, pause/resume
    │       └── useSwitchTrailStats.js # per-difficulty best score/time, stats + history
    └── constants/
        ├── benchmark.js             # Benchmark Mode: fixed per-game config + benchmarkVersion
        ├── colors.js                # Stroop: color palette, difficulty tiers, game modes
        ├── schulte/
        │   └── difficulties.js      # Schulte: grid sizes per difficulty
        ├── nback/
        │   ├── difficulties.js      # N-Back: N per difficulty, scored-trial counts
        │   └── colors.js            # N-Back: stimulus color palette (cycled, never repeats consecutively)
        ├── sudoku/
        │   ├── difficulties.js      # Sudoku: difficulty labels
        │   └── hardPool.json        # pre-vetted Hard puzzles (see above)
        ├── set/
        │   └── cardProperties.js    # SET: property names/colors, difficulty labels
        ├── sequence-memory/
        │   └── difficulties.js      # Sequence Memory: lives + flash/gap timing per difficulty
        └── switchtrail/
            └── difficulties.js      # Switch Trail: target count + time limit per difficulty
```

## License

[MIT](./LICENSE)
