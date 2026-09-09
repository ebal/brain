# Switch Trail — Cognitive Flexibility & Visual Attention — Specification

## 1. Goal

A small, fast, mobile-first Trail Making / task-switching game for the Brain project.

The player taps spatially scattered targets in alternating order:

`1 → A → 2 → B → 3 → C ...`

before the time limit expires.

The game primarily exercises and tracks performance in visual search, processing speed, sequencing, sustained attention, and cognitive flexibility/task switching.

It is inspired by the Trail Making paradigm, but is a game and must not be presented as a clinical or diagnostic test.

## 2. Difficulty

| Difficulty | Targets | Sequence | Time limit |
|---|---:|---|---:|
| Easy | 12 | 1 → A ... → 6 → F | 30 s |
| Medium | 16 | 1 → A ... → 8 → H | 45 s |
| Hard | 24 | 1 → A ... → 12 → L | 90 s |

All scored modes use alternating numbers and letters. A numbers-only mode is unnecessary in v1 because that overlaps strongly with Schulte Tables.

Hard should remain challenging but enjoyable. Do not make it difficult through tiny targets or poor contrast.

## 3. Core game

Targets are randomly distributed inside a fixed play area.

Example:

```text
      B                    3

  1          D

                         A

        4           2

              C
```

The player follows:

`1 → A → 2 → B → 3 → C → 4 → D`

Targets remain completely fixed throughout the round. They never move after correct or incorrect taps.

Completed targets remain visible but become visually muted. Do not remove them, because changing the board would make later visual searches artificially easier.

## 4. Sequence generation

The logical sequence is deterministic for each difficulty. Only spatial positions are randomized.

Easy:

`1 A 2 B 3 C 4 D 5 E 6 F`

Medium:

`1 A 2 B 3 C 4 D 5 E 6 F 7 G 8 H`

Hard:

`1 A 2 B 3 C 4 D 5 E 6 F 7 G 8 H 9 I 10 J 11 K 12 L`

Every required target appears exactly once.

## 5. Board generation

Random placement must guarantee:

- no overlapping targets
- readable labels
- targets remain inside the safe play area
- minimum spacing between targets
- no targets under UI controls or iPhone safe areas
- practical mobile tap targets

Use rejection sampling or another simple placement method. If a valid layout cannot be produced after a reasonable number of attempts, restart generation.

Suggested minimum touch target: approximately **44×44 CSS px**.

Difficulty must come from density and switching, not tiny circles.

## 6. Starting a round

Flow:

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

During the countdown, target labels are hidden/obscured so the board cannot be pre-scanned.

At `GO!` reveal all targets, enable input, and start timing with `performance.now()`.

## 7. Player interaction

The expected target starts at `1`.

Correct taps advance the sequence:

`1 → A → 2 → B ...`

The entire circular target is tappable.

Display the required target:

```text
Find: B
```

This stays visible in all difficulties. The task should test switching/search rather than forcing the player to remember which category comes next.

## 8. Incorrect taps

Wrong target:

1. increment Errors
2. apply score penalty
3. show brief error feedback
4. do not advance the expected target
5. continue timing

There is no mistake-based game over.

Tapping empty board space does not count as an error in v1, avoiding penalties for minor touchscreen imprecision.

## 9. Time limits

Hard countdown:

- Easy: **30 s**
- Medium: **45 s**
- Hard: **90 s**

The round ends immediately when all targets are completed or time reaches zero.

Timing stops on the exact successful tap of the final target.

## 10. Score

Time deliberately affects score.

### Correct target

`+100`

### Incorrect target

`−50`

### Completion time bonus

Only if the entire trail is completed:

`floor(remainingSeconds) × 25`

### Clean completion bonus

If the trail is completed with zero errors:

`+250`

Formula:

```text
score =
  correctTargets × 100
  - errors × 50
  + completionTimeBonus
  + cleanBonus
```

Minimum displayed score is `0`.

Incomplete rounds receive **no time bonus**. This prevents a player from benefiting by doing very little and simply leaving unused time.

## 11. Example scoring

Easy clean completion:

```text
12 targets × 100        = 1200
8 seconds remaining ×25 =  200
clean completion         =  250
                           ----
                           1650
```

Easy, two errors, four seconds remaining:

```text
12 targets × 100        = 1200
2 errors × -50          = -100
4 seconds remaining ×25 =  100
clean bonus              =    0
                           ----
                           1200
```

Timeout after 9/12 with one error:

```text
9 × 100 - 50 = 850
```

No completion/time bonus.

## 12. Raw performance metrics

Keep the synthetic game score separate from cognitive/performance measurements.

Show:

### Game
- Score
- Completed / Timed Out
- Personal Best Score

### Performance
- completion time, if completed
- targets completed
- errors
- accuracy
- average transition time
- median transition time
- fastest transition
- slowest transition
- best completion time

## 13. Transition timing

For the first target:

`GO! → 1`

For subsequent targets:

`previous correct target → next correct target`

Example:

```text
1 → A    842 ms
A → 2   1194 ms
2 → B    733 ms
```

Incorrect taps do not reset the transition timer. A mistake therefore naturally increases that transition time while also being counted separately.

Store transition direction:

- number → letter
- letter → number

This enables future analysis without complicating the v1 results UI.

## 14. Accuracy

```text
accuracy =
correct taps /
(correct taps + incorrect taps)
× 100
```

Empty-space taps are ignored.

## 15. Timeout

At zero:

```text
TIME!

Targets: 17 / 24
```

Disable input immediately.

Timeout rounds are stored in history and retain their score, but cannot replace Best Completion Time.

## 16. Personal bests

Track separately by difficulty:

- **Best Score** — highest score
- **Best Completion Time** — fastest completed round

Equal-score tie-breakers:

1. completed beats timed-out
2. fewer errors
3. lower completion time
4. higher accuracy

## 17. History

Keep the last **30 rounds** per difficulty.

```text
{
  difficulty,
  score,
  completed,
  targetsCompleted,
  totalTargets,
  completionTime,
  timeLimit,
  errors,
  accuracy,
  avgTransitionTime,
  medianTransitionTime,
  fastestTransition,
  slowestTransition,
  completedAt
}
```

## 18. Statistics

Per difficulty track:

- games played
- games completed
- completion rate
- best score
- best completion time
- average/median score
- average/median completion time
- average errors
- average accuracy
- average/median transition time
- total targets completed
- clean completions

Do not combine difficulties into a universal score.

## 19. Pause / app switching

Manual pause is not required during active play.

If the app becomes hidden, automatically pause and hide the board.

On return:

```text
Round Paused

Resume
Restart
Quit
```

Resume preserves the exact board, sequence position, score, errors, and remaining time. Show a short 3-2-1 before revealing the board again.

Time spent hidden does not count.

## 20. Reproducibility

Board generation supports an internal deterministic seed:

`seed + difficulty → same layout`

Normal play uses random seeds.

Seed support is for automated tests, debugging, and future standardized Benchmark mode. It need not be exposed in v1.

## 21. Mobile-first UX

Suggested layout:

```text
Hard                 01:14
Score 850          Errors 1

Find: G

┌─────────────────────────┐
│      4             B    │
│                         │
│  F        7             │
│                   2     │
│       A                 │
│              H          │
│  1                 C    │
│          6              │
└─────────────────────────┘

Progress 13 / 24
```

Requirements:

- no scrolling during active play
- fixed target positions
- practical touch targets
- readable labels
- portrait-first
- no hover dependency
- no text selection
- avoid double-tap zoom
- timer and current target visible
- score secondary to the board
- desktop mouse support

## 22. Visual design

Use simple circles.

Numbers and letters use the same font, size, weight and target dimensions.

Do **not** permanently color-code numbers and letters. That would provide an extra category cue and make switching/search easier.

All uncompleted targets look equivalent except for their label.

## 23. Placement fairness

Random boards can naturally vary in difficulty.

For v1 enforce only sensible constraints:

- minimum target spacing
- no overlaps
- no clipping
- avoid extreme clustering where practical

Do not build a complicated spatial-normalization system.

Store the seed so unusual layouts can be reproduced.

## 24. About / How to Play

Explain:

> Tap the targets in alternating order: 1, A, 2, B, 3, C, and so on. Finish the trail before time runs out.

Include an untimed six-target practice:

`1 → A → 2 → B → 3 → C`

Practice has no score, history, or time limit and explains mistakes.

Mention that Switch Trail is inspired by the Trail Making task-switching paradigm, but do not call the game a clinical Trail Making Test.

## 25. Brain chooser entry

```text
Switch Trail

Alternate between numbers and letters before time runs out.
Cognitive flexibility & visual attention.
```

## 26. Architecture

Integrate with the **existing Brain Vue/Vite architecture** rather than redesigning the project.

Follow the repository's current component/composable/game-engine conventions after inspection.

Conceptually:

```text
components/switchtrail/
composables/switchtrail/
game/switchtrail/
```

Pure logic should include functions similar to:

```javascript
createTrailSequence(difficulty)
generateTrailLayout(sequence, bounds, seed)
validateLayout(layout)
getExpectedTarget(sequence, index)
calculateScore(result)
calculateTransitionStats(transitions)
```

## 27. Tests

Test at minimum:

### Sequence
- Easy = 12 targets
- Medium = 16
- Hard = 24
- alternating order is correct

### Layout
- all targets placed
- no duplicates
- no overlaps
- inside bounds
- deterministic seed reproduces layout

### Input
- correct tap advances
- wrong target does not advance
- wrong target increments errors
- empty-space tap does not count as error
- final correct target completes round

### Timing
- timeout ends round
- final target stops timer
- app hiding pauses timer
- resume preserves layout/progress

### Score
- correct = +100
- error = -50
- incomplete = no time bonus
- complete = remaining-seconds bonus
- clean complete = +250
- score never displays below zero

### Statistics
- accuracy
- average/median transition time
- best score
- fastest completion

## 28. Persistence

Follow Brain's existing persistence conventions rather than introducing a parallel architecture.

Conceptually:

```text
switchtrail:history:easy
switchtrail:history:medium
switchtrail:history:hard
```

If Brain now has a common session/history layer, use it.

Do not migrate unrelated games merely to add Switch Trail.

## 29. Offline / PWA

Switch Trail must work completely offline inside the existing Brain PWA.

Requirements:

- no gameplay network requests
- no CDN assets
- no external fonts/images
- local board generation
- local scoring
- local history/statistics
- available after Brain has been cached
- cold-start usable in iPhone Airplane Mode

The game must introduce **zero new runtime network dependencies**.

## 30. Benchmark mode (implemented)

Suite-wide Benchmark mode (see the top-level app spec) now includes Switch Trail, using:

```text
Medium
16 targets
45 seconds
```

No fixed seed — each benchmark run gets a freshly generated board, same as normal play. Only the
difficulty (Medium) and variant (Classic, not Random Color) are pinned. A benchmark run is also
recorded as a normal play session (own history/stats/best), plus separately in benchmark history,
matching every other benchmark-eligible game.

## 31. Future changes

Not part of v1:

- numbers-only Part A
- shapes/colors
- reverse trails
- daily seeded challenge
- adaptive difficulty
- custom target counts
- custom timers
- transition heatmaps
- visible connecting path
- multiplayer/global leaderboards

## 32. Final v1 decisions

1. Name: **Switch Trail**.
2. Inspired by Trail Making/task switching, not a clinical test.
3. All scored modes use number/letter alternation.
4. Easy = **12 targets / 30 s**.
5. Medium = **16 targets / 45 s**.
6. Hard = **24 targets / 90 s**.
7. Targets never move.
8. Completed targets remain visible but muted.
9. Wrong target = error and −50.
10. Correct target = +100.
11. Empty-space taps are ignored.
12. No mistake-based game over.
13. Current required target remains visible.
14. Completion bonus = **25 × whole seconds remaining**.
15. Clean completion bonus = **250**.
16. Incomplete rounds receive no time bonus.
17. Score cannot display below zero.
18. Score remains separate from raw metrics.
19. Track average and **median transition time**.
20. Track Best Score and Best Completion Time separately.
21. Keep last **30 rounds** per difficulty.
22. Use `performance.now()`.
23. App switching pauses/hides the board.
24. Resume preserves the same board and progress.
25. Deterministic board seeds supported internally.
26. Mobile/iPhone-first.
27. Integrate with existing Brain architecture.
28. No backend.
29. Full offline/PWA support.

## 33. v2 addition: Extreme (Dynamic) difficulty

Added after initial v1 implementation and playtesting, at the user's request. A fourth
difficulty, **Extreme**, sits alongside Easy/Medium/Hard:

- Same target count and time limit as Hard: **24 targets / 90 s**.
- `dynamic: true` — after every correct tap, every still-**pending** target is re-placed at a
  brand-new random position (same rejection-sampling/minSpacing rules as initial board
  generation). Already-**completed** (muted) targets never move — only the remaining, still-live
  targets reshuffle.
- This is a deliberate, scoped exception to §3's "targets remain completely fixed" rule — that
  rule still holds exactly as written for Easy/Medium/Hard. Extreme is the one difficulty where
  positional memory is intentionally removed from the task, leaving pure continuous visual
  search/switching.
- Scoring, timing, errors, transitions, history and personal bests all work identically to Hard —
  no formula changes. Extreme is tracked as its own difficulty bucket (own best score/time,
  own history), not merged with Hard's.
- Reshuffles reuse the round's own seeded RNG (not a fresh seed each time), so a seeded Extreme
  round's entire sequence of reshuffles stays reproducible, consistent with §20.
- If a reshuffle can't find valid positions for the last few pending targets (rare, dense-endgame
  packing — measured well under 0.1% of correct taps in simulation), that single reshuffle is
  skipped rather than failing the round: positions simply stay put until the next correct tap.

## 34. v2 addition: Random Color variant

Added after Extreme, at the user's request. A single checkbox, **Random Color**, available at
every difficulty (Easy/Medium/Hard/Extreme, independent of Extreme's reshuffling):

- Each target is assigned a random background color once, when it first appears on the board.
- Color is a property of the **target's label**, not a screen position — there are no fixed
  "slots" in Switch Trail's free-form layout the way there are in a grid-based game. When Extreme
  repositions a pending target, its color travels with it unchanged.
- Only applies while a target is `pending`; the existing `done` (muted) and wrong-tap flash
  feedback colors always take priority, so state feedback is never obscured.
- Colors are hidden along with labels during the pre-round countdown (§6), consistent with not
  letting the board be pre-scanned before `GO!`.
- This is a deliberate, narrow exception to §22's "do not permanently color-code numbers and
  letters" — that rule is about a color cue correlated with the number/letter *category*, which
  would leak an unwanted hint. A per-target random color uncorrelated with category adds visual
  noise instead, the same role it plays in Schulte Tables' own Random Color variant.
- Scoring, timing and the underlying board-generation rules are unchanged. Random Color is tracked
  as its own variant bucket per difficulty (own best score/time, own history), so it can never
  distort or be distorted by plain results, mirroring how Schulte Tables keeps its Random
  Color/Random Position variants separate from Classic.

## 35. v3 addition: Untimed variant

Added after Random Color, at the user's request — the same stress-free/kid-friendly motivation as
Mental Rotation's Timed/Untimed mode. A second independent checkbox, **Untimed**, available at
every difficulty (including Extreme) and combinable with Random Color, giving four variant buckets
total: Classic, Random Color, Untimed, and Untimed + Color.

- The round **never times out**; it only ends by completing the whole trail (§9's "ends
  immediately when all targets are completed or time reaches zero" now reads "... or time reaches
  zero, if the round is timed"). No hard cap on how long a round can run.
- No countdown shown during play. The on-screen clock counts *up* (elapsed time) instead of down,
  purely informational — the same non-pressuring framing Schulte Tables already uses for its own
  clockless rounds.
- Live Score is hidden during play (Errors and Progress remain visible) — Score itself is
  unaffected by this, it just isn't shown until the round ends, removing one more visible pressure
  cue without changing how it's calculated.
- Scoring formula is unchanged (§10), but an Untimed round's `remainingSeconds` is always `0` —
  there's no time limit to have "remaining", so the completion-time bonus term never applies. The
  zero-error clean-completion bonus (+250) still applies exactly as before; only the time bonus is
  removed. This isn't a scoring exception carved out for Untimed — it naturally falls out of the
  existing formula once "remaining time" is undefined.
- Combines cleanly with Extreme (reshuffling) and Random Color — both are completely independent
  of whether the round has a time limit.
- Tracked as its own variant bucket per difficulty (own best score/time, own history), never mixed
  with timed results, mirroring how Random Color and Schulte's variants are kept separate.
- Not available from Benchmark Mode — a benchmark run always pins Classic (plain timed), same as
  before.
