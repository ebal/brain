# Mental Rotation — Spatial Reasoning & Visualization — Specification

## 1. Goal

Add a small, fast, mobile-first **Mental Rotation** game to the Brain project.

The player sees one reference shape and several candidate shapes. One candidate is the same shape after rotation; the others are mirrored or structurally different distractors.

The player must identify the matching rotated shape as quickly and accurately as possible.

The game primarily exercises and tracks performance in:

- spatial reasoning
- mental visualization
- spatial transformation
- visual discrimination
- processing speed
- sustained attention

This is a cognitive game inspired by classic mental-rotation tasks. It is **not** a clinical, diagnostic, IQ, or intelligence test.

---

## 2. Core rule

Show:

```text
REFERENCE

      ■
      ■■■
        ■


WHICH IS THE SAME SHAPE?

   A       B       C       D
```

Exactly one candidate is a rotation of the reference shape.

Distractors may be:

- mirrored versions
- structurally modified versions
- rotated versions of a mirrored shape

The correct answer must always be geometrically equivalent to the reference under **rotation only**.

Reflection/mirroring does not count as the same shape.

---

## 3. Why this fits Brain

Mental Rotation adds a cognitive area not strongly represented by the existing games:

```text
spatial manipulation / mental transformation
```

The task should remain:

- quick to understand
- short to play
- touch friendly
- deterministic/testable
- fully local
- completely offline
- visually simple

Do not turn it into a 3D graphics project.

V1 uses **2D shapes rendered locally with SVG/CSS**.

---

## 4. Difficulty

Use three difficulty levels.

| Difficulty | Choices | Shape complexity | Rotation angles | Round |
|---|---:|---|---|---|
| Easy | 2 | Simple | 90° increments | 30 s |
| Medium | 3 | Moderate | 90° increments | 45 s |
| Hard | 4 | Complex | mixed 45°/90° increments | 60 s |
| Very Hard | 4 | Most complex | mixed 45° increments + stronger distractors | 90 s |

Difficulty comes from:

- more candidate choices
- more complex asymmetric shapes
- stronger mirrored distractors
- larger angular differences
- denser visual comparison

Do not make difficulty through tiny shapes, low contrast, or ambiguous rendering.

---

## 5. Round model

The game is a **time-limited continuous round**.

At `GO!`, present the first trial.

After each answer:

1. classify response
2. record reaction time
3. show brief feedback
4. present the next trial
5. continue until time expires

There is no fixed number of trials.

The number completed during the time limit is itself part of performance.

Time limits:

```text
Easy      30 seconds
Medium    45 seconds
Hard      60 seconds
Very Hard 90 seconds
```

---

## 6. Shape representation

Represent shapes as connected cells on a small square lattice.

Example:

```text
[
  [0,0],
  [0,1],
  [1,1],
  [2,1],
  [2,2]
]
```

Normalize shapes so equivalent translations map to the same canonical representation.

This makes rotation/mirroring logic deterministic and easy to unit test.

V1 should use a curated local library of validated base shapes rather than unrestricted procedural generation.

---

## 7. Shape requirements

Every base shape used in scored play must be:

- connected
- visually clear
- asymmetric enough for rotation to matter
- not rotationally symmetric in a way that makes the answer ambiguous
- not reflection-equivalent when that would make mirrored distractors ambiguous
- validated against all candidate transformations

Avoid shapes where:

```text
rotate(shape) == shape
```

for multiple meaningful angles unless the trial remains unambiguous.

Also avoid shapes where a mirror can become identical through rotation.

The generator must prove there is exactly **one correct candidate**.

---

## 8. Rotation

Support these transformations:

```text
0°
45°
90°
135°
180°
225°
270°
315°
```

However, square-cell/polyomino-style shapes naturally support 90° rotation without interpolation.

Therefore v1 may use two rendering families:

### Easy

Grid/polyomino shapes:

```text
0°
90°
180°
270°
```

### Medium / Hard / Very Hard

SVG polygon/path shapes designed to support:

```text
45° increments
```

If supporting arbitrary 45° rotations materially complicates robust shape generation, use 90° increments for all difficulties in the first implementation.

**Correctness and unambiguous trials are more important than angle variety.**

Do not introduce raster image rotation.

---

## 9. Mirroring

Generate a mirrored form of the reference across one axis:

```text
horizontal
or
vertical
```

Then optionally rotate the mirrored form.

A mirrored-and-rotated candidate remains **incorrect**.

This is the primary distractor type.

Example:

```text
reference
    ↓
mirror
    ↓
rotate 90°
    ↓
distractor
```

---

## 10. Candidate generation

For every trial:

1. select a validated base shape
2. select a reference orientation
3. generate one correct rotated equivalent
4. generate required distractors
5. randomize candidate positions
6. verify exactly one candidate is rotation-equivalent to the reference

Easy:

```text
1 correct
1 distractor
```

Medium:

```text
1 correct
2 distractors
```

Hard:

```text
1 correct
3 distractors
```

Very Hard:

```text
1 correct
3 strong distractors
```

Very Hard should not add more than four choices. Its difficulty comes from more complex shapes, mixed rotation angles, and more convincing mirrored/structural distractors rather than crowding the mobile screen.

Do not rely on visual assumptions. Validate candidate equivalence mathematically.

---

## 11. Distractors

Preferred distractors:

1. mirrored + rotated reference
2. subtly structurally modified shape
3. alternative mirrored orientation

A structural distractor may move/remove/add one component only when it remains visually plausible and clearly different under mathematical comparison.

Avoid obvious nonsense distractors.

Hard should require actual mental comparison rather than simply spotting the candidate with a different number of components.

---

## 12. Trial presentation

Suggested portrait layout:

```text
Mental Rotation             00:34
Score 1,240                 8 / 10

REFERENCE

          ┌───────┐
          │ shape │
          └───────┘


WHICH MATCHES?


     A              B

   [shape]        [shape]


     C              D

   [shape]        [shape]
```

Easy may display candidates in one row or two large buttons.

Medium/Hard should prioritize large, readable touch targets over squeezing everything horizontally.

---

## 13. Interaction

The entire candidate card is tappable.

When the player selects a candidate:

- lock further input immediately
- record reaction time
- classify correct/incorrect
- show brief feedback
- advance to next trial

Do not require a Submit button.

Candidate positions are randomized per trial so the correct answer is not associated with a fixed screen location.

---

## 14. Feedback

Correct:

```text
✓
```

Incorrect:

```text
✕
```

Suggested feedback duration:

```text
250–350 ms
```

Do not display a lengthy explanation during timed play.

Detailed trial information may be available after the round if useful.

The timer continues during feedback unless implementation testing shows this unfairly consumes a meaningful part of short rounds. If feedback consumes round time, keep it identical across all trials and difficulties.

---

## 15. Timing

Use `performance.now()`.

Reaction time starts when the complete trial is visible and interactive.

Reaction time ends when the candidate tap is registered.

Store RT in milliseconds.

Primary RT statistics use **correct trials only**.

Record incorrect RT separately if useful, but do not allow fast guessing to make the primary RT look better.

---

## 16. Time expiration

When the round timer reaches zero:

```text
TIME!
```

If no candidate has yet been selected for the current trial, discard that incomplete trial from accuracy/RT statistics.

Do not classify it as an incorrect answer.

Disable input and show Results.

---

## 17. Score

Score rewards:

```text
correctness
+
speed
```

Suggested scoring:

### Correct answer

```text
+100
```

### Incorrect answer

```text
-50
```

### Speed bonus

For each correct answer:

```text
RT < 750 ms     +30
RT < 1250 ms    +20
RT < 2000 ms    +10
RT >= 2000 ms    +0
```

Only one speed bonus tier applies.

Minimum displayed score:

```text
0
```

The thresholds should be treated as initial tuning values and adjusted after real mobile play-testing.

---

## 18. Why speed affects score

Mental Rotation naturally involves a speed/accuracy tradeoff.

The player should not maximize score simply by taking unlimited time on every shape.

However, the raw measurements remain more meaningful than the synthetic score.

Always keep:

```text
Accuracy
Median Correct RT
Correct / Wrong
```

visible separately.

---

## 19. Rotation-angle metrics

For each trial store:

```text
rotationAngle
```

This allows future/Results analysis such as:

```text
90° median RT     820 ms
180° median RT   1130 ms
```

Do not overemphasize this on the main Results screen in v1.

Store the data because response time by angular difference is one of the most interesting properties of mental-rotation performance.

---

## 20. Trial data

Store per completed trial:

```text
{
  shapeId,
  referenceRotation,
  correctRotation,
  angularDifference,
  candidateCount,
  correctCandidate,
  selectedCandidate,
  correct,
  reactionTime
}
```

Do not persist full SVG markup per trial when stable `shapeId` + transformations can reproduce it.

---

## 21. End-of-round results

Example:

```text
Time!

Score              1,860
Accuracy             87%
Correct            13 / 15
Wrong                   2
Median RT          1,140 ms
Average RT         1,260 ms

Best Score           2,010
Best Accuracy           93%
```

Primary visual hierarchy:

### Game

- Score
- Personal Best

### Performance

- Accuracy
- Correct / Wrong
- Median correct RT
- Average correct RT

Secondary Details may include:

