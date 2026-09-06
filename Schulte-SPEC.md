
Schulte Tables — Visual Attention and Speed — Specification

1. Background: what a Schulte Table actually is

A Schulte Table is a square grid containing numbers placed in randomized positions. The task is to find and select the numbers in ascending order as quickly and accurately as possible.

For example, a classic 5×5 table contains the numbers 1–25, each exactly once. The player starts at 1, then finds 2, 3, 4, and continues until 25.

The task primarily exercises and measures visual search, sustained attention, processing speed, and efficient scanning of the visual field. Unlike the Stroop test, there is no congruent/incongruent interference condition. The useful measurements here are completion time, response time between consecutive selections, and errors.

Design decision this implies for the app

The grid itself should stay fixed during a round. Numbers must not move after a correct or incorrect selection, otherwise the task becomes partly a tracking/memory game instead of a Schulte Table.

Each generated board contains every required number exactly once, shuffled into random cells.

The player always searches in ascending numerical order.



2. Game modes and difficulty

Difficulty scales primarily through grid size. Larger grids contain more targets and create a denser visual-search task.







Difficulty



Grid



Numbers



Suggested use





Easy



3×3



1–9



Warm-up / learning





Medium



4×4



1–16



Short attention exercise





Classic



5×5



1–25



Standard Schulte Table





Hard



6×6



1–36



Dense visual search





Very Hard



7×7



1–49



Extended challenge

Classic 5×5 is the reference difficulty and should be visually identified as such in the menu.

There is no countdown timer limiting the round. A round ends when the player successfully selects the final number.

A 3-2-1 countdown appears before the grid becomes active. The completed grid may already be visible during the countdown, but interaction and timing begin only at "Go!".

Every new round generates a new randomized board.



3. Interaction rules





The required target begins at 1.



A correct tap/click advances the target by one.



The grid never rearranges during a round.



Correct selections remain visually marked so the player can distinguish completed numbers from remaining targets.



An incorrect selection counts as an error but does not advance the target.



Incorrect selections receive brief visual feedback without moving or hiding any cells.



Input works identically with touch and mouse.



The entire cell is the tap target, not only the number text.



Double-clicking or rapidly tapping the same cell must not accidentally advance more than one number.



When the final number is selected correctly, timing stops immediately.

Fixed visual layout

Once a round begins, cell positions, dimensions, spacing, typography, and number positions remain fixed.

This is important because the measurement should primarily reflect visual search and attention rather than UI movement.



4. Metrics captured

Per selection we log:





expected number



number selected



correct / incorrect



elapsed time from round start



response interval since the previous correct selection

For correct selections, the response interval represents the time required to find the next target.

End-of-round summary





Completion time — total time from "Go!" until the final correct selection



Errors — number of incorrect selections



Accuracy = correct selections / all selections, as %



Average search time — mean interval between correct selections



Median search time — median interval between correct selections



Fastest search — shortest correct-selection interval



Slowest search — longest correct-selection interval



Best completion time for this difficulty



Previous completion time, when available

Median search time is shown alongside the average because one unusually slow search can distort the mean.

Incorrect selections are excluded from the average/median search-time calculation but remain represented through the error and accuracy metrics.

Primary measurement

The primary result is completion time.

Unlike the Stroop game, there is no synthetic points formula. A lower completion time is better, but errors must remain clearly visible so a fast round with many mistakes is not presented as equivalent to a clean round.

A personal best requires:





the round to contain zero errors, and



the completion time to be lower than the previous zero-error best for the same difficulty.

This keeps the best-time metric simple and prevents random rapid tapping from producing a record.



5. Persistence: best times and history

The app remains single-user, no-login, and browser-local.

Use browser localStorage, keyed per difficulty:

schulte:best:easy
schulte:best:medium
schulte:best:classic
schulte:best:hard
schulte:best:very-hard

A best entry stores:

{
  completionTime,
  avgSearchTime,
  medianSearchTime,
  accuracy,
  date
}

Round history is stored separately:

schulte:history:<difficulty>

Keep the last 20 completed rounds per difficulty.

Each history entry stores:

{
  completionTime,
  errors,
  accuracy,
  avgSearchTime,
  medianSearchTime,
  date
}

localStorage is intentionally used instead of a backend/database. Data is therefore browser/device-specific and will not automatically sync between devices.



6. Architecture

Keep the architecture deliberately close to the existing Stroop project:





Vue 3 (Composition API) + Vite



Single-page application



No router required



No backend/API



Browser localStorage for personal bests and history



Mobile-first UI



Single Docker Compose development service using node:20-alpine



