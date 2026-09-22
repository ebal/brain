# Lights Out --- Spatial Planning & Cause/Effect --- Specification

## Goal

Add a progressive, mobile-first Lights Out puzzle to Brain. Tap a cell
to toggle itself and its orthogonal neighbours. Turn every light off
using as few moves as possible. The game exercises planning, spatial
reasoning, cause/effect reasoning, working memory, and look-ahead.

## Brain entry

**💡 Lights Out** --- Turn every light off. Each tap changes its
neighbours too. Spatial planning & reasoning.

## Core rules

Each cell is ON or OFF. Tapping `(r,c)` toggles itself plus valid
up/down/left/right neighbours. Diagonals never toggle. The level
completes when all cells are OFF.

## Progression

V1 contains 50 deterministic, versioned levels. Completion unlocks the
next; completed levels remain replayable.

  Levels                                           Grid   Intended optimal depth
  -------- -------------------------------------------- ------------------------
  1--5                                              3×3               1--3 moves
  6--10                                             3×3                     3--5
  11--20                                            4×4                     3--7
  21--35                                            5×5                    4--10
  36--45                                            5×5                    8--14
  46--50     6×6 if mobile-safe, otherwise advanced 5×5                validated

Never shrink controls below comfortable iPhone targets just to increase
grid size.

## Level data and generation

Each level stores `id`, `version`, dimensions, initial state,
solver-verified `optimalMoves`, and difficulty rank. Generate candidates
from the solved board by applying taps, then use the solver to determine
the true minimum. Every shipped level must be proven solvable.

## Solver

Keep solver logic pure and outside Vue. Use a mathematically correct
Lights Out solver (GF(2), row chasing/exhaustive first-row states, or
equivalent) providing `isSolvable`, `minimumMoves`, and
`getOptimalSolution`. Unit-test known boards.

## Interaction

Tap a cell; immediately toggle it and valid orthogonal neighbours,
increment Moves, record history, autosave, and check completion. No
Submit button.

## Metrics

Primary metric: **Moves**. Show solver-verified Optimal Moves and
`Efficiency = optimal / actual × 100`, capped at 100%. Use a count-up
timer with `performance.now()` and no hard limit.

## Stars

Initial rule: - ★★★ exact optimal solution - ★★☆ within optimal + 2
moves - ★☆☆ completed

Hints cap the result below a clean 3-star result. Tune only after real
play-testing.

## Undo, Restart, Hint

Support multiple Undo. Undo restores the previous board, tracks Undos,
and does not rewind time. Restart restores the exact initial level. Hint
highlights one recommended next cell from an optimal solution for the
current state; it does not tap automatically and increments Hints.

## Results

Show Level Complete, stars, Moves, Optimal, Efficiency, Time, Hints,
Undos, best Moves/Time, and prominent **Next Level** / **Play Again**
actions.

## Progress/history

Track per-level best Moves, clean Moves, Stars, and Time for equivalent
results. Store highest unlocked level, completed levels, total stars,
optimal completions, total moves/hints/play time. Do not create a
universal cognitive score.

## Pause/autosave

Pause timing when hidden and preserve exact board. Save after every tap,
Undo, Hint, Pause, and visibility change. Continue restores the exact
level/version, board, history, moves, undos, hints, elapsed time, and
metricVersion.

## Mobile UX

iPhone portrait first. Entire board visible without scrolling, large
square tap targets, fixed geometry, immediate feedback, no hover/text
selection/double-tap zoom, safe-area aware, timer secondary. ON/OFF must
not rely on color alone: use filled/bright vs outline/dim or equivalent.

## Practice

Use a tiny 3×3 demonstration explaining that a tap toggles itself plus
up/down/left/right. Practice has no history or score.

## Architecture

Integrate with existing Brain Vue/Vite conventions. Keep pure functions
such as `toggleCell`, `applyMove`, `isSolved`, `solveLightsOut`,
`generateLevel`, `calculateEfficiency`, and `calculateStars` separate
from Vue. Do not redesign Brain.

## Tests

Test center/edge/corner toggles, double-toggle reversibility, solved
detection, solver correctness, optimalMoves, generated-level
solvability, Undo, stars/efficiency, unlocking, and exact autosave
restore.

## Offline/PWA

All levels, solver, visuals, progression, and history are local. No
API/CDN/remote assets. Cold-start and Continue must work in installed
Brain PWA in Airplane Mode.

## Future

No endless procedural mode, Daily Challenge, custom editor, alternate
toggle rules, leaderboards, themes, or global Brain Score in v1.

## Final decisions

1.  Progressive 50-level Lights Out.
2.  Self + orthogonal-neighbour toggling only.
3.  Goal all OFF.
4.  Solver-verified solvability and true optimal Moves.
5.  Mostly 3×3 → 4×4 → 5×5 progression; 6×6 only if mobile-safe.
6.  Moves is primary metric.
7.  3-star optimality progression.
8.  No hard timer.
9.  Multiple Undo, Restart, solver-backed Hint.
10. Level unlocking and replay.
11. Autosave/Continue.
12. Mobile/iPhone-first.
13. Existing Brain architecture.
14. No backend.
15. Full offline/PWA.