- RT by rotation angle
- fastest correct RT
- trial count

---

## 22. Personal bests

Track separately per difficulty:

- Best Score
- Best Accuracy
- Best Median RT with a minimum accuracy threshold

Do not allow a very fast but inaccurate round to become `Best RT`.

Suggested requirement:

```text
accuracy >= 80%
```

for RT personal-best eligibility.

Tie-break equal scores by:

1. higher accuracy
2. lower median correct RT
3. more correct answers

---

## 23. History

Keep the last **30 rounds** per difficulty.

Each entry:

```text
{
  difficulty,
  score,
  accuracy,
  correct,
  wrong,
  trialsCompleted,
  avgRT,
  medianRT,
  duration,
  completedAt,
  metricVersion
}
```

Per-trial details may remain in the current session only unless Brain's existing history model supports them efficiently.

---

## 24. Statistics

Track separately per difficulty:

- games played
- best score
- average/median score
- best accuracy
- average accuracy
- best eligible median RT
- average/median correct RT
- total trials
- total correct
- total wrong

Do not combine difficulty levels into one universal Mental Rotation score.

---

## 25. Pause / app switching

Because rounds are short and timed, manual Pause is not required.

If the PWA becomes hidden:

- pause timer
- hide current trial
- mark it interrupted

On Resume:

```text
3
2
1
```

then discard the interrupted trial and generate a fresh trial.

Do not resume a partially viewed shape because the player may have had extra study time while the app was backgrounded.

The interrupted trial does not affect score, accuracy, or RT.

---

## 26. Practice mode

Provide a short untimed practice.

Practice should explain:

> Find the shape that is the same as the reference after rotation. A mirrored shape is not the same.

Show at least:

1. obvious rotated match
2. mirrored distractor
3. rotated mirrored distractor

Practice has:

- no timer
- no score
- no history
- explanatory feedback

---

## 27. About / How to Play

Suggested explanation:

> Look at the reference shape and choose the candidate that represents the same shape after rotation. Mirrored or structurally different shapes do not count.

Visual example:

```text
REFERENCE       ROTATED        MIRRORED

   ■               ■              ■
   ■■■     →     ■■■              ■■■
     ■           ■                ■

                  ✓                ✕
```

Keep the explanation visual and short.

---

## 28. Brain chooser entry

```text
Mental Rotation

Find the same shape after it has been rotated.
Spatial reasoning & visualization.
```

Suggested emoji:

```text
🔄
```

If that conflicts visually with another Brain game, alternatives:

```text
🧊
🌀
🔷
```

Prefer a unique icon across the game chooser.

---

## 29. Shape library

Keep shapes local in source.

Conceptually:

```text
src/game/mentalrotation/shapes.js
```

Each shape should have:

```text
id
difficulty eligibility
geometry
symmetry metadata
allowed rotations
```

Curate enough shapes that rounds do not feel repetitive.

Suggested initial minimum:

```text
Easy      12 validated shapes
Medium    20 validated shapes
Hard      24 validated shapes
Very Hard  28 validated shapes
```

Shapes may overlap between difficulty pools only when appropriate.

---

## 30. Repetition control

Avoid showing the same base shape on consecutive trials.

Where practical, avoid repeating the same shape within the last:

```text
3–5 trials
```

Do not create a complicated scheduler.

A small recent-shape exclusion queue is sufficient.

---

## 31. Deterministic generation

Support an internal seed:

```text
seed + difficulty → reproducible trial sequence
```

This supports:

- tests
- debugging
- future benchmark pools

Normal play uses a random seed.

Do not expose seeds in normal v1 UI.

---

## 32. Architecture

Integrate with Brain's existing Vue/Vite conventions.

Do not redesign Brain.

Conceptually:

```text
components/mentalrotation/
composables/mentalrotation/
game/mentalrotation/
```

Pure logic:

```javascript
normalizeShape(shape)
rotateShape(shape, angle)
mirrorShape(shape, axis)
areRotationEquivalent(a, b)
areReflectionEquivalent(a, b)
generateTrial(difficulty, rng)
calculateMentalRotationScore(result)
```

Keep transformation/equivalence logic independent of Vue.

---

## 33. Rendering

Prefer:

```text
SVG
```

or simple CSS/grid geometry.

No Canvas/WebGL/3D library is required for v1.

Requirements:

- sharp at all iPhone resolutions
- local/offline
- consistent line/shape thickness
- identical scale between reference/candidates
- candidates centered in equal-sized areas
- transformations do not cause clipping

Do not encode the correct answer through different scale, alignment, stroke width, or rendering quality.

---

## 34. Tests

At minimum test:

### Transformations

