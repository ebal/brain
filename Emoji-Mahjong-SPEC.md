# Emoji Mahjong — Visual Search & Planning — Specification

## 1. Goal

Add a relaxing, mobile-first **Mahjong Solitaire-style** game to Brain using emoji instead of traditional Mahjong tiles.

The player removes matching pairs of currently free tiles until the board is cleared.

The game exercises visual search, spatial planning, pattern matching, sustained attention, and look-ahead. It is a casual cognitive puzzle, not a clinical assessment.

## 2. Name and chooser entry

**Emoji Mahjong**

> Match free emoji tiles and clear the board. Visual search & planning.

This is simplified Mahjong Solitaire, not traditional four-player Mahjong.

## 3. Core rule

Every emoji belongs to a matching pair.

Select two identical **free** tiles:

`🐶 + 🐶 → removed`

Removing pairs exposes previously blocked tiles.

Goal:

`tiles remaining = 0`

## 4. Free-tile rule

A tile is selectable only when:

1. no tile covers it from above, and
2. at least one horizontal side is open: left OR right.

The engine determines this from board geometry, not visual approximation.

## 5. Simplified Brain rules

V1 does not use traditional suits, winds, dragons, flowers/seasons, special matching exceptions, traditional scoring, or multiplayer rules.

Every pair is simply:

`same emoji + same emoji`

## 6. Difficulty

| Difficulty | Tiles | Pairs | Layout |
|---|---:|---:|---|
| Easy | 24 | 12 | Mostly flat / shallow |
| Medium | 36 | 18 | Shallow layered |
| Hard | 48 | 24 | More blocking / layers |
| Very Hard | 64 | 32 | Larger layered puzzle |

Difficulty comes from tile count, layers, blocking, removal choices, and planning depth — never tiny tiles, poor contrast, faster timers, or hidden information.

## 7. Layouts

Use curated local layout templates. A slot conceptually contains `{x, y, z}` where `z` is layer.

Suggested initial variety:

- Easy: 3 layouts
- Medium: 4
- Hard: 4
- Very Hard: 4

Curated layouts are preferred over a complicated procedural geometry generator.

## 8. Solvability is mandatory

Never simply create pairs, shuffle them randomly, and fill the board. That can create unsolvable games.

Every generated game must have at least one known complete solution.

Preferred implementation: reverse-generate a solvable pair-removal order, or generate a candidate and reject it unless a solver proves it can be cleared.

Correctness is more important than generation cleverness.

## 9. Solver

Keep pure solver/game logic outside Vue.

Useful functions:

```javascript
isTileFree(state, tileId)
getFreeTiles(state)
getAvailablePairs(state)
removePair(state, a, b)
undoPair(state, move)
isDeadEnd(state)
isBoardCleared(state)
solveBoard(state)
generateSolvableBoard(layout, seed)
```

Use memoization where useful.

The solver validates boards, detects dead ends, powers Hint, and helps difficulty analysis.

## 10. Emoji pool

Use locally defined Unicode emoji only.

Examples:

```text
🐶 🐱 🦊 🐼 🐸 🐵 🐰 🦁
🍎 🍋 🍇 🍓 🥝 🍒 🍊 🍉
🚗 🚀 🎈 🎲 💎 🎁 🔔 ☂️
🌞 ⭐ 🌙 🌈 🔥 🌸 🍀 ❄️
⚽ 🏀 🎾 🏐 🎯 🥊 🏓 🏸
```

Prefer visually distinct, broadly supported emoji. Avoid flags, skin-tone variants, complex family/ZWJ sequences, and near-identical faces/hearts.

The game should test search/planning, not eyesight.

## 11. Tile state

Each tile has an id, emoji, slot/layer, and state.

States:

`blocked`, `free`, `selected`, `removed`, `hinted`

Removed tiles disappear visually but the immutable layout remains known to the engine.

## 12. Interaction

Tap a free tile to select it.

Tap another free tile:

- same emoji → remove both
- different emoji → brief mismatch feedback, remove neither
- blocked tile → subtle `Blocked` feedback, no selection

Tapping the selected tile again deselects it.

No Submit button.

## 13. Moves and mistakes

A **Move** is one completed comparison between two free tiles.

Matching pair: `1 Move, 0 Mistakes`

Different pair: `1 Move, 1 Mistake`

Blocked taps/deselection do not count.

## 14. Dead ends

A solvable starting board can still be played into a state where tiles remain but no matching free pair exists.

Show:

```text
No available pairs

Undo
Restart
Hint
```

Do not silently reshuffle. Removal order should matter.

## 15. Undo

Support multiple Undo operations.

Undo restores the most recently removed pair and all resulting blocked/free relationships.

Undo does not rewind time. Track Undo count.

Undo primarily applies to successful removals, not harmless mismatches.

## 16. Restart / New Game

Restart restores the exact original layout and emoji assignment.

New Game generates a new validated board.

Confirm Restart after meaningful progress.

## 17. Hint

Hint must be solver-backed.

Highlight one currently removable matching pair that lies on at least one path to clearing the board when the solver can establish that.

Do not knowingly suggest a move that forces a dead end.

Track Hints Used. Hint-assisted games can finish but cannot replace Clean Best.

## 18. No Shuffle in v1

Do not add Shuffle/power-up mechanics.

Undo is the primary dead-end recovery mechanism. Shuffle would weaken planning and could hide poor generator/solver behavior.

## 19. Timer

Use a count-up timer with `performance.now()`.

No hard time limit. The game should feel thoughtful and relaxing.

Start when interactive; stop when the final pair is removed.

## 20. Primary outcome

Primary result:

**Board Cleared**

Then emphasize:

- Time
- Moves
- Mistakes
- Hints
- Undos

Unlike Memory Pairs, all information is visible; the challenge is search and removal planning rather than remembering hidden locations.

## 21. Score

Score is secondary and shown on Results, not prominently during play.

Initial base scores:

```text
Easy        3000
Medium      5000
Hard        7500
Very Hard  10000
```

Penalties:

```text
Time      -5 per 5 whole seconds
Mistake   -50
Hint      -250
Undo      -25
```

Only cleared boards receive a final score/personal-best eligibility. Minimum score is 0.

Tune constants after real play-testing.

## 22. Clean completion and personal best

Clean = `hints === 0`.

Undo does not disqualify Clean but remains visible.

Best priority:

1. board cleared
2. no hints
3. higher score
4. fewer undos
5. faster time

Track Best Time separately.

## 23. Results

```text
Board Cleared!

Difficulty        Medium
Score              4,320
Time               03:42
Moves                 23
Mistakes               5
Hints                  0
Undos                  1

Clean ✓

Best Score          4,510
Best Time           03:18

[ Play Again ]
```

Keep Results simple.

## 24. History and statistics

Keep the last 30 completed games per difficulty.

History entry:

```text
{
  layoutId,
  difficulty,
  seed,
  score,
  completionTime,
  moves,
  mistakes,
  hints,
  undos,
  clean,
  completedAt,
  metricVersion
}
```

Track games started/cleared, completion rate, best clean score/time, average/median completion time, moves, mistakes, hints, undos, clean completions, and dead-end/abandoned games.

Do not combine difficulties into one universal score.

## 25. Pause and autosave

Support manual Pause and automatically pause when the PWA is hidden.

Stop timer and preserve exact state.

Autosave after pair removal, Undo, Hint, Pause, and visibility changes.

Do not persist a half-completed two-tile selection.

Continue restores the exact board with no selected tile.

## 26. Mobile-first UX

Primary target: iPhone portrait.

Requirements:

- board is visual focus
- no normal gameplay scrolling
- practical touch targets
- emoji readable
- layering obvious
- selected tile clear
- Undo/Hint reachable
- Restart protected
- timer secondary
- tiles/pairs remaining visible
- no hover dependency
- no accidental text selection/double-tap zoom
- safe-area aware

Very Hard must remain usable on a normal iPhone. Use compact difficulty-specific layouts rather than unreadably small tiles.

## 27. Layer rendering

Use CSS positioning/transforms or local SVG, not a 3D engine.

Higher layers may use slight offset, shadow, z-index and border to show overlap.

Clarity outranks decorative 3D effects.

## 28. How to Play

> Match two identical emoji tiles to remove them. You can only select a free tile: it must have no tile covering it and at least one side open. Remove all pairs to clear the board.

Include a small untimed practice layout explaining free vs blocked tiles.

Practice has no timer, score, or history.

## 29. Architecture

Integrate with Brain's existing Vue/Vite conventions. Do not redesign Brain.

Conceptually:

```text
components/emojimahjong/
composables/emojimahjong/
game/emojimahjong/
```

Keep board geometry, freedom rules, generation, solver and scoring pure/testable where practical.

## 30. Tests

At minimum verify:

- correct tile count/layout per difficulty
- every emoji appears exactly twice
- deterministic seed reproduces board
- covered tile is blocked
- uncovered tile with open left/right side is free
- removing neighbors correctly exposes tiles
- identical free tiles remove
- mismatched tiles remain
- blocked tile cannot match
- solver proves every shipped/generated board has a complete solution
- dead-end detection works
- solver-backed Hint is valid
- Undo restores exact board relationships
- active-game persistence restores exact state

## 31. Offline / PWA

Emoji Mahjong must work completely offline inside Brain:

- local emoji pool
- local layouts
- local generator/solver
- no runtime API/CDN/remote images
- local persistence
- active game resumable offline
- cold-start from installed Brain PWA in Airplane Mode

Introduce zero required runtime network dependencies.

## 32. Benchmark

Do not add Emoji Mahjong to Brain Benchmark v1.

Layouts and repeated exposure create practice effects. Collect normal-play data first.

A future benchmark may use a rotating versioned pool of validated layouts/seeds.

## 33. Future changes

Not v1:

- Shuffle booster
- power-ups
- traditional Mahjong artwork/rules
- 3D engine
- procedural geometry
- Daily Challenge
- multiplayer/leaderboards
- cloud sync
- themed emoji packs
- custom layouts

## 34. Final v1 decisions

1. Name: **Emoji Mahjong**.
2. Mahjong Solitaire-style single-player puzzle.
3. Emoji replace traditional tiles.
4. Matches require identical emoji.
5. Free tile = uncovered + at least one horizontal side open.
6. Easy = 24 tiles / 12 pairs.
7. Medium = 36 / 18.
8. Hard = 48 / 24.
9. Very Hard = 64 / 32.
10. Curated layered layout templates.
11. Every starting board solver-verified as solvable.
12. Never use naive random pair placement without validation.
13. Player choices may still create dead ends.
14. Undo is primary dead-end recovery.
15. No Shuffle in v1.
16. Multiple Undo supported.
17. Solver-backed Hint.
18. No hard time limit.
19. Score secondary and shown on Results.
20. Track Time, Moves, Mistakes, Hints, Undos.
21. Clean = zero Hints.
22. Autosave / Continue.
23. Last 30 completed games per difficulty.
24. Pure board/solver logic separated from Vue.
25. Unicode emoji only.
26. Mobile/iPhone-first.
27. Existing Brain architecture.
28. No backend/database.
29. Full offline/PWA support.
30. Not part of Brain Benchmark v1.
