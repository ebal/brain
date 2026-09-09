# Marble Jump — Solo Strategy & Planning — Specification

## 1. Goal

Add a small, offline-first, single-player jumping puzzle to **Brain**.

The player starts with a board containing many marbles and empty holes. A legal move jumps one marble over an adjacent marble into an empty landing hole. The jumped marble is removed.

> Keep jumping and removing marbles. Finish with as few marbles left as possible.

The game focuses on planning, problem solving, visual search, spatial reasoning, and look-ahead. It is a casual cognitive game, not a clinical assessment.

## 2. Naming

User-facing name: **Marble Jump**.

Brain chooser:

> **Marble Jump**  
> Jump over marbles and remove them. Plan ahead and leave as few as possible.

Do not call this `Super Chinese Checkers`. The intended one-player capture/removal mechanic is much closer to **Peg Solitaire / Marble Solitaire** than to standard or Super Chinese Checkers.

## 3. Core rule

A move uses three aligned positions:

`START → JUMPED → LANDING`

A move is legal only when START and JUMPED contain marbles, LANDING is empty, and the three positions are consecutive along a legal board direction.

```text
Before: ● ● ○
After:  ○ ○ ●
```

Every legal move removes exactly one marble. There is no opponent.

## 4. Board geometry

Use a hexagonal / triangular-lattice board with six directions:

`E, W, NE, NW, SE, SW`

A jump travels exactly two neighboring hole-spacings: over one adjacent occupied hole into the empty hole immediately beyond it.

Do not use arbitrary-distance Super Chinese Checkers hops in v1.

## 5. Difficulty

Start with three levels:

| Difficulty | Intent |
|---|---|
| Easy | Small/forgiving configuration, learn planning |
| Medium | Standard board, longer solution |
| Hard | Denser/deeper puzzle requiring more look-ahead |

Difficulty comes from starting position and solution structure, not tiny controls or timers.

Do not classify difficulty only by marble count. Prefer a small curated set of solver-validated puzzles per level.

Useful rating inputs include minimum achievable pieces remaining, solution depth, viable opening moves, branching factor, and dead-end choices.

## 6. Puzzle definitions

Each puzzle stores conceptually:

```text
{
  id,
  difficulty,
  validHoles,
  occupiedHoles,
  optimalRemaining,
  version
}
```

Validate every shipped puzzle. Only display an optimal result if solver-verified.

## 7. Interaction

1. Tap a marble.
2. Highlight all legal landing holes.
3. Tap a highlighted landing.
4. Briefly animate the jump.
5. Remove the jumped marble.
6. Update moves and remaining pieces.

Tapping the selected marble deselects it. Selecting another movable marble changes selection. Harmless selection changes are not mistakes.

## 8. Legal-move highlighting

Selected marble: strong highlight.  
Legal landing holes: subtle highlight.  
Everything else: unchanged.

Keep this enabled in v1. The puzzle should test planning, not UI guesswork.

## 9. Moves and multi-jumps

Every jump is one Move.

After a jump, the same marble may be selected again if another jump exists, but do not automatically chain jumps. This keeps planning and Undo simple.

## 10. End of game

The game ends when **no legal moves remain**.

The player may finish with one or several marbles. One marble is only called optimal/perfect when the selected puzzle's verified optimum is one.

Primary result:

**Marbles Remaining — lower is better.**

## 11. Timer

Use a count-up timer with `performance.now()`.

No hard time limit. Planning is more important than rushing.

Time starts when the board becomes interactive and stops when no legal moves remain.

## 12. Performance metrics

Primary:
- Marbles Remaining

Secondary:
- Moves
- Completion Time
- Undo count
- Hint count
- Optimal result, when verified

Do not present these as IQ or clinical measurements.

## 13. Score

Score is secondary to Marbles Remaining and is **not shown during active gameplay**.

The active game HUD should show only the information useful while planning:

```text
Marbles Left
Moves
Time
```

Score is calculated in the background and appears only on the Results screen. This keeps the board visually quiet and prevents a synthetic score from distracting from the actual puzzle state.

Suggested initial formula:

```text
base = startingMarbles × 100
remainingPenalty = remainingMarbles × 250
undoPenalty = undos × 25
timePenalty = floor(elapsedSeconds / 5) × 5

score = max(0,
  base
  - remainingPenalty
  - undoPenalty
  - timePenalty
)
```

Optional verified-optimum bonus: `+500`.

Tune constants through real play-testing; never change puzzle rules merely to fit scoring.

## 14. Undo

Support multiple Undo operations.

Undo restores START, JUMPED, and LANDING exactly to the previous state. It does not rewind elapsed time. Track Undo count.

## 15. Restart

Restart restores the exact original puzzle configuration. Confirm only when accidental restart would meaningfully destroy progress.

## 16. Hint

Hint is optional for v1.

If implemented, it should suggest one legal move that preserves an optimal solution when the solver can prove that.

Track Hints Used. Hint-assisted rounds cannot replace Clean Best.

If good hints materially complicate v1, omit Hint instead of providing random/weak hints.

## 17. Clean result and personal best

Clean means `hintsUsed = 0`.

Undo does not disqualify Clean, but remains visible.

Best comparison:
1. fewer marbles remaining
2. fewer hints
3. fewer undos
4. faster completion

## 18. Results

```text
No more moves

Marbles Left       2
Score           3,425
Moves             42
Time            02:31
Undos              1
Hints              0

Best Left          1
Best Time       02:14
```

Score belongs here rather than in the active-game HUD.

If a verified optimum is reached, show `Optimal!`.

## 19. History and statistics

Keep the last 30 completed games.

History entry:

```text
{
  puzzleId,
  difficulty,
  startingMarbles,
  remainingMarbles,
  moves,
  completionTime,
  undos,
  hints,
  clean,
  optimalReached,
  completedAt,
  metricVersion
}
```

Track best/average/median remaining marbles, best clean result, best time for equivalent results, average moves/undos, and optimal completions.

Do not combine materially different puzzle configurations into a misleading universal metric.

## 20. Pause and autosave

Follow Brain's existing conventions.

Pause active timing when hidden. Preserve the exact board. Resume without regenerating anything.

Autosave after every legal move and Undo.

Conceptual active state:

```text
{
  puzzleId,
  difficulty,
  boardState,
  moveHistory,
  moves,
  undos,
  hints,
  elapsedTime,
  startedAt,
  updatedAt,
  metricVersion
}
```

## 21. Solver

A small pure solver is strongly recommended to:

- validate puzzles
- calculate `optimalRemaining`
- help rate difficulty
- support future hints
- detect broken configurations

Represent board state compactly (eg. bitset/BigInt) and precompute legal board geometry. Use memoization/transposition caching.

The solver is not an AI opponent.

If full optimal solving is expensive in-browser, precompute puzzle metadata during development and ship validated results.

## 22. Mobile-first UX

The board should dominate the active game screen.

Conceptually:

```text
‹ Brain                     Easy

          Marbles Left: 15
          Moves: 0    00:00


               ●
            ●     ●
         ●     ●     ●
      ●     ●     ●     ●
         ●     ○     ●
            ●     ●
               ●


        ↶ Undo      ↻ Restart
```

Where:

```text
● = marble
○ = empty hole
```

Do not show Score during active play.

Requirements:

- board is the visual focus
- no normal gameplay scrolling
- practical touch targets
- fixed geometry
- clear selected marble
- clear legal destinations
- short jump animation
- Undo reachable one-handed
- Restart protected from accidental taps
- timer secondary
- remaining count prominent
- no hover dependency
- no accidental text selection/double-tap zoom
- safe-area aware
- portrait-first

## 23. Visual design

Use local CSS/SVG circles or marbles. No external images.

When a marble is selected, highlight only that marble and its legal destinations.

Conceptually:

```text
selected marble       [●]
legal destination      ◎
normal marble          ●
empty hole             ○
```

The interaction should make the legal move visually obvious without changing board geometry.

States:

`occupied`, `empty`, `selected`, `legal-destination`, `last-move`

Keep the board visually quiet and easy to read.

## 24. How to Play

Show the rule visually:

```text
● ● ○  →  ○ ○ ●
```

> Jump one marble over an adjacent marble into the empty hole directly beyond it. The marble you jump over is removed. Keep going until no legal jumps remain. Try to leave as few marbles as possible.

Include a tiny untimed practice board with no score/history.

## 25. Architecture

Integrate into existing Brain conventions. Do not redesign Brain.

Conceptually:

```text
components/marblejump/
composables/marblejump/
game/marblejump/
```

Pure functions:

```javascript
createBoard(puzzle)
getLegalMoves(state)
isLegalMove(state, move)
applyMove(state, move)
undoMove(state, move)
hasLegalMoves(state)
solvePuzzle(state)
calculateScore(result)
```

## 26. Tests

Test:

- puzzle validity and starting count
- legal/illegal jump geometry
- START/JUMPED/LANDING occupancy rules
- applying a move removes exactly one marble
- Undo restores exact state
- game ends only with zero legal moves
- known small puzzles have known solver optimum
- persistence restores exact board
- existing Brain data remains untouched

## 27. Offline / PWA

Marble Jump must work fully offline inside Brain:

- local board geometry
- local puzzle definitions
- local solver
- no runtime API/CDN/remote images
- local persistence
- active game resumable offline
- cold-start works from installed Brain PWA in Airplane Mode

Adding the game introduces zero required runtime network dependencies.

## 28. Benchmark

Do not add Marble Jump to Brain Benchmark v1.

Puzzle-specific practice effects and configuration-dependent difficulty make normal-play data the right first step.

## 29. Future changes

Not v1:

- arbitrary-distance Super Chinese Checkers hops
- multiplayer Chinese Checkers
- AI opponent
- procedural puzzle generation
- daily challenge
- puzzle editor
- larger/alternative boards
- online leaderboard
- cloud sync
- 3D marbles

## 30. Final v1 decisions

1. Name: **Marble Jump**.
2. Single-player capture/removal puzzle.
3. Jump one adjacent marble into the empty hole directly beyond it.
4. Remove the jumped marble.
5. Goal: leave as few marbles as possible.
6. Hexagonal/triangular-lattice board, six directions.
7. No arbitrary-distance Super Chinese Checkers hops in v1.
8. Each jump is a separate Move.
9. Easy / Medium / Hard using curated solver-validated puzzles.
10. Primary metric: Marbles Remaining.
11. No hard time limit.
12. Score secondary to raw result and shown only on Results, never during active play.
13. Undo and Restart supported.
14. Hint optional; omit rather than implement weak hints.
15. Autosave / Continue.
16. Pure solver separated from Vue.
17. Last 30 games.
18. Mobile/iPhone-first.
19. Existing Brain architecture.
20. No backend/database.
21. Full offline/PWA support.
22. Not part of Benchmark v1.
