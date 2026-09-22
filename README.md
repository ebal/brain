# Brain

![Brain landing screen](docs/screenshots/brain_00_intro.png)

Brain is a small collection of offline cognitive games for attention, memory, visual search,
reasoning and pattern recognition. The idea: instead of opening social media when you have a few
minutes free, open Brain and play a small game instead.

It's a Vue 3 + Vite app. Also deployed at brain.ebal.gr. Pick a game from the landing screen; each
keeps its own scoring, history and personal bests. There's also a suite-wide
[Activity dashboard](#activity-dashboard) and full [data export/import](#your-data).

**Brain measures your performance on these specific games, over time.** It isn't a measure of
general intelligence, brain health or clinical cognitive ability, and doesn't claim to be.
Repeated practice can raise a score just from getting familiar with a task's mechanics, so a rising
score means better performance on that particular game, not proven improvement in general
cognition. Activity always compares you against your own past results, never a population average
or another player.

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
| [Marble Jump](#marble-jump) | Planning / spatial reasoning |
| [Mental Rotation](#mental-rotation) | Spatial reasoning / visualization |
| [Emoji Mahjong](#emoji-mahjong) | Visual search / planning |
| [Number Match](#number-match) | Numerical search / planning |
| [Odd One Out](#odd-one-out) | Visual discrimination / attention |
| [Target Tap](#target-tap) | Sustained attention / reaction speed |
| [Tower of Hanoi](#tower-of-hanoi) | Planning / sequential problem solving |
| [Lights Out](#lights-out) | Spatial planning / cause-and-effect |
| [Whack-a-Mole](#whack-a-mole) | Spatial attention / reaction speed |

Detailed rules, scoring formulas and design rationale for each game live in its own `*-SPEC.md`
file, linked from each section below.

## Stroop Effect Test

![Stroop Effect Test](docs/screenshots/brain_01_stroop.png)

The classic [Stroop effect](https://en.wikipedia.org/wiki/Stroop_effect) task: name the **ink
color** a word is printed in, not what the word says. Most trials are deliberately incongruent,
which is what produces the measurable slowdown the test is named for.

- Three modes: Color Match (the classic task), Word Match (the reading-control condition), and
  Underline Word (a task-switching variant of Color Match where a random fraction of trials flip
  the target to the word).
- Four difficulty tiers, scaling color count and incongruent ratio together.
- Tracks accuracy, response time and an interference score (incongruent RT minus congruent RT).
  Personal bests and history are kept per mode and difficulty.

See [`SPEC.md`](./specs/SPEC.md) for the full design rationale and changelog.

## Schulte Tables

![Schulte Tables](docs/screenshots/brain_02_schulte.png)

A [Schulte Table](https://en.wikipedia.org/wiki/Schulte_table) visual-search drill: find numbers 1
to N² in order on a grid that's generated once and never moves. It measures scanning and
attention, not memory.

- Six grid sizes, 3×3 through 8×8, with 5×5 as the Classic reference difficulty. No round timer;
  a round just ends when the last number is found.
- Personal bests require a zero-error round, so a fast run full of mistakes can't set a record.
- Two optional variants, toggled independently at any grid size: **Random Color** (a random
  background color per cell) and **Random Position** (numbers reshuffle among unsolved cells after
  every correct tap). Each is tracked separately from Classic.

See [`Schulte-SPEC.md`](./specs/Schulte-SPEC.md) for the full design rationale.

## Number N-Back

![Number N-Back](docs/screenshots/brain_03_nback.png)

Numbers appear one at a time as flipping playing cards: does the current card match the one shown
**N positions earlier**? The trailing N cards stay laid out face-down next to the current one, so
you can see how far back N is, but their value is hidden again as soon as a newer card arrives.
Recalling what's under them is still the actual task.

- Three N levels, 2-back through 4-back, with 2-back as the Classic reference difficulty.
  Difficulty comes from how far back you remember, not a bigger number pool.
- **Extreme** keeps the 2-back distance but swaps numbers for a fixed consonant pool (C, H, K, L,
  Q, R, S, T) over a longer, 70-trial round. Vowels are excluded because they're easier to
  remember than consonants.
- Self-paced: the stimulus waits for your response, no reaction-time pressure.
- Sequences are generated and validated to keep the target ratio stable across rounds.
- Score and accuracy are tracked separately from raw hit/miss/false-alarm counts.

See [`NBack-SPEC.md`](./specs/NBack-SPEC.md) for the full design rationale.

## Sudoku

![Sudoku](docs/screenshots/brain_04_sudoku.png)

Classic 9×9 Sudoku, rated by an actual logical solver rather than clue count. Easy/Medium/Hard
reflects the hardest technique genuinely needed to solve it, not a guess. Every puzzle is verified
to have exactly one solution.

- Easy and Medium generate live in a background worker; Hard is served from a small pool of
  pre-vetted puzzles, since live generation was impractically slow for that difficulty.
- Notes with auto-clearing and full undo. Mistakes are flagged immediately; there's no
  three-strikes fail state, so you can always finish the puzzle.
- Unlimited hints, but using any disqualifies that solve from the zero-hint **Clean Best** time.
- Autosave and Continue Game. The timer pauses and the board hides when the tab goes to the
  background.

See [`Sudoku-SPEC.md`](./specs/Sudoku-SPEC.md) for the full design rationale.

## SET

![SET](docs/screenshots/brain_05_set.png)

The classic pattern-recognition card game, rendered entirely with inline SVG so it stays
offline-capable. Find three cards where every property (number, shape, color, shading) is all the
same or all different, checked against the actual rule rather than a lookup table.

- Four difficulties: Easy (9 cards, explains wrong guesses, starts every board with one free hint
  card revealed), Medium and Hard (12 cards, Hard drops the explanation), and Extreme (15 cards,
  same assistance as Hard). Board size changes; the math never does.
- Progressive hints, unlimited but any use disqualifies a new **Clean Best** (Easy's one free card
  is exempt, so a Clean Best is still reachable there).
- Optional Light Colors toggle for a softer card palette, purely cosmetic.
- A direct exit button with confirmation, available mid-game and not just from Pause.
- Autosave and Continue Game, auto-pause when the tab is hidden, per-difficulty stats and history.
- No synthetic score. Completion time, mistakes, hints and find time are the primary measurements.

See [`SET-SPEC.md`](./specs/SET-SPEC.md) for the full design rationale.

## Sequence Memory

![Sequence Memory](docs/screenshots/brain_06_seq.png)

A "Simon Says"-style memory game: watch a sequence of flashes on a 3×3 grid, then tap the same
cells back in order. Each success extends the same sequence by one step, so it measures how long
a pattern you can hold, not luck.

- Difficulty changes lives and playback speed only, never grid size, so results stay comparable
  across a session.
- A mistake replays the same sequence again, never a new one, as long as a life remains.
- Cells have no permanent identity, only a temporary flash, so what's remembered is position and
  order alone.
- Longest sequence completed is the primary result and personal-best metric.

See [`Sequence-Memory-SPEC.md`](./specs/Sequence-Memory-SPEC.md) for the full design rationale.

## Switch Trail

![Switch Trail](docs/screenshots/brain_07_switch.png)

A Trail Making-inspired task-switching game: tap scattered targets in alternating order (1, A, 2,
B, 3, C...). Targets are placed once per round and never move, so it measures visual search and
switching, not memory of positions.

- Four difficulties. The last, Extreme, reshuffles every remaining target's position after each
  correct tap. Difficulty comes from density and switching, never tiny targets.
- Board generation guarantees no overlapping or impractical targets.
- A wrong tap costs points and flashes red but never ends the round.
- Two independent, combinable variant checkboxes, each tracked separately: **Random Color** (a
  random background color per target) and **Untimed** (added for stress-free play — no clock, no
  live Score, the round just ends whenever the whole trail is completed instead of at a time
  limit).

See [`Switch-Trail-SPEC.md`](./specs/Switch-Trail-SPEC.md) for the full design rationale.

## Memory Pairs

![Memory Pairs](docs/screenshots/brain_08_memory.png)

A classic emoji Concentration game: flip two face-down tiles at a time and find every matching
pair. The board is generated once and never changes, so it measures visual memory and spatial
recall.

- Five difficulties, scaling only through how many tile locations you have to remember, never
  tile size or timing.
- Score rewards completion, fewer Moves and fewer Mistakes. A mismatch counts as both, so it
  costs more than a random guess is worth.
- **Move Efficiency** (the theoretical minimum Moves divided by actual Moves) is tracked
  separately from Score.
- Autosave and Continue Game. Pausing cancels any in-progress selection without penalty.

See [`Memory-Pairs-SPEC.md`](./specs/Memory-Pairs-SPEC.md) for the full design rationale.

## Marble Jump

A single-player peg-solitaire puzzle on a hexagonal/triangular board: jump one marble over an
adjacent marble into the empty hole directly beyond it, removing the jumped marble, until no legal
jumps remain. The goal is to leave as few marbles as possible.

- Four difficulties (Easy/Medium/Hard/Extreme), scaling purely through triangular board size
  (10/15/21/28 holes) — the jump rule itself never changes.
- A small curated set of puzzles per difficulty, each solver-verified so the displayed
  `optimalRemaining` (and the "Optimal!" result) is always a proven minimum, never a guess.
- Score is hidden during play — only Marbles Left, Moves and Time show on the board, matching the
  spec's "test planning, not scoring pressure" intent. Score, Undos and Hints appear on Results.
- Undo (unlimited, exact-state) and Restart (reloads the original puzzle), plus autosave/Continue.
- No in-game Hint in v1 — omitted rather than shipping a weak one.

See [`Marble-Jump-SPEC.md`](./specs/Marble-Jump-SPEC.md) for the full design rationale.

## Mental Rotation

A spatial-reasoning game: see a reference shape and 2-4 candidates, tap the one that's the
reference *rotated*. Mirrored or structurally different candidates are always wrong, even when they
look close at a glance.

- Two round modes: **Timed** (the original — race the round timer, Score rewards speed too) and
  **Untimed** (added for stress-free play — no clock, the round just ends after a fixed number of
  questions, and Score stays hidden until the round is over). Both use the same difficulties,
  shapes and distractors; personal bests and history are tracked separately per mode.
- Four difficulties (Easy/Medium/Hard/Very Hard), scaling via candidate count, shape complexity and
  distractor strength — not rotation-angle variety. All rotation is in clean 90° increments at every
  tier (the spec's own fallback, taken deliberately: correctness over angle variety).
- A curated library of 58 polyomino shapes, generated by enumerating fixed polyominoes and filtering
  to ones that are provably neither rotationally symmetric nor self-reflection-ambiguous, so a
  trial's "one correct answer" is always mathematically guaranteed, never assumed.
- Continuous round: answer, get brief ✓/✕ feedback, next trial, until time (or the question count)
  runs out. Backgrounding the app pauses the round and discards the in-progress trial rather than
  scoring a stale one.
- Accuracy and Median Correct RT are always shown separately from Score, as the more meaningful raw
  measurements.
- A separate untimed, unscored Practice mode (a tiny fixed 3-shape teaching demo on the About page)
  is also still available.

See [`Mental-Rotation-SPEC.md`](./specs/Mental-Rotation-SPEC.md) for the full design rationale.

## Emoji Mahjong

A progressive, 50-level Mahjong Solitaire-style puzzle using emoji instead of traditional tiles:
tap two identical **free** tiles — nothing covers them from above, and at least one horizontal
side is open — to remove them, until the board is cleared.

- 50 deterministic levels (not a difficulty picker): clearing a level — legally, not necessarily
  perfectly — unlocks the next, and every level stays replayable afterward from a numbered
  level-select grid. The same level always reproduces the exact same puzzle. Levels 1-4 teach one
  rule each as you play (matching, side-blocking, covering, then planning/Undo); Levels 5-50 scale
  gradually from 8 up to 72 tiles and 1 up to 5 stacked layers, with difficulty coming from puzzle
  structure — bottlenecks, dependency depth, how many tiles are free at once — not just tile count.
- Every board is solvable by construction: a full clearing order is built first (any two
  currently-free tiles, geometry only), then emoji pairs are assigned onto that exact order — never
  a naive shuffle-and-hope. All 50 levels are independently re-verified on every test run by
  replaying each one to completion using only real emoji-matching removals, not just trusted from
  the curation script that generated them. Player choices can still reach a dead end mid-game; a
  small solver (memoized DFS over the remaining-tile bitmask) detects that and powers a Hint that
  always points to a real move toward clearing the board.
- Unlike Memory Pairs, every tile is visible from the start — the challenge is search and removal
  planning, not remembering hidden locations.
- Undo (unlimited, exact-state), Restart (reloads the original board), and autosave/Continue for
  the one active level. Stars (zero Hints for ★★★, one for ★★☆, otherwise ★☆☆) track mastery
  per level; completion alone — not stars — unlocks the next one.

See [`Emoji-Mahjong-Level-SPEC.md`](./specs/Emoji-Mahjong-Level-SPEC.md) for the full design rationale
([`Emoji-Mahjong-SPEC.md`](./specs/Emoji-Mahjong-SPEC.md) covers the original difficulty-based design
this replaced).

## Number Match

A [Make 10](https://artfulmath.com/make-10-game/)-style number-matching game: tap any two numbers,
anywhere on the board, that are identical or add up to 10. Position never matters — no adjacency or
path requirement, unlike Emoji Mahjong's covering rule. Removed cells stay empty and never reflow,
so board positions stay stable for planning.

- Six difficulties (Easy through Extreme), scaling board size (6×3 up to 9×10) and how few **Add
  Numbers** uses are available (4 down to 1), never past 9 columns — Expert/Extreme grow taller
  instead of wider to stay usable on a real iPhone.
- **Add Numbers**, used when stuck, copies every remaining number (in reading order) onto new
  cells appended to the end of the board — the board can grow well past its starting size, so it
  scrolls vertically rather than needing a fixed footprint. Since a duplicated number always
  matches its own copy regardless of position, Add Numbers is a guaranteed way to create a new
  legal pair.
- A starting board only needs *one* legal opening move, not a guaranteed full clear — genuine dead
  ends (rare, since Add Numbers always creates a new pair) end an attempt in "No More Matches" as a
  completed-but-uncleared result, not just "Board Cleared."
- Hint highlights one real legal pair (no guessing); Undo restores an exact removal. Score is
  secondary and only shown on Results; using Add Numbers costs points but never disqualifies a
  Clean result.

See [`Number-Match-SPEC.md`](./specs/Number-Match-SPEC.md) for the full design rationale.

## Odd One Out

A visual-discrimination and search task: find the one number or letter that's different from all
the others in a grid of otherwise-identical cells, and tap it before the overall timer runs out.

- Six difficulties (Easy through Extreme), scaling grid size (4×4 up to 9×9) alongside how visually
  similar the odd character is to the rest — from clearly different digits/letters at Easy up to
  classic OCR-confusable pairs (6/9, O/Q, C/G...) and, only at Expert and Extreme, ambiguous
  cross-family look-alikes (O/0, B/8, I/1).
- One continuous, time-limited challenge per round, not a per-trial timer: a correct tap
  immediately shows a new grid, a wrong tap costs points and briefly flashes red but leaves the
  same grid in place, and the round only ends when the overall clock hits zero.
- Every character pair comes from a small curated library rather than being generated on the fly,
  so an "odd" pair is always a deliberately chosen, validated one — never an arbitrary comparison.
- Tracks trials, correct/wrong taps, accuracy, and correct-answer reaction time (average, median,
  fastest, slowest). An untimed, unscored practice widget on the About page demonstrates a few
  examples, from obvious to genuinely tricky, before playing for real.
- Two optional variants, combinable and toggled independently at every difficulty: **Untimed**
  (round ends after 20 correct answers instead of a clock — no countdown, nothing to race against)
  and **Random Color** (a random background per cell, reassigned every grid — pure visual noise,
  never a hint). Each combination is tracked separately from Classic.

See [`Odd-One-Out-SPEC.md`](./specs/Odd-One-Out-SPEC.md) for the full design rationale.

## Target Tap

A continuous-performance / vigilance task: a stream of letters appears one at a time, at a fixed
pace, and you tap anywhere on the game area whenever your assigned target letter shows up —
ignoring every other letter.

- Four difficulties (Easy through Very Hard), scaling round duration (30s up to 90s), how often the
  target appears (~30% down to ~15%) and presentation speed (1000ms down to 500ms per letter).
  Difficulty comes from faster/rarer/longer, never from confusing letters or small text.
- Every response is one of four classic outcomes — Hit, Miss, False Alarm, Correct Rejection —
  tracked separately; these raw counts matter more than the score. A stimulus is always visible for
  its complete interval regardless of when (or whether) you tap, so pacing never depends on your
  reaction.
- Your target letter changes every round and is guaranteed to never repeat the immediately previous
  round's, at any difficulty. Target placement is deliberately generated (never two targets back to
  back, always at least two non-targets between them, a stable target count per round) rather than
  left to raw chance.
- Tracks Hit Rate, False Alarm Rate, accuracy, and Hit reaction time (average, median, fastest). A
  slower, unscored practice widget on the About page demonstrates the four outcomes before playing
  for real.

See [`Target-Tap-SPEC.md`](./specs/Target-Tap-SPEC.md) for the full design rationale.

## Tower of Hanoi

A progressive, 6-level Tower of Hanoi: move the whole disk tower from peg A to peg C, one disk at
a time, never placing a larger disk on a smaller one.

- Six levels (3 through 8 disks), each with a mathematically exact optimal move count (`2ⁿ - 1`).
  Completing a level — legally, not necessarily optimally — unlocks the next; every level stays
  replayable afterward from a numbered level-select grid showing locks and star ratings.
- Tap a peg to pick up its top disk, tap another to move it there; an illegal destination leaves
  the board untouched and counts as a Mistake rather than losing progress.
- Multiple Undo (restores the exact previous board and reverses its move, tracked separately as an
  Undo), Restart, and a Hint that highlights the next move from the true optimal strategy —
  generalized to work from any legal position, not just the starting one — without moving
  anything automatically. Using a hint rules out a clean 3-star result.
- Stars come from Moves vs. the mathematical optimum (Efficiency = optimal / actual × 100, capped
  at 100%): ★★★ for the exact optimum, ★★☆ within ~115% of it, ★☆☆ for any legal finish.
  Autosave restores an interrupted level exactly — board, history, moves, mistakes, undos, hints
  and elapsed time — down to the tap.

See [`Tower-of-Hanoi-SPEC.md`](./specs/Tower-of-Hanoi-SPEC.md) for the full design rationale.

## Lights Out

A progressive, 50-level Lights Out: tap a cell to toggle it and its up/down/left/right neighbours
(never diagonals), turning every light off to complete the level.

- 50 deterministic, versioned levels scaling from 3×3 (1-3 optimal moves) through 4×4 and 5×5 up
  to 6×6 (the hardest tier). Every single one was generated by scrambling a solved board and
  keeping only boards whose solver-verified true minimum lands in its tier's target range — never
  hand-placed, and every level is proven solvable before being shipped.
- The solver is real linear algebra, not a heuristic: the classic "row chasing" method tries every
  possible top-row press pattern (every other row's presses are then fully forced), and keeps
  whichever complete solution uses the fewest presses. Independently cross-checked against a
  brute-force search over all 512 possible 3×3 boards — provably optimal, not just plausible.
- Completing a level unlocks the next; every level stays replayable from a numbered level-select
  grid showing locks and star ratings. Multiple Undo, Restart, and a Hint that highlights one cell
  from a fresh optimal solution for wherever you currently are (Lights Out moves are order-
  independent, so this is always valid mid-play) — using it rules out a clean 3-star result.
- Stars come from Moves vs. the solver-verified optimum: ★★★ for the exact optimum, ★★☆ within 2
  moves of it, ★☆☆ for any completion. ON/OFF is never color-only — a filled, glowing bulb vs. an
  empty outline carries the state. Autosave restores an interrupted level exactly.

See [`Lights-Out-SPEC.md`](./specs/Lights-Out-SPEC.md) for the full design rationale.

## Whack-a-Mole

A progressive, 50-level Whack-a-Mole: a mole (🐹) pops up briefly in one of the grid's holes —
tap it before it disappears. Later levels add a distractor (🐰) that must be left alone.

- 50 deterministic levels scaling from a slow 2×2 grid (mole only) up to a fast 4×4 grid — grid
  size, presentation speed and distractor share all increase gradually, never through unreadably
  tiny targets. Every level's tuning (timing, target/distractor counts) is generated from eight
  named difficulty tiers rather than hand-typed, so the campaign scales smoothly end to end.
- Five tracked outcomes per stimulus: Hit, Miss, False Alarm, Correct Rejection, and Empty Tap
  (a tap on the wrong or an empty cell) — tracked separately since an Empty Tap is a spatial/motor
  slip, not an inhibition failure. A false alarm costs more than a miss, so mashing every cell
  never beats watching carefully.
- Completing a level — mistakes or not — unlocks the next; every level stays replayable from a
  numbered level-select grid showing locks and star ratings. Stars reward a clean run (high Hit
  Rate, low False Alarm Rate, zero Empty Taps) but never gate progression.
- No manual Pause: backgrounding the app auto-pauses and discards whatever was mid-air uncounted,
  then resumes with a countdown and a fresh gap before replaying that exact stimulus — nothing in
  a level is ever silently skipped or double-counted. No autosave/Continue either — a level is
  short enough that resuming an interrupted one mid-stream wasn't worth the complexity.

See [`Whack-a-Mole-SPEC.md`](./specs/Whack-a-Mole-SPEC.md) for the full design rationale.

Every history entry carries a per-game `metricVersion` (currently `1` everywhere) and the app
version that recorded it. If a score formula or measurement ever changes meaningfully, that game's
version number gets bumped so old and new sessions are never silently averaged together. Entries
from before this field existed are treated as version 1.

## Activity Dashboard

A suite-wide view, reachable via **Activity**, of how much you've played, filterable to the last 7,
30, 90 days or all time.

- **Overview**: current activity streak, games played, active days, total sessions. A streak still
  counts through yesterday if you haven't played yet today.
- **Sessions by Game**: a per-game session count for the selected range.

There's no unified cross-game score and no invented population percentiles. A note on the page
itself says these numbers describe performance on specific tasks over time, not general cognitive
ability, and that practice alone can raise a score.

## Your Data

Reachable via **Manage Your Data**. There's no account and no backend, so this is the only way to
back up or move your data.

- **Export All Data (JSON)**: a complete backup of history, stats, personal bests and any
  in-progress game, across every game. Versioned so a future format change is never misread as an
  older one.
- **Export History (CSV)**: a flattened, spreadsheet-friendly view of every session across every
  game.
- **Import**: restore from a previously exported JSON file. Shows a preview (record counts per
  game) before writing anything, with a choice between **Merge** (combine both, keep this device's
  stats on conflict) and **Replace** (wipe first). Rejects anything that isn't a recognizable
  export, with a specific reason.
- **Delete All Data**: permanently erases everything stored on this device. Gated behind typing
  `DELETE`, since it can't be undone.

## Offline / installable (PWA)

The whole suite installs as a Home Screen app on iOS, Android and desktop, and works fully offline
once installed. There's no network dependency for gameplay to begin with (no fonts, CDNs,
analytics or API calls anywhere in the app), so the entire app shell gets precached by a Service
Worker and served from cache afterward. All data (scores, history, stats, an in-progress game)
lives in `localStorage` and works the same offline, since it was never network-backed.

This only applies to a **production build** (`npm run build`, served via `npm run preview` or
similar). `npm run dev` intentionally serves no Service Worker, so local development is unaffected.
Installing on a phone also requires HTTPS, a browser rule and not something this app controls. See
§10 of [`SPEC.md`](./specs/SPEC.md) for details.

## Privacy

No account, no backend, no ads, no analytics or tracking of any kind. Every game's history, stats
and settings live only in this browser's `localStorage`; nothing is ever sent anywhere, online or
offline. Clearing your browser data or switching devices loses everything unless you've exported
it first (see [Your Data](#your-data) above).

## Development

### Requirements

- [Node.js](https://nodejs.org/) 20+ and npm, for local development.
- [Docker](https://www.docker.com/) and Docker Compose, optional if you'd rather not install
  Node locally.

### From source

```bash
git clone https://github.com/ebal/brain.git
cd brain
npm install
```

### Local development

```bash
npm run dev
```

Starts the Vite dev server (with hot reload). Open the printed local URL in your browser.

### Production build

```bash
npm run build   # outputs static files to ./dist
npm run preview # serve the build locally to sanity-check it
```

Every file under `dist/assets/` is content-hashed (a code change always produces a new filename), so whatever serves `./dist` in production should cache that folder as `public, max-age=31536000, immutable` and revalidate `index.html`, `manifest.webmanifest` and `sw.js` on every request instead (their filenames never change, and Workbox's own update check depends on `sw.js` never being served stale). See [`deploy/nginx.conf.example`](./deploy/nginx.conf.example) for a copy-pasteable version of those two rules — not wired into `docker-compose.yml`, since that runs the dev server and this project's actual deployment is external to this repo (see the warning below).

### Docker (dev server, no build step)

Runs the Vite dev server itself inside the container, directly against the bind-mounted source,
with full hot-reload. No Node install on the host, no build, no rebuild step.

```bash
docker compose up
```

Open `http://localhost:5173`, edit any file, the browser updates instantly. Stop with
`docker compose stop`.

This runs Vite's own dev server (unminified, dev-only tooling), not an optimized production build.
Fine for local/personal use. `npm run build && npm run preview` (above) is the closest built-in
equivalent to a production deployment.

> **Don't expose this dev server on a public host.** It never serves a Service Worker (`main.js`
> skips registration under `vite dev`), so none of the PWA/offline support applies, and a
> `git pull` + `docker compose down && up` cycle is the only way to pick up new code. Worse, if
> that same origin ever *did* serve a production build at some point, browsers that registered its
> Service Worker then will keep serving that old cached build forever. The dev server never sends
> a new one to replace it. For a real deployment, build a static artifact and serve it (eg. an
> on-demand `builder` service running `npm run build`, feeding an always-on `nginx:alpine` serving
> `./dist`) instead of running the dev server as "production."

#### File ownership

The container bind-mounts the whole project and writes into it (`node_modules`, `.npm-cache`), so
it runs as `${DOCKER_UID:-1000}:${DOCKER_GID:-1000}` instead of root, otherwise those files would
end up root-owned on your host. The default (`1000:1000`) matches the first regular user on most
single-user Linux installs; if your account uses a different UID/GID, set it once in a local `.env`
file (already gitignored, so it stays machine-specific):

```bash
printf "DOCKER_UID=%s\nDOCKER_GID=%s\n" "$(id -u)" "$(id -g)" > .env
```

Compose picks up `.env` automatically from then on, no need to pass anything on the command line.

## Project structure

All seventeen games live in one Vue app, chosen from a landing screen (`GameChooser.vue`) in
`App.vue`. Stroop's files sit flat under `components/`, `composables/` and `constants/`; the other
sixteen each have their own subfolder (`schulte/`, `nback/`, `sudoku/`, `set/`, `sequence-memory/`,
`switchtrail/`, `memorypairs/`, `marblejump/`, `mentalrotation/`, `emojimahjong/`, `numbermatch/`,
`oddoneout/`, `targettap/`, `hanoi/`, `lightsout/`, `whackamole/`),
all with the same shape: a
`MainMenu`/`AboutPage`/`HistoryPage`/`GameScreen`/`ResultsScreen` set of components, a `useXGame.js`
state machine plus a stats composable (and, for games with a resumable in-progress state, a storage
composable), and a `difficulties.js` constants file. The Activity dashboard and Data Management are
cross-cutting rather than per-game, so they live top-level alongside `GameChooser.vue`.

`GameChooser.vue` (the landing screen) is the only one of those components `App.vue` imports
eagerly — every game screen and every cross-cutting screen (Activity, Data Management, About) is
loaded via `defineAsyncComponent`, so the homepage's initial JS/CSS payload doesn't
include code for games or screens the visitor hasn't opened yet. `LoadingScreen.vue` is the shared
fallback shown if a chunk takes more than 150ms to arrive — normally invisible once the Service
Worker has this cached. This changes nothing about offline support: `vite.config.js`'s Workbox
`globPatterns` already precaches every build output file by extension, so it picks up the extra
chunk files without needing to know they exist.

```
brain/
├── specs/                        # SPEC.md, <Game>-SPEC.md ... — one design doc per game
├── docker-compose.yml, package.json, vite.config.js, vitest.config.js
├── public/                       # PWA icons
└── src/
    ├── App.vue
    ├── components/                # GameChooser, ActivityDashboard, DataManagement, AboutBrain,
    │                               # Stroop's own screens flat here, and one folder per remaining
    │                               # game (same MainMenu/AboutPage/... shape)
    ├── composables/                # mathStats, sessionModel, activityStats, dataPortability,
    │                               # plus one folder per game
    └── constants/                  # metricVersions, plus one folder per game
```

Each game's own `*-SPEC.md` (linked from its section above) has the full design rationale: rules,
difficulty tuning, scoring formulas, and storage shape.

## Testing

```bash
npm test
```

Runs the automated test suite ([Vitest](https://vitest.dev/)): deterministic unit tests for the
actual game math and generation logic across all seventeen games (trial/board/sequence generation,
validators, difficulty classification, scoring, statistics), plus the shared session model and
Activity dashboard logic. No component/DOM testing yet, everything covered so far is plain JS
logic, testable without mounting a Vue component. Each tested module has a co-located `*.test.js`
file next to it.

## License

[MIT](./LICENSE)