- 90° rotation correct
- 180° rotation correct
- 270° rotation correct
- four 90° rotations return original
- mirroring works
- normalization removes translation differences

### Equivalence

- rotated reference is equivalent
- mirrored reference is not rotation-equivalent for validated shapes
- mirrored + rotated remains incorrect
- candidate order does not affect validation

### Shape validation

- no ambiguous base shapes
- no invalid symmetry in scored pools
- every generated trial has exactly one correct answer

### Trial generation

- correct number of candidates by difficulty
- correct answer position randomized
- recent-shape repetition control
- deterministic seed reproduces trials

### Score

- correct = +100
- incorrect = -50
- speed tiers correct
- incorrect answers receive no speed bonus
- score never below zero

### Timing

- incomplete trial at timeout discarded
- background interruption discarded
- correct RT uses `performance.now()`

---

## 35. Offline / PWA

Mental Rotation must work completely offline inside Brain.

Requirements:

- all shapes local
- all rendering local
- no remote images
- no CDN
- no runtime API
- no external font required for shapes
- local generation
- local scoring
- local history/statistics
- cold-start available from installed Brain PWA in Airplane Mode

Adding Mental Rotation introduces **zero required runtime network dependencies**.

---

## 36. Benchmark

Do not add Mental Rotation to Brain Benchmark v1.

First collect normal-play data and tune:

- difficulty
- shape pools
- score thresholds
- timing

A future Benchmark version may use a versioned deterministic shape/trial pool.

---

## 37. Mobile-first UX

Primary target: iPhone portrait.

Requirements:

- reference clearly visible
- candidates large enough to inspect
- entire candidate card tappable
- no active-game scrolling
- no accidental zoom/text selection
- safe-area aware
- timer visible but secondary
- candidate positions stable during each trial
- feedback brief
- no hover dependency
- works one-handed where practical

Hard difficulty may use a 2×2 candidate grid.

Do not shrink four candidates into one cramped horizontal row.

---

## 38. Future changes

Not part of v1:

- true 3D objects
- WebGL
- perspective rotation
- cubes/block assemblies
- user-generated shapes
- adaptive difficulty
- daily challenge
- fixed benchmark trials
- multiplayer
- global leaderboards
- population norms
- IQ/spatial-IQ claims

Keep v1 as a robust 2D rotation game.

---

## 39. Final v1 decisions

1. Name: **Mental Rotation**.
2. Single-player timed cognitive game.
3. Find the candidate equivalent under rotation only.
4. Mirrored shapes are incorrect.
5. V1 uses 2D locally rendered shapes.
6. Easy = 2 choices / 30 seconds.
7. Medium = 3 choices / 45 seconds.
8. Hard = 4 choices / 60 seconds.
9. Difficulty increases shape/candidate complexity.
10. Curated validated shape library.
11. Exactly one correct candidate per trial.
12. Candidate position randomized.
13. No repeated base shape on consecutive trials.
14. Correct = +100.
15. Incorrect = -50.
16. Correct answers may receive RT-based speed bonus.
17. Score minimum = 0.
18. Primary raw metrics: Accuracy + Median Correct RT.
19. Store rotation-angle data.
20. Incomplete timeout trial is discarded.
21. Background-interrupted trial is discarded.
22. No manual Pause required.
23. Practice mode included.
24. Keep last 30 rounds per difficulty.
25. Deterministic seeded trial generation supported internally.
26. Pure geometry/equivalence logic separated from Vue.
27. SVG/CSS rendering only; no 3D dependency.
28. Mobile/iPhone-first.
29. Existing Brain architecture.
30. No backend/database.
31. Full offline/PWA support.
32. Do not add to Brain Benchmark v1.

---

## 40. Changelog since initial build

- **Added an Untimed round mode**, requested for stress-free/kid-friendly play. A menu toggle
  (Timed / Untimed) sits alongside the existing difficulty grid; Untimed reuses the exact same
  difficulties, shapes and distractor logic — only the round-end condition changes, from "time
  runs out" to "a fixed number of questions answered" (10, `MENTALROTATION_UNTIMED_TRIAL_COUNT`).
  No timer is shown during an Untimed round, and Score is not shown live during play either (it
  still contributes the same speed-bonus formula and appears on Results afterward, same as every
  other mode) — the goal was removing visible time pressure, not removing the score entirely.
  Personal bests and history are tracked separately per mode (`mentalrotation:stats:<mode>:<key>`,
  `mentalrotation:history[:<mode>]`), with 'timed' kept on the original pre-existing key shape so
  no already-saved data changes format or goes missing.
- This is distinct from the pre-existing untimed Practice mode (§26), which remains a tiny fixed
  3-shape teaching demo on the About page with no score/history at all.