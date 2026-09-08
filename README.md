# Brain

A small, offline-first suite of quick cognitive games for attention, memory, and reasoning — built
with Vue 3 and Vite, also deployed at brain.ebal.gr. Pick a game from the landing screen; each
keeps its own scoring, history, and personal bests, plus a suite-wide
[Benchmark mode](#benchmark-mode) with [personal baselines](#personal-baseline), an
[Activity dashboard](#activity-dashboard), and full [data export/import](#your-data).

**Brain measures your performance on these specific games, over time** — not general intelligence,
brain health, or clinical cognitive ability. Repeated practice can improve scores just through
familiarity with a task's own mechanics, so a rising score is best read as improved performance on
that particular game, not proof of general cognitive improvement.

| Game | Main focus |
| --- | --- |
| [Stroop Effect Test](#stroop-effect-test) | Inhibition / interference |
| [Schulte Tables](#schulte-tables) | Visual search / attention |
| [Number N-Back](#number-n-back) | Working memory |
| [Sudoku](#sudoku) | Logic / reasoning |
| [SET](#set) | Pattern recognition |
| [Sequence Memory](#sequence-memory) | Visuospatial sequence memory |
| [Switch Trail](#switch-trail) | Cognitive flexibility |
| [Memory Pairs](#memory-pairs) | Visual/spatial associative memory |

Detailed rules, scoring formulas, and design rationale for each game live in its own `*-SPEC.md`
file, linked from each section below.

## Stroop Effect Test

The classic [Stroop effect](https://en.wikipedia.org/wiki/Stroop_effect) task: name the **ink
color** a word is printed in, ignoring what the word says — most trials are deliberately
incongruent (word ≠ ink color), which is what produces the measurable slowdown the test is named
for.

- **Three modes**: Color Match (the classic task), Word Match (the "word reading" control
  condition), and Underline Word (a cued task-switching variant — plays like Color Match, but a
  random fraction of trials flip the target to the word instead).
- **Four difficulty tiers** scaling color count and incongruent ratio together.
- Tracks accuracy, response time, and an interference score (incongruent vs. congruent RT),
  with personal bests and history kept per mode and difficulty.

See [`SPEC.md`](./SPEC.md) for the full design rationale and changelog.

## Schulte Tables

A [Schulte Table](https://en.wikipedia.org/wiki/Schulte_table) visual-search drill: find numbers
1..N² in ascending order on a grid that's generated once per round and never moves — the task
measures scanning and attention, not memory or tracking.

- **Six grid sizes**, 3×3 through 8×8, with 5×5 as the Classic reference difficulty. No round
  timer — a round ends only when the final number is found.
- **Personal bests require a zero-error round** — a fast round full of mistakes can't set a record.
- **Two optional variants**, toggled independently and available at every grid size: **Random
  Color** (a fixed random background per cell) and **Random Position** (numbers reshuffle among
  the still-unsolved cells after every correct tap). Each is tracked separately from Classic.

See [`Schulte-SPEC.md`](./Schulte-SPEC.md) for the full design rationale.

## Number N-Back

Numbers appear one at a time as flipping playing cards: does the current card match the one shown
**N positions earlier** — not just whether it's appeared before at all? The trailing N cards stay
laid out face-down next to the current one, so you can see exactly how far back N is, but their
content is hidden again the moment a newer card arrives — recalling what's under them is still the
whole task, this just makes "how many steps" easier to track than the number itself.

- **Three N levels**, 2-back through 4-back, with 2-back as the Classic reference difficulty.
  Difficulty comes purely from how far back you have to remember, never a larger number pool.
- **Self-paced** — the stimulus waits for your response; no live reaction-time pressure.
- Deliberately generated/validated sequences keep the target-match ratio stable across rounds.
- Score and accuracy are tracked separately from raw hit/miss/false-alarm counts.

See [`NBack-SPEC.md`](./NBack-SPEC.md) for the full design rationale.

## Sudoku

Classic 9×9 Sudoku, rated by an actual **human-technique logical solver** rather than clue count —
Easy/Medium/Hard reflects the hardest technique genuinely required to solve it, never guessing.
Every puzzle is verified to have exactly one solution.

- Easy/Medium generate live off the main thread; **Hard** is served from a small pool of
  pre-vetted puzzles (live generation was impractically slow for that narrow slice of puzzles).
- Notes/pencil-marks with auto-clearing and full undo; immediate mistake-checking with no
  three-strikes fail state — you can always finish the puzzle.
- Unlimited hints, but any hint use disqualifies that solve from the zero-hint **Clean Best** time.
- Autosave & Continue Game; timer auto-pauses and hides the board when the tab is hidden.

See [`Sudoku-SPEC.md`](./Sudoku-SPEC.md) for the full design rationale.

## SET

The classic pattern-recognition card game, rendered entirely with inline SVG (no card images, so
it stays offline-capable for free). Find three cards where every property (number, shape, color,
shading) is all-same or all-different, using the actual mathematical rule rather than a lookup
list.

- Easy/Medium/Hard change only how much help you get on a wrong guess — never the underlying
  math or board-size behavior.
- **Progressive hints**, unlimited but any use disqualifies that game from a new **Clean Best**.
- Autosave & Continue Game, auto-pause on tab-hidden, per-difficulty stats and history.
- No synthetic score — completion time, mistakes, hints, and find time are the primary measurements.

See [`SET-SPEC.md`](./SET-SPEC.md) for the full design rationale.

## Sequence Memory

A "Simon Says"-style visuospatial memory game: watch a sequence of flashes on a 3×3 grid, then tap
the same cells back in order. Each success extends the *same* sequence by one more step — it's
never regenerated — so the game measures how long a pattern you can hold, not luck.

- **Difficulty changes lives and playback speed only**, never grid size, so results stay
  comparable across a session.
- A mistake replays the same sequence (never a new one) if a life remains.
- Cells carry no permanent identity — only temporary flash states — so what's remembered is
  spatial position and order, nothing else.
- **Longest sequence completed** is the primary result and personal-best metric.

See [`Sequence-Memory-SPEC.md`](./Sequence-Memory-SPEC.md) for the full design rationale.

## Switch Trail

A Trail Making-inspired task-switching game: tap spatially scattered targets in alternating order —
`1 → A → 2 → B → 3 → C ...` — before time runs out. Targets are placed once per round and never
move, so the task measures visual search and switching, not memory of where things are.

- **Four difficulties**, the last (Extreme) reshuffling every remaining target's position after
  each correct tap — difficulty comes from density and switching, never tiny targets.
- Seeded rejection-sampling board generation guarantees no overlaps and practical tap targets.
- A wrong tap costs points and flashes red but never ends the round.
- **Optional Random Color variant**, available at every difficulty, tracked separately.

See [`Switch-Trail-SPEC.md`](./Switch-Trail-SPEC.md) for the full design rationale.

## Memory Pairs

A classic emoji Concentration/Memory Match game: flip two face-down tiles at a time and find every
matching pair, on a board generated once and never changed — the task measures visual memory and
spatial recall, not tracking a moving target.

- **Five difficulties** scaling purely through how many tile locations you have to remember —
  never tiny tiles or a shorter mismatch delay.
- Score rewards completion, fewer Moves, and fewer Mistakes; a mismatch is both an extra Move
  *and* a Mistake, so it costs more than random guessing is worth.
- **Move Efficiency** (theoretical-minimum Moves ÷ actual Moves) is tracked separately from Score.
- Autosave & Continue Game — pausing cancels any in-flight selection without penalty.

See [`Memory-Pairs-SPEC.md`](./Memory-Pairs-SPEC.md) for the full design rationale.

## Benchmark Mode

Standardized, fixed-difficulty runs of seven of the eight games, reachable via **Run a Benchmark**
below the game grid — so a result from today is genuinely comparable to one from months ago, not
just a personal best set on whatever difficulty you happened to pick that day. Starting a benchmark
bypasses each game's own difficulty picker entirely and locks the configuration: Stroop (Medium,
Color Match), Schulte (5×5 Classic), N-Back (2-Back), SET (Medium), Sequence Memory (Medium),
Switch Trail (Medium, 16 targets), Memory Pairs (Medium, 8 pairs).

- **Sudoku is deliberately excluded.** Puzzle-to-puzzle difficulty genuinely varies even within one
  labeled tier — a Hard puzzle needing quads is a measurably different task from one only needing
  pairs — so a fixed "Sudoku benchmark" would mostly measure which specific puzzle you got, not
  your performance on a repeatable task.
- **A benchmark run also counts as a normal play session** in that game's own history, stats, and
  personal bests — nothing about normal recording is suppressed or altered; the session is simply
  *additionally* written to a separate benchmark history.
- Every benchmark session is stamped with a `benchmarkVersion`, so if these fixed configurations
  ever change, old and new benchmark results can never be silently mixed into the same comparison.

## Metric Versioning

The same idea extended to ordinary (non-benchmark) play: every newly written history entry also
carries a per-game `metricVersion` (currently `1` for every game — nothing's measurement
definition has changed yet) plus the `appVersion` that recorded it. If a game's score formula or
measurement definition is ever changed meaningfully, that game's version in
`src/constants/metricVersions.js` gets bumped, so old- and new-definition sessions never get
silently averaged together. Older entries that predate this field simply don't have it and are
treated as version 1 for backwards compatibility — nothing is rewritten or migrated.

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
  today-vs-baseline. Every trend stat shows the sample size it's based on (`n=`), so a change
  based on 3 sessions is never confused with one based on 40.

Deliberately **not** a unified cross-game score, and no invented population percentiles. A short
note on the page itself makes clear these numbers describe performance on specific tasks over
time, not a general or diagnostic claim about cognitive ability — and that repeated practice can
improve scores through task familiarity alone, independent of anything else changing.

## Your Data

Reachable via **Manage Your Data**, since this app has no account and no backend of its own to
recover data from if the browser's storage is ever cleared:

- **Export All Data (JSON)** — a complete backup (history, stats, personal bests, benchmark
  history, and any in-progress game) across every game, versioned via `schemaVersion` so a future
  export format change can never be silently misread as an older one. Individual history entries
  also carry a per-game `metricVersion` (see [Metric versioning](#metric-versioning) below), which
  survives export/import untouched since the whole entry is copied verbatim.
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
actual game math and generation logic across all eight games (trial/board/sequence generation,
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

> **Don't expose this dev server on a public host.** It never serves a Service Worker (`main.js`
> skips registration under `vite dev`), so none of the PWA/offline support applies, and a
> `git pull` + `docker compose down && up` cycle is the only way to pick up new code. Worse, if that
> same origin ever *did* serve a production build at some point (e.g. a manual `npm run build &&
> npm run preview` test), browsers that registered its Service Worker then will keep serving that
> old cached build forever — the dev server never sends a new one to replace it. For a real
> deployment, build a static artifact and serve it (e.g. an on-demand `builder` service running
> `npm run build`, feeding an always-on `nginx:alpine` serving `./dist`) instead of running the dev
> server as "production."

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

All eight games live in one Vue app, picked from a landing screen (`GameChooser.vue`) in `App.vue`.
Stroop's files stay flat under `components/`/`composables/`/`constants/`; the other seven each live
in their own subfolder, so filenames that repeat across games (`MainMenu.vue`, `GameScreen.vue`,
`useScoreHistory.js`, ...) never collide. Benchmark Mode, the Activity dashboard, and Data
Management are cross-cutting (not per-game), so their components/composables stay top-level
alongside `GameChooser.vue`. Every tested module has a co-located `*.test.js` (omitted below —
see [Tests](#tests)).

```
brain/
├── SPEC.md
├── Schulte-SPEC.md
├── NBack-SPEC.md
├── Sudoku-SPEC.md
├── SET-SPEC.md
├── Sequence-Memory-SPEC.md
├── Switch-Trail-SPEC.md
├── Memory-Pairs-SPEC.md
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
    │   ├── AboutBrain.vue           # About — what Brain is, scientific-modesty note
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
    │   ├── switchtrail/              # Switch Trail
    │   │   ├── MainMenu.vue
    │   │   ├── AboutPage.vue
    │   │   ├── HistoryPage.vue
    │   │   ├── GameScreen.vue
    │   │   ├── ResultsScreen.vue
    │   │   ├── TrailBoard.vue
    │   │   └── TrailTarget.vue
    │   └── memorypairs/              # Memory Pairs
    │       ├── MainMenu.vue
    │       ├── AboutPage.vue
    │       ├── HistoryPage.vue
    │       ├── GameScreen.vue
    │       ├── ResultsScreen.vue
    │       ├── MemoryBoard.vue
    │       └── MemoryTile.vue
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
    │   ├── switchtrail/
    │   │   ├── trailSequence.js     # pure: 1-A-2-B... sequence generation per difficulty
    │   │   ├── trailLayout.js       # pure, seedable: rejection-sampling board placement
    │   │   ├── scoring.js           # pure: score + transition-time stats
    │   │   ├── useSwitchTrailGame.js # countdown/playing/paused state machine, timing, pause/resume
    │   │   └── useSwitchTrailStats.js # per-difficulty best score/time, stats + history
    │   └── memorypairs/
    │       ├── memoryDeck.js        # pure, seedable: emoji selection + deck shuffle
    │       ├── scoring.js           # pure: score + Move Efficiency
    │       ├── useMemoryPairsGame.js # countdown/playing/paused state machine, tile matching, timing
    │       ├── useMemoryPairsStorage.js # autosave / Continue Game
    │       └── useMemoryPairsStats.js  # per-difficulty best score/time/efficiency, stats + history
    └── constants/
        ├── benchmark.js             # Benchmark Mode: fixed per-game config + benchmarkVersion
        ├── metricVersions.js        # per-game metricVersion numbers, see Metric Versioning above
        ├── colors.js                # Stroop: color palette, difficulty tiers, game modes
        ├── cellColors.js            # shared Random Color palette + WCAG-style contrast picker (Schulte, Switch Trail)
        ├── schulte/
        │   ├── difficulties.js      # Schulte: grid sizes per difficulty
        │   └── variants.js          # Schulte: Classic/Color/Position/Color+Position variant keys
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
        ├── switchtrail/
        │   ├── difficulties.js      # Switch Trail: target count + time limit per difficulty
        │   └── variants.js          # Switch Trail: Classic/Random Color variant keys
        └── memorypairs/
            ├── difficulties.js      # Memory Pairs: grid/pairs/base score per difficulty
            └── emoji.js             # Memory Pairs: the local emoji pool (no remote images)
```

## License

[MIT](./LICENSE)
