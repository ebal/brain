# Memory Pairs — Visual Memory & Spatial Recall — Specification

## 1. Goal

A small, fast, mobile-first Memory Matching / Concentration game for the Brain project.

The board contains face-down tiles. Every emoji appears exactly twice. The player flips two tiles at a time and tries to find all matching pairs as quickly and efficiently as possible.

The game primarily exercises and tracks performance in visual memory, spatial recall, associative memory, sustained attention, and search strategy.

Core rule:

> Flip two tiles. If the emoji match, the pair stays revealed. If they do not match, remember where they are and try again.

This is a casual cognitive game, not a clinical memory assessment.

## 2. Difficulty

| Difficulty | Grid | Tiles | Pairs |
|---|---:|---:|---:|
| Easy | 4×3 | 12 | 6 |
| Medium | 4×4 | 16 | 8 |
| Hard | 6×4 | 24 | 12 |
| Very Hard | 6×5 | 30 | 15 |
| Extreme | 6×6 | 36 | 18 |

Difficulty increases through the amount of spatial information the player must remember.

Do not make Hard difficult through tiny tiles, poor contrast, or visually ambiguous emoji.

## 3. Core game

All tiles begin face down.

```text
┌────┬────┬────┬────┐
│ ?  │ ?  │ ?  │ ?  │
├────┼────┼────┼────┤
│ ?  │ ?  │ ?  │ ?  │
├────┼────┼────┼────┤
│ ?  │ ?  │ ?  │ ?  │
└────┴────┴────┴────┘
```

First tap:

`? → 🐶`

Second tap:

`? → 🐱`

Mismatch: both remain visible briefly, then flip face down.

Match:

`🐶 + 🐶 → ✓`

The matching pair remains revealed.

The round ends when every pair is found.

## 4. Emoji pool

Use standard Unicode emoji defined locally in application code.

Example pool:

```text
🐶 🐱 🦊 🐼 🐸 🐵
🍎 🍋 🍇 🍓 🥝 🍒
⚽ 🏀 🎾 🎲 🚗 🚀
🌞 ⭐ 🌈 🔥 💎 🎈
```

For each game:

1. select the required number of unique emoji
2. duplicate each exactly once
3. shuffle the resulting tiles
4. place them into the grid

Prefer visually distinct emoji. Avoid nearly identical hearts/faces or other combinations where tiny visual details create unnecessary eyesight difficulty.

Avoid obscure emoji, flags, skin-tone variants, and complex ZWJ sequences where practical.

No remote image pack is required.

## 5. Board generation

For `N` pairs:

```text
select N unique emoji
duplicate each
shuffle 2N tiles
```

Use Fisher-Yates or equivalent unbiased shuffling.

Validate:

```text
Easy   → 12 tiles / 6 unique emoji / exactly 2 each
Medium → 16 tiles / 8 unique emoji / exactly 2 each
Hard   → 24 tiles / 12 unique emoji / exactly 2 each
Very Hard → 30 tiles / 15 unique emoji / exactly 2 each
Extreme → 36 tiles / 18 unique emoji / exactly 2 each
```

Tile positions never change after the game starts.

## 6. Reproducibility

Support an internal deterministic seed:

`seed + difficulty → same emoji selection + same layout`

Normal play uses a random seed.

Seed support is for automated testing, debugging, future Daily Challenges, and future Brain Benchmark support.

## 7. Starting a game

```text
Choose difficulty
        ↓
Generate board
        ↓
3
2
1
        ↓
GO!
```

Do not reveal the board during countdown.

At GO:

- enable input
- start timer
- leave every tile face down

There is no initial memorization preview.

Use `performance.now()` for timing.

## 8. Tile interaction

Tile states:

```text
face-down
revealed
matched
mismatch-feedback
```

First tap reveals one tile.

Second tap reveals another and completes one Move.

If matching:

- increment Pairs Found
- leave both visible
- mark both matched

If mismatching:

