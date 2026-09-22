# Sequence Memory — Visual & Spatial Memory — Specification

## 1. Goal

A simple, mobile-first **Sequence Memory** game.

The player watches a sequence of cells flash on a grid, then reproduces the same sequence by tapping the cells in the correct order.

The sequence becomes progressively longer as the player succeeds.

The game primarily exercises:

- short-term visual memory
- visuospatial memory
- sequence/order memory
- sustained attention

The core rule should be immediately understandable:

> Watch the pattern, then repeat it in the same order.

---

## 2. Core game

V1 uses a **3×3 grid** containing nine identical cells.

Example:

```text
┌─────┬─────┬─────┐
│     │     │     │
├─────┼─────┼─────┤
│     │     │     │
├─────┼─────┼─────┤
│     │     │     │
└─────┴─────┴─────┘
```

At the beginning of a round, the game generates a sequence of grid positions.

Example:

```text
center → top-right → bottom-left
```

The game then flashes those cells one at a time.

After playback finishes, the player reproduces the sequence by tapping the cells in the same order.

If successful, the sequence grows by one step and the next level begins.

---

## 3. Difficulty

Keep difficulty simple.

| Difficulty | Grid | Starting sequence | Lives | Playback |
|---|---:|---:|---:|---|
| Easy | 3×3 | 3 | 3 | Slow |
| Medium | 3×3 | 3 | 2 | Normal |
| Hard | 3×3 | 3 | 1 | Faster |

Difficulty should primarily change:

- number of mistakes/lives allowed
- sequence playback speed

Do **not** increase the grid size in v1.

Keeping the same 3×3 grid makes results easier to understand and compare while avoiding tiny mobile tap targets.

Hard should be challenging but not frustrating.

---

## 4. Sequence progression

Every game begins at:

```text
Level 1
Sequence length: 3
```

Each successful level adds exactly one new step:

```text
Level 1 → 3 cells
Level 2 → 4 cells
Level 3 → 5 cells
Level 4 → 6 cells
...
```

Therefore:

```text
sequence length = level + 2
```

There is no fixed maximum level.

The game continues until the player runs out of lives.

---

## 5. Sequence generation

The sequence is generated incrementally.

At Level 1:

```text
[A, B, C]
```

After success, append one new random cell:

```text
[A, B, C, D]
```

Then:

```text
[A, B, C, D, E]
```

The existing sequence must remain unchanged.

This is important: each level extends the sequence the player already learned rather than generating a completely new sequence.

### Repeated cells

The same cell may appear multiple times in a sequence.

Example:

```text
center → top-left → center → bottom-right
```

This is valid.

However, avoid the **same cell appearing twice consecutively** in v1:

```text
center → center
```

because consecutive flashes on the same cell can be visually ambiguous.

When generating the next step, choose from the eight cells other than the immediately previous one.

---

## 6. Game phases

The game has clearly separated phases:

```text
READY
  ↓
PLAYBACK
  ↓
PLAYER INPUT
  ↓
SUCCESS / MISTAKE
  ↓
NEXT LEVEL or GAME OVER
```

### Ready

Before the first level:

```text
Ready?
```

Then use a short:

```text
3
2
1
```

countdown.

Subsequent levels do not need a full countdown.

Use a short message:

```text
Level 5
Watch...
```

before playback begins.

### Playback

Player input is disabled.

Cells flash according to the sequence.

### Player Input

After playback:

```text
Your turn
```

The grid becomes interactive.

### Result

Successful sequence:

```text
Correct!
```

then advance to the next level.

Mistake:

```text
Wrong
```

then apply the difficulty's life rule.

---

## 7. Playback timing

Suggested v1 timing:

| Difficulty | Flash ON | Gap |
|---|---:|---:|
| Easy | 600 ms | 250 ms |
| Medium | 450 ms | 200 ms |
| Hard | 350 ms | 150 ms |

A playback step therefore looks like:

```text
normal
  ↓
cell highlighted
  ↓
normal
  ↓
short gap
  ↓
next cell highlighted
```

The timing should remain constant throughout a game.

Do not automatically accelerate playback as the level increases.

Sequence length itself already increases difficulty.

---

## 8. Player input

During the input phase, the player taps cells in sequence.

Track:

```text
expected index
player selection
response time
correct / incorrect
```

Example:

Expected:

```text
2 → 7 → 4 → 9
```

Player:

```text
2 ✓
7 ✓
4 ✓
9 ✓
```

The level succeeds immediately after the final correct tap.

If the player taps an incorrect cell, stop accepting further input for that attempt immediately.

Do not require the player to finish entering a sequence that is already incorrect.

---

## 9. Lives and mistakes

### Easy

```text
3 lives
```

### Medium

```text
2 lives
```

### Hard

```text
1 life
```

An incorrect sequence costs one life.

If lives remain, replay the **same sequence**.

Do not generate a new sequence after a mistake.

Example:

```text
Level 6
Sequence length: 8

Wrong
Lives: 2 → 1

Retry Level 6
```

The player sees the same sequence again and gets another attempt.

When lives reach zero:

```text
Game Over
```

The highest successfully completed level remains the result.

---

## 10. Input feedback

Each player tap should produce brief visual feedback.

Correct tap:

```text
cell flashes/highlights
```

Incorrect tap:

```text
brief error state
```

Do not permanently mark the sequence on the board.

After each tap, the board returns to its normal state.

Feedback should be fast enough that it does not significantly slow input.

---

## 11. Input timing

Use `performance.now()` for timing.

For every player tap record:

```text
{
  level,
  sequenceIndex,
  cell,
  correct,
  responseTime
}
```

Response time is measured from:

- start of player-input phase for the first tap
- previous tap for subsequent taps

Do not show a live reaction-time counter while playing.

Timing is a secondary metric. Memory span is the primary result.

---

## 12. Primary result

The main measurement is:

```text
Longest sequence successfully completed
```

Example:

```text
Longest Sequence: 12
```

Also show:

```text
Highest Level: 10
```

Because:

```text
sequence length = level + 2
```

Longest Sequence is the primary personal-best metric.

---

## 13. End-of-game statistics

Results screen:

```text
Game Over

Difficulty          Medium
Highest Level       10
Longest Sequence    12
Correct Taps        71
Mistakes            2
Accuracy            97.3%
Average Tap Time    412 ms
Median Tap Time     365 ms

Best Sequence       14
```

Track:

- highest level completed
- longest sequence completed
- correct taps
- incorrect taps
- accuracy
- average correct tap time
- median correct tap time
- total game duration
- lives used

Primary RT metrics use **correct taps only**.

Median tap time is shown alongside average tap time because occasional hesitation can distort the mean.

---

## 14. Accuracy

Calculate:

```text
accuracy =
correct taps / (correct taps + incorrect taps) × 100
```

Playback does not count toward accuracy.

Retries contribute to the game's statistics.

---

## 15. Personal best

Personal bests are stored separately for:

```text
Easy
Medium
Hard
```

Primary comparison:

```text
longest successfully completed sequence
```

Tie-breakers:

1. fewer mistakes
2. higher accuracy
3. lower median correct tap time

Display:

```text
New Best!
```

when appropriate.

Do not compare personal-best results across difficulties.

---

## 16. Statistics

Track separately per difficulty:

- games played
- best sequence
- average longest sequence
- median longest sequence
- highest level
- average accuracy
- average tap time
- median tap time
- total correct taps
- total mistakes
- current play streak
- best play streak

The most meaningful long-term trend is:

```text
Longest Sequence
```

---

## 17. History

Keep the last **30 completed games** per difficulty.

Each entry:

```text
{
  difficulty,
  highestLevel,
  longestSequence,
  correctTaps,
  mistakes,
  accuracy,
  avgTapTime,
  medianTapTime,
  duration,
  completedAt
}
```

History filters:

```text
All | Easy | Medium | Hard
```

Show a simple trend of:

```text
Longest Sequence
```

over recent games.

---

## 18. Pause behavior

The game can be paused manually.

It also automatically pauses when the browser/app becomes hidden.

If the app becomes hidden during playback:

1. stop playback
2. hide the board
3. mark the level as interrupted

When resumed:

```text
Resume
```

then replay the current sequence from the beginning.

Do not resume halfway through a sequence.

If the app becomes hidden during player input, do the same: restart the current level after resume without costing a life.

This avoids penalizing interruptions such as phone calls or switching apps.

---

## 19. Autosave / Continue Game

Maintain one active game.

Store after:

- completing a level
- losing a life
- pausing
- application visibility change

Key:

```text
sequence-memory:active
```

Store:

```text
{
  difficulty,
  sequence,
  level,
  livesRemaining,
  correctTaps,
  mistakes,
  tapTimes,
  elapsedTime,
  phase,
  startedAt,
  updatedAt
}
```

When reopening an unfinished game:

```text
Continue Game
```

The current level always restarts from its playback phase.

Never restore halfway through playback or halfway through player input.

---

## 20. Persistence

Use browser `localStorage`.

```text
sequence-memory:active
sequence-memory:history
sequence-memory:stats:easy
sequence-memory:stats:medium
sequence-memory:stats:hard
```

No backend/database is required.

Data remains browser/device-specific.

---

## 21. Mobile-first UX

Mobile is the primary interface.

The game screen should remain extremely simple:

```text
Medium                  Level 7
Lives ♥ ♥

        ┌───┬───┬───┐
        │   │   │   │
        ├───┼───┼───┤
        │   │   │   │
        ├───┼───┼───┤
        │   │   │   │
        └───┴───┴───┘

              Watch...
```

During player input:

```text
              Your turn

              3 / 9
```

Requirements:

- large square grid
- large tap targets
- no scrolling during play
- fixed cell positions
- no numbers or labels inside cells
- strong but simple flash state
- no hover dependency
- disable accidental text selection
- avoid double-tap zoom where practical
- no decorative animation
- no live reaction-time display
- portrait-first layout
- desktop mouse/touch support

---

## 22. Visual design

All nine cells are visually identical when inactive.

Do not assign permanent:

- colors
- numbers
- symbols
- icons

to individual cells.

The player should remember **spatial position and order**, not semantic labels.

A cell has only temporary states:

```text
idle
playback-highlight
player-tap
correct-feedback
incorrect-feedback
```

Keep animations short and consistent.

---

## 23. Sound and haptics

V1 should not require sound.

The game must be fully playable with the iPhone muted.

Optional subtle haptic/audio feedback may be added later.

Do not use different sounds for different cells in v1 because that would add an auditory memory cue to what is intended to be a visual/spatial task.

---

## 24. About / How to Play

Explain simply:

> Watch the cells flash one at a time. When the sequence finishes, tap the same cells in exactly the same order.

Include a small interactive 3-step demonstration.

Example:

```text
Watch:

center
top-right
bottom-left

Your turn:

center → top-right → bottom-left
```

Explain:

- every successful level adds one new step
- repeated cells are possible
- mistakes cost lives
- retries replay the same sequence
- the goal is to remember the longest sequence possible

Practice/demo results are never stored.

---

## 25. Architecture

Keep the project consistent with the other games:

- **Vue 3** Composition API
- **Vite**
- single-page application
- no backend/API
- browser `localStorage`
- mobile-first
- Docker Compose
- `node:20-alpine`
- Vite development server
- bind-mounted source / hot reload
- `${DOCKER_UID:-1000}:${DOCKER_GID:-1000}` container user

Suggested structure:

```text
SequenceMemory/
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
    │   ├── MemoryGrid.vue
    │   ├── MemoryCell.vue
    │   ├── GameScreen.vue
    │   ├── ResultsScreen.vue
    │   ├── HistoryPage.vue
    │   └── AboutPage.vue
    ├── composables/
    │   ├── useSequenceMemory.js
    │   ├── useMemoryStorage.js
    │   └── useMemoryStats.js
    └── constants/
        └── difficulties.js
```

---

## 26. Game logic

Keep game state and sequence logic separate from presentation.

`useSequenceMemory.js` owns:

- sequence generation
- sequence extension
- playback state
- playback timing
- input validation
- level progression
- lives
- retry behavior
- tap timing
- pause/resume

Sequence cells can be represented as indexes:

```text
0 1 2
3 4 5
6 7 8
```

Example:

```javascript
[4, 2, 6, 4, 8]
```

means:

```text
center
top-right
bottom-left
center
bottom-right
```

---

## 27. Sequence generation and testing

Use a small deterministic random helper that can optionally accept a seed for automated testing.

Normal gameplay uses a random seed.

Internal tests should verify:

- Level 1 contains exactly 3 steps
- each successful level adds exactly one step
- previous sequence remains unchanged
- generated cell indexes are always 0–8
- consecutive duplicate cells are prevented
- retries do not modify the sequence
- losing the final life ends the game
- pause/resume restarts the current level safely

Seed support does not need to be exposed in the normal UI.

---

## 28. Offline / PWA support

The application must work completely offline after initial installation/cache.

Requirements:

- installable as an iPhone Home Screen PWA
- Web App Manifest
- Service Worker
- application-shell precaching
- no runtime CDN dependencies
- no external fonts/images required for gameplay
- all game assets bundled locally
- `localStorage` works offline
- active game can be continued offline
- history/statistics work offline
- installed application launches when Docker host, LAN, DNS and Internet are unavailable

The normal offline experience is the actual game.

Do not display an offline error page when the cached application is available.

### Offline cold-start acceptance test

After installing and launching the PWA once while online:

```text
1. Close the PWA completely.
2. Enable Airplane Mode.
3. Disable Wi-Fi.
4. Launch from the iPhone Home Screen.
5. Start and complete a game.
6. Close the PWA.
7. Reopen it while still offline.
8. Verify history and personal best remain available.
```

---

## 29. Future changes

Not part of v1:

- 4×4 grid
- Spatial Memory mode where several cells are shown simultaneously
- reverse sequence mode
- user-configurable playback speed
- adaptive playback speed
- custom starting sequence length
- challenge/daily seeded sequences
- sound mode
- haptic feedback
- achievements
- CSV/JSON history export
- server-side sync
- dark mode
- i18n

A simultaneous **Spatial Memory** mode should remain separate from Sequence Memory because it measures remembering locations without order.

---

## 30. Decisions for v1

1. **3×3 grid only.**
2. Easy / Medium / Hard.
3. Starting sequence length = **3**.
4. Every successful level adds exactly **one step**.
5. Existing sequence is preserved and extended.
6. No maximum sequence length.
7. Consecutive duplicate cells are prevented.
8. Easy = 3 lives.
9. Medium = 2 lives.
10. Hard = 1 life.
11. A mistake retries the **same sequence** if lives remain.
12. Difficulty changes playback speed and lives, not grid size.
13. Playback speed does not increase automatically with level.
14. Player input is disabled during playback.
15. First wrong tap immediately ends that attempt.
16. Primary metric = **longest successfully completed sequence**.
17. Record average and median correct tap time.
18. Use `performance.now()` for timing.
19. Pause/app-switch restarts the current level without costing a life.
20. Autosave one active game.
21. Keep last **30 completed games**.
22. Browser `localStorage`.
23. Mobile-first.
24. No backend/database.
25. Vue/Vite/Docker Compose architecture.
26. Full offline/iPhone PWA support.
27. No sound dependency.
28. Core sequence logic supports deterministic seeded testing.