Vite dev server exposed on port 5173



Bind-mounted source with hot reload



Container runs as ${DOCKER_UID:-1000}:${DOCKER_GID:-1000}

Suggested structure:

Schulte/
├── SPEC.md
├── docker-compose.yml
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.js
    ├── App.vue
    ├── components/
    │   ├── MainMenu.vue
    │   ├── AboutPage.vue
    │   ├── HistoryPage.vue
    │   ├── GameScreen.vue
    │   ├── ResultsScreen.vue
    │   └── SchulteCell.vue
    ├── composables/
    │   ├── useSchulteGame.js
    │   ├── useBestTimes.js
    │   └── useScoreHistory.js
    └── constants/
        └── difficulties.js

Game generation, timing, selection validation, and per-selection metrics belong in useSchulteGame.js.

Presentation remains inside components.



7. Mobile-first UX

Mobile is the primary interface, browser/desktop second.

The most important UX requirement is that the entire grid remains visible without scrolling during an active round.





Grid is square and centered.



Cells use equal width and height.



Grid scales responsively to the available viewport.



Numbers remain large and legible.



Cell spacing should be small enough to preserve scanning continuity.



Avoid decorative animation while a round is active.



Disable text selection inside the grid.



Prevent double-tap zoom from interfering with play where practical.



Do not require hover states.



Touch targets should remain usable even on 6×6 and 7×7 boards.



The current target (Find: 12) remains visible above the grid.



The running timer is visible but visually secondary to the grid.

Correct-answer feedback

A selected correct cell should become visually quieter rather than disappear completely.

For example:





lower contrast



subtle background change



checkmark or completed state

The original number should remain visible. Removing numbers changes the visual structure of the table during the task.

Incorrect taps should briefly indicate an error and then return to their normal state.



8. About / How to Play

The About page should explain the task in plain language:



Find the numbers in order, starting at 1. Tap 1, then 2, then 3, and continue until the final number. Try to finish as quickly as possible without mistakes.

Include:





a small static 3×3 example



explanation of completion time



explanation of errors and accuracy



explanation of average vs. median search time



explanation that 5×5 / 1–25 is the Classic mode



a short untimed practice table

Practice activity must not be stored in history or personal-best data.



9. History

The History screen allows switching between difficulties.

For each difficulty show:





personal best completion time



latest completion time



latest accuracy/errors



median search time



rolling history of the last 20 rounds



simple completion-time trend sparkline

Because grid sizes contain different numbers of targets, completion times should primarily be compared within the same difficulty, not across different grid sizes.

The Classic 5×5 history is the best place for tracking long-term performance because the task configuration remains constant.



10. Board generation

For difficulty size N:





Generate integers 1...(N × N).



Shuffle them using Fisher-Yates or an equivalent unbiased shuffle.



Place them into the grid in shuffled order.



Verify every required number appears exactly once.



Do not modify the board again until the round ends.

A new board is generated for every new round, including replaying the same difficulty.

There is no requirement to prevent similar boards between sessions; the permutation space is already sufficiently large for the intended personal use.



11. Timing

Use a monotonic high-resolution browser timer such as performance.now() for round and selection timing.

Do not use Date.now() for reaction/search-time measurement.

Timing starts when the countdown finishes and the board becomes interactive.

Timing ends at the exact successful selection of the final number, before results rendering or animation.

Store measured durations internally in milliseconds.

Display:





completion time to 2 decimal seconds, eg. 18.42 s



search-time metrics in milliseconds, eg. 742 ms



12. Future changes this design leaves room for

Not part of v1:





reverse-order mode (25 → 1)



letters instead of numbers



alternating number/letter variants



custom grid size



fullscreen/focus mode



optional sound/haptic feedback



CSV/JSON history export



per-cell search-time visualization



heatmap of where slower searches occurred



server-side persistence/sync



dark mode



i18n

These should remain additive features. They should not complicate the initial number-only ascending-order game.



13. Decisions for v1





Ascending numbers only.



Difficulty scales through 3×3, 4×4, 5×5, 6×6, 7×7 grids.



5×5 / 1–25 is Classic.



No round time limit; completion of the table ends the round.



Grid layout remains completely fixed during play.



Correct cells remain visible but visually marked as completed.



Incorrect taps count as errors and do not advance the target.



Completion time is the primary metric.



Average and median correct-selection intervals are recorded.



Personal bests require a zero-error round.



Best times and last 20 rounds are stored in browser localStorage.



Mobile-first UI.



No backend/database.



Single Vite development container, matching the simplified architecture of the Stroop project.