- increment Mistakes
- leave both visible briefly
- disable further tile selection during feedback
- flip both face down

Matched tiles cannot be selected again.

Tapping the currently revealed first tile again does nothing.

## 9. Mismatch delay

Keep a mismatched pair visible for approximately:

`800 ms`

The timer continues during this delay.

The delay is identical across difficulties.

## 10. Moves

A **Move** is one completed two-tile attempt.

```text
🐶 + 🐶 = 1 Move, match
🐶 + 🐱 = 1 Move, mistake
```

A single first tile does not count until the second tile is selected.

## 11. Mistakes

A Mistake is a Move containing two different emoji.

`mistakes = mismatched moves`

Mistakes are therefore a subset of Moves.

There is no mistake-based game over.

## 12. Minimum moves

The theoretical minimum is one Move per pair:

```text
Easy      = 6
Medium    = 8
Hard      = 12
Very Hard = 15
Extreme   = 18
```

This is useful for efficiency calculation, but the UI must not imply that an unseen shuffled board is normally expected to be solved in the theoretical minimum.

## 13. Timer

Use a count-up timer:

```text
00:42
01:17
02:06
```

There is no hard time limit in v1.

Time affects score, giving speed an incentive without preventing the player from finishing.

Timing starts at GO and stops immediately when the final pair is confirmed.

## 14. Score philosophy

Score rewards:

```text
completion
+
fewer moves
+
faster time
+
fewer mistakes
```

Score is a game metric, not a cognitive measurement.

Always show raw Time, Moves, Mistakes, and Move Efficiency separately.

## 15. Score formula

Base score:

```text
Easy        3000
Medium      5000
Hard        8000
Very Hard  11000
Extreme    14000
```

Penalties:

```text
-25 per elapsed whole second
-75 per extra Move above theoretical minimum
-100 per Mistake
```

Formula:

```text
extraMoves = max(0, moves - pairs)

score =
  baseScore
  - floor(elapsedSeconds) × 25
  - extraMoves × 75
  - mistakes × 100
```

Minimum displayed score:

`0`

A mismatch is both an extra Move and a Mistake, so it receives a stronger effective penalty. This intentionally discourages random guessing.

## 16. Score examples

Easy, 6 pairs, 32 seconds, 9 Moves, 3 Mistakes:

```text
Base                         3000
Time 32 × 25                -800
Extra Moves (9-6) × 75      -225
Mistakes 3 × 100            -300
                              ---
Score                         1675
```

Medium, 8 pairs, 45 seconds, 11 Moves, 3 Mistakes:

```text
Base                         5000
Time 45 × 25               -1125
Extra Moves 3 × 75          -225
Mistakes 3 × 100            -300
                              ---
Score                         3350
```

## 17. Move Efficiency

Calculate:

```text
moveEfficiency =
minimumMoves / actualMoves × 100
```

Example:

```text
6 pairs
9 moves

6 / 9 × 100 = 66.7%
```

The theoretical maximum is 100%.

Call this **Move Efficiency**, not memory ability or a clinical memory score.

## 18. Results

Example:

```text
Board Complete!

Difficulty        Medium
Score             3350
Time              00:45
Moves             11
Mistakes          3
Move Efficiency   72.7%
Pairs             8 / 8

Best Score        3610
Best Time         00:39
Best Efficiency   80.0%
```

Separate Game metrics from Performance metrics.

## 19. Personal bests

Track separately per difficulty:

- Best Score
- Best Completion Time
- Best Move Efficiency

Equal-score tie-break:

1. fewer Moves
2. fewer Mistakes
3. faster completion

One round may set multiple personal bests.

## 20. History

Keep the last **30 completed games** per difficulty.

```text
{
  difficulty,
  seed,
  score,
  completionTime,
  moves,
  mistakes,
  moveEfficiency,
  pairs,
  completedAt
}
```

History filters:

`All | Easy | Medium | Hard | Very Hard | Extreme`

Useful trends:

- Score
- Completion Time
- Move Efficiency

Use Score as the default sparkline if the existing Brain UI expects one.

## 21. Statistics

Track per difficulty:

- games played/completed
- best score
- best completion time
- best Move Efficiency
- average/median score
- average/median completion time
- average/median Moves
- average Mistakes
- average Move Efficiency
- total pairs found

Average/median figures are computed over each difficulty's most recent 50 completions, kept
separately from the 30-entry history cap above, so long-run averages don't require retaining
unbounded history.

Do not combine difficulties into a universal score.

## 22. Pause and app switching

Support manual Pause and automatically pause when the PWA/browser becomes hidden.

When paused:

- stop active timing
- hide unmatched tile faces
- disable interaction

Display:

```text
PAUSED

Resume
Restart
Quit
```

On Resume:

- short 3-2-1
- same board
- unmatched tiles face down
- matched pairs remain visible
- continue timing

If paused with one tile selected, cancel the partial selection without incrementing Moves or Mistakes.

If hidden during mismatch feedback, restore both unmatched tiles face down on resume.

## 23. Autosave / Continue

Maintain one active Memory Pairs game.

Save after:

- completed Match
- completed Mismatch
- Pause
- visibility change

Conceptual state:

```text
{
  difficulty,
  seed,
  board,
  matchedTileIds,
  moves,
  mistakes,
  pairsFound,
  elapsedTime,
  startedAt,
  updatedAt
}
```

Do not persist half-finished two-card Moves.

Continue restores the same board with matched pairs preserved and every unmatched tile face down.

## 24. Mobile-first UX

Mobile/iPhone is primary.

Easy: 4 columns × 3 rows.

Medium: 4 × 4.

Hard logically contains 6×4 / 24 tiles, but portrait rendering may use **4 columns × 6 rows** to keep tiles comfortably large.

Very Hard contains 6×5 / 30 tiles and may render as **5 columns × 6 rows** in portrait.

Extreme contains 6×6 / 36 tiles. The implementation must calculate the largest practical square tile size that fits the available viewport while keeping emoji readable and tap targets usable.

Responsive transposition is allowed; pair count and tile count never change. Higher difficulty must come from remembering more tile locations, not from faster mismatch hiding or deliberately poor usability.

Requirements:

- no normal active-play scrolling
- large reliable tap targets
- clear emoji
- fixed tile positions
- matched state obvious
- no hover dependency
- disable text selection
- avoid double-tap zoom
- Time/Moves/Score visible but secondary
- desktop mouse support

## 25. Visual design

Use simple rounded tiles.

All face-down tiles look identical.

No permanent tile numbers or IDs.

Face-up tiles show only the emoji.

States:

```text
face-down       neutral
revealed        highlighted
matched         visible but subtly completed
mismatch        brief error state
```

Never remove matched tiles. Board geometry stays fixed.

## 26. About / How to Play

Explain:

> Flip two tiles and find matching emoji. Matching pairs stay visible. If they do not match, remember their positions before they flip back. Find every pair using as few moves and as little time as possible.

Explain:

- Move = two flipped tiles
- Mistake = two different emoji
- Time affects Score
- Extra Moves affect Score
- Mistakes affect Score
- fewer Moves improves Move Efficiency

Include a tiny untimed 2×2 practice.

Practice has no Score, History, or Timer.

## 27. Brain chooser entry

```text
Memory Pairs

Flip tiles and find matching emoji pairs.
Visual memory & spatial recall.
```

## 28. Architecture

Integrate with the existing Brain Vue/Vite project and follow current repository conventions.

Do not redesign the suite for this game.

Conceptually:

```text
components/memorypairs/
composables/memorypairs/
constants/memorypairs/
```

Useful pure functions:

```javascript
selectEmojiPairs(count, pool, rng)
createMemoryDeck(pairCount, seed)
shuffleMemoryDeck(deck, rng)
calculateMemoryScore(result)
calculateMoveEfficiency(pairs, moves)
```

## 29. Tests

Test at minimum:

### Deck
- Easy = 12 tiles / 6 pairs
- Medium = 16 / 8
- Hard = 24 / 12
- Very Hard = 30 / 15
- Extreme = 36 / 18
- exactly two copies per emoji
- deterministic seed reproduces board

### Interaction
- first tile reveals
- same tile cannot form a pair with itself
- second tile completes one Move
- Match remains visible
- Mismatch increments Mistakes
- Mismatch flips back
- matched tiles cannot be selected
- third selection blocked during mismatch delay
- final Match completes game

### Moves
- two-tile attempt = one Move
- one tile alone = no Move
- Mismatch = one Move + one Mistake
- Match = one Move + zero Mistakes

### Score
- time reduces Score
- extra Moves reduce Score
- Mistakes reduce Score
- Score never below zero
- correct base score by difficulty

### Efficiency
- theoretical minimum = 100%
- extra Moves reduce efficiency

### Pause
- timer stops
- partial selection cancelled
- layout unchanged
- matches preserved
- unmatched tiles hidden

## 30. Persistence

Follow Brain's existing persistence/session conventions.

Conceptually:

```text
memorypairs:active
memorypairs:history:easy
memorypairs:history:medium
memorypairs:history:hard
memorypairs:history:very-hard
memorypairs:history:extreme
memorypairs:stats:easy
memorypairs:stats:medium
memorypairs:stats:hard
memorypairs:stats:very-hard
memorypairs:stats:extreme
```

If Brain already has shared history/session infrastructure, integrate with it instead.

Do not migrate unrelated games merely for Memory Pairs.

## 31. Offline / PWA

Memory Pairs must work completely offline in the existing Brain PWA.

Requirements:

- emoji stored locally in source
- zero gameplay network requests
- no CDN assets
- no remote images
- no external fonts required
- local board generation/scoring
- local persistence
- active game resumable offline
- cold-start usable in iPhone Airplane Mode after the current Brain build is cached

## 32. Future Benchmark compatibility

Keep seeded generation compatible with future Brain Benchmark mode.

A future benchmark might use:

```text
Memory Pairs Benchmark v1
Medium
8 pairs
versioned fixed seed pool
```

Do not always reuse one identical board because repeated exposure would create a strong practice/memorization effect.

A future benchmark should rotate through a versioned seed pool.

## 33. Future changes

Not part of v1:

- Daily Challenge
- themed emoji packs
- larger boards
- time-attack mode
- limited lives
- combo bonuses
- sound/haptics
- multiplayer
- global leaderboards
- replay/heatmaps
- custom image cards

## 34. Final v1 decisions

1. Name: **Memory Pairs**.
2. Emoji instead of image cards.
3. Easy = **4×3 / 6 pairs**.
4. Medium = **4×4 / 8 pairs**.
5. Hard = **6×4 / 12 pairs**.
6. Very Hard = **6×5 / 15 pairs**.
7. Extreme = **6×6 / 18 pairs**.
8. Exactly two copies of every selected emoji.
9. Tile positions never change.
10. No initial preview.
11. Move = completed two-tile attempt.
12. Mistake = mismatched Move.
13. Mismatch visible for approximately **800 ms**.
14. No mistake-based game over.
15. No hard time limit.
16. Time, Moves, and Mistakes all affect Score.
17. Base scores: **3000 / 5000 / 8000 / 11000 / 14000**.
18. Time penalty = **25 per whole second**.
19. Extra-Move penalty = **75**.
20. Mistake penalty = **100**.
21. Minimum Score = **0**.
22. Track **Move Efficiency** separately.
23. Track Best Score, Best Time, Best Efficiency.
24. Keep last **30 games** per difficulty.
25. Use `performance.now()`.
26. Pause hides unmatched information.
27. Partial Moves cancel safely on pause.
28. Autosave one active game.
29. Deterministic seeded boards supported internally.
30. Mobile/iPhone-first.
31. Integrate with existing Brain architecture.
32. No backend/database.
33. Full offline/PWA support.