# Odd One Out — Visual Discrimination & Attention — Specification

## 1. Goal

Add a small, fast, mobile-first **Odd One Out** game to the Brain project.

The player sees a grid of mostly identical numbers or letters with exactly one different item. The task is to find and tap the odd item as quickly and accurately as possible.

The game primarily exercises and tracks performance in:

- visual discrimination
- selective attention
- visual search
- processing speed
- sustained attention

This is a casual cognitive game, not a clinical or intelligence assessment.

---

## 2. Brain chooser entry

**👁️ Odd One Out**

> Find the different number or letter before time runs out. Visual discrimination & attention.

Keep the description short.

---

## 3. Core rule

Each trial contains a grid where exactly **one target differs** from all other cells.

Examples:

```text
8  8  8  8  8
8  8  3  8  8
8  8  8  8  8
```

or:

```text
O  O  O  O  O
O  O  Q  O  O
O  O  O  O  O
```

The player taps the odd item.

A correct answer immediately advances to the next trial.

An incorrect answer does not advance the trial.

---

## 4. Stimulus families

Use several families of odd-one-out stimuli so the game is not only about one visual trick.

### Number mode

Examples:

```text
8 8 8 8 3 8
6 6 6 9 6 6
68 68 68 86 68 68
```

### Letter mode

Examples:

```text
O O O Q O
M M M N M
E E E F E
```

### Mixed / ambiguous character mode

Examples:

```text
0 0 0 O 0
B B B 8 B
I I I 1 I
```

The last category should be introduced only at higher difficulty because it can depend on the rendering font.

Do not use a stimulus where the odd item is ambiguous or unreliable on the target iPhone font.

---

## 5. Difficulty

Use six levels.

| Difficulty | Grid | Example type | Time limit |
|---|---:|---|---:|
| Easy | 4×4 | clearly different digit/letter | 20 s |
| Medium | 5×5 | less obvious number/letter | 20 s |
| Hard | 6×6 | visually similar values | 25 s |
| Very Hard | 7×7 | similar letters/numbers | 30 s |
| Expert | 8×8 | confusing pairs | 30 s |
| Extreme | 9×9 | highly similar validated pairs | 35 s |

These are starting values and must be tested on a real iPhone.

Do not make difficulty through unreadably small text.

For larger grids, the implementation should calculate a font/tile size that remains comfortable to tap.

---

## 6. Challenge progression

V1 uses a **continuous time-limited challenge**.

The timer begins at the start of the first trial.

After each correct answer:

```text
new trial
↓
new odd position
↓
new stimulus
```

The player continues until the time limit expires.

The time limit is the total challenge duration, not the deadline for an individual trial.

An individual trial has no separate timeout.

---

## 7. Why continuous mode

A continuous challenge creates the intended one-more-round loop.

It also makes speed meaningful because the player can complete more trials within the fixed duration.

The game should not stop after one difficult trial unless the player reaches the overall time limit.

---

## 8. Trial generation

For every trial:

1. choose a stimulus family
2. choose a base symbol
3. choose a valid odd symbol
4. generate the grid
5. choose one random odd position
6. validate that exactly one cell differs
7. present the trial

The odd position must be randomized independently for every trial.

Do not consistently place the odd item in a particular row/column.

---

## 9. Confusion-pair library

Do not generate arbitrary character pairs.

Maintain a curated local library of validated pairs.

Example:

```text
6 ↔ 9
8 ↔ 3
1 ↔ 7
O ↔ Q
O ↔ 0
B ↔ 8
C ↔ G
M ↔ N
E ↔ F
P ↔ R
I ↔ 1
```

For multi-character numbers:

```text
68 ↔ 86
69 ↔ 96
```

Only use pairs that remain distinguishable and correctly rendered on the target iPhone font.

Difficulty can select increasingly similar pairs.

---

## 10. Font consistency

All cells in a trial must use exactly the same:

- font family
- font size
- font weight
- letter spacing
- line height
- alignment

The odd cell differs only in its symbol/value.

This prevents the player from detecting the answer through typography rather than character identity.

Avoid external fonts.

Prefer the same system/local font stack used by the rest of Brain.

---

## 11. Odd position

The odd position is uniformly randomized across all grid cells.

No predictable spatial pattern.

Do not avoid corners or edges unless real play-testing identifies a strong perceptual bias.

If such a bias is discovered, document and test the adjustment rather than hiding randomness arbitrarily.

---

## 12. Player interaction

The entire cell is tappable.

Correct tap:

1. record reaction time
2. increment Correct
3. increment Trials
4. add score
5. immediately generate the next trial

Incorrect tap:

1. record reaction time
2. increment Wrong
3. keep the same trial
4. apply score penalty
5. briefly indicate the incorrect selection

Multiple taps on the same trial are allowed after feedback.

Do not require a Submit button.

---

## 13. Feedback

Correct:

```text
✓
```

Incorrect:

```text
✕
```

Feedback must be very brief.

Suggested duration:

```text
100–200 ms
```

The transition to the next trial should be fast enough that feedback does not dominate the challenge.

---

## 14. Reaction time

Use:

```javascript
performance.now()
```

Measure from:

```text
trial fully visible
→
player tap
```

Store RT in milliseconds.

For the current trial, the timer remains active while the player responds.

If an incorrect tap occurs, the trial RT continues until the eventual correct answer.

Store each tap separately for later analysis.

---

## 15. Timing statistics

At the end of a challenge show:

- total trials presented
- correct answers
- wrong answers
- accuracy
- average correct RT
- median correct RT
- fastest correct RT
- slowest correct RT

Primary RT statistics use **correct answers only**.

Incorrect tap RT remains available in detailed session data.

---

## 16. Time expiration

When the overall time limit reaches zero:

```text
TIME!
```

Disable input.

If a trial is partially active when time expires:

- do not award it
- do not count it as correct
- do not count it as wrong unless an incorrect tap already happened
- retain completed-trial statistics

Then show Results.

---

## 17. Score

The score rewards:

```text
correct answers
+
speed through number of completed trials
+
accuracy
```

Initial formula:

### Correct answer

```text
+100
```

### Incorrect answer

```text
-75
```

Score cannot fall below zero.

Do not add a separate per-second time bonus because the fixed overall challenge duration already rewards solving more trials.

The score naturally increases when the player solves more valid trials during the same time.

---

## 18. Accuracy

```text
accuracy =
correct answers /
(correct answers + wrong answers)
× 100
```

Only actual grid-cell taps count.

The challenge timer itself does not affect accuracy.

---

## 19. Completion / timeout

At the overall time limit:

```text
TIME!
```

Disable input.

If a trial is partially active, it is not awarded as a correct/incorrect answer unless an incorrect tap already occurred.

The challenge result is still saved to history.

---

## 20. Results

Example:

```text
Time!

Score               2,750

Trials                 31
Correct                29
Wrong                   4
Accuracy             87.9%

Median Correct RT    1.12 s
Average Correct RT   1.24 s
Fastest Correct RT   0.54 s

Best Score           3,010
```

Use the existing Brain Results visual language.

Primary action:

```text
[ Play Again ]
```

---

## 21. Personal bests

Track separately per difficulty:

- Best Score
- Best Accuracy
- Best Trial Count
- Best Median Correct RT

RT personal best requires:

```text
accuracy >= 80%
```

Tie-break Best Score by:

1. higher accuracy
2. more correct trials
3. lower median correct RT

---

## 22. History

Keep the last **30 completed challenges** per difficulty.

Each entry:

```text
{
  difficulty,
  score,
  trials,
  correct,
  wrong,
  accuracy,
  avgCorrectRT,
  medianCorrectRT,
  fastestCorrectRT,
  slowestCorrectRT,
  duration,
  completedAt,
  metricVersion
}
```

Detailed per-trial data does not need to be stored permanently unless Brain's existing session model already supports it.

---

## 23. Statistics

Track per difficulty:

- games played
- best score
- average/median score
- best accuracy
- average accuracy
- best trial count
- average/median trial count
- best eligible median RT
- average/median correct RT
- total correct answers
- total wrong answers

Do not combine difficulties into a universal Odd One Out score.

---

## 24. Pause / app switching

Because the round is short and time-limited:

- no manual Pause required

If the PWA becomes hidden:

1. stop timer
2. hide current trial
3. discard the interrupted trial
4. preserve completed challenge statistics

On Resume:

```text
3
2
1
```

then continue with a fresh trial.

Do not give extra study time on the interrupted stimulus.

---

## 25. Mobile-first UX

Primary target: iPhone portrait.

Requirements:

- entire active grid visible without scrolling
- grid centered
- cells large enough to tap reliably
- number/letter glyphs remain readable
- no horizontal scrolling
- no accidental text selection
- avoid double-tap zoom
- safe-area aware
- timer visible but secondary
- score secondary
- no hover dependency

For 8×8 and 9×9 levels, calculate cell dimensions responsively.

If Extreme cannot be made comfortably usable at a normal iPhone viewport, tune the grid/font configuration rather than sacrificing touch usability.

---

## 26. Visual design

The grid should be visually quiet.

All cells in a trial are identical except for:

```text
the character/value itself
```

Do not encode the answer through:

- color
- font weight
- font size
- spacing
- position
- background
- animation

The odd item's position is the only randomized spatial feature.

---

## 27. Color and accessibility

Do not rely on color to indicate the odd item.

The actual discrimination should remain based on the character itself.

For mixed ambiguous characters such as:

```text
O / 0
B / 8
I / 1
```

validate visually on iOS before including them in scored difficulties.

If a pair is unreliable on the target platform, remove it from the scored pool rather than compensating with color or font tricks.

---

## 28. Practice mode

Provide a short untimed practice.

Practice:

- 5–10 trials
- no score
- no history
- no personal best
- clear explanation after each answer

Start with simple examples, then demonstrate a similar-character example.

---

## 29. About / How to Play

Explain:

> Find the one number or letter that is different from all the others and tap it as quickly as you can.

Higher difficulties may use characters that look very similar.

The challenge ends when the timer reaches zero.

---

## 30. Stimulus library

Keep stimulus definitions local.

Conceptually:

```text
src/game/oddoneout/stimuli.js
```

Each stimulus definition should contain:

```text
id
family
base
odd
minimumDifficulty
maximumDifficulty
notes
```

Example:

```javascript
{
  id: 'letters-o-q',
  family: 'letters',
  base: 'O',
  odd: 'Q',
  minimumDifficulty: 'hard',
  maximumDifficulty: 'extreme'
}
```

---

## 31. Deterministic generation

Support an internal seed:

```text
seed + difficulty → reproducible challenge
```

This controls:

- stimulus sequence
- odd positions
- confusion pairs

Useful for tests and future benchmark mode.

Normal play uses random seeds.

---

## 32. Core logic

Keep pure logic separate from Vue.

Useful functions:

```javascript
generateTrial(difficulty, rng)
validateTrial(trial)
findOddIndex(trial)
calculateAccuracy(result)
calculateOddOneOutScore(result)
calculateRTStats(trials)
```

The engine should guarantee:

```text
exactly one odd item
```

for every scored trial.

---

## 33. Tests

At minimum test:

### Trial generation

- correct grid size
- exactly one odd item
- odd position randomized
- deterministic seed reproduces trial
- all other cells are identical

### Stimulus validation

- every confusion pair is valid
- no unsupported/ambiguous pair enters scored pools
- difficulty restrictions work

### Interaction

- correct tap advances
- wrong tap does not advance
- wrong tap increments Wrong
- multiple incorrect taps can occur before correct answer
- full cell is tappable

### Timing

- `performance.now()` used
- RT starts when trial becomes active
- timeout ends challenge
- incomplete trial at timeout is not awarded
- hidden-app trial discarded

### Score

- correct = +100
- wrong = -75
- score minimum = 0

### Statistics

- accuracy
- correct trial count
- average/median correct RT
- personal-best calculations

---

## 34. Persistence

Follow Brain's existing persistence conventions.

Conceptually:

```text
oddoneout:history:easy
oddoneout:history:medium
oddoneout:history:hard
oddoneout:history:very-hard
oddoneout:history:expert
oddoneout:history:extreme
```

If shared session infrastructure already exists, integrate with it.

Do not create a parallel persistence framework.

---

## 35. Offline / PWA

Odd One Out must work completely offline inside Brain.

Requirements:

- all characters/stimuli local
- no external fonts
- no remote images
- no CDN
- no runtime API
- local trial generation
- local scoring
- local history
- PWA cold-start works in iPhone Airplane Mode

Adding Odd One Out must introduce **zero runtime network dependencies**.

---

## 36. Benchmark

Do not add Odd One Out to Brain Benchmark v1.

Character familiarity, font rendering, and practice effects make benchmark design more sensitive than the simple game suggests.

A future benchmark can use a versioned fixed stimulus pool.

---

## 37. Future changes

Not part of v1:

- color-based oddity
- shape-based oddity
- moving grids
- animated distractors
- dual odd items
- hidden odd item
- adaptive difficulty
- Daily Challenge
- leaderboards
- population norms
- global Brain Score

Keep v1 focused on one different number/letter in a static grid.

---

## 38. Final v1 decisions

1. Name: **Odd One Out**.
2. Static grid, exactly one odd item.
3. Numbers and letters, with carefully validated confusing pairs at higher difficulty.
4. Continuous time-limited challenge.
5. Easy 4×4 / 20 s.
6. Medium 5×5 / 20 s.
7. Hard 6×6 / 25 s.
8. Very Hard 7×7 / 30 s.
9. Expert 8×8 / 30 s.
10. Extreme 9×9 / 35 s.
11. No individual trial timeout.
12. Correct = +100.
13. Wrong = -75.
14. No separate speed bonus.
15. Score never below zero.
16. Primary raw metrics: accuracy, correct trials, median correct RT.
17. Use `performance.now()`.
18. Interrupted trial is discarded on app hide.
19. No manual pause.
20. Keep last 30 completed challenges per difficulty.
21. Deterministic seeded generation.
22. Local curated confusion-pair library.
23. All trial cells use identical typography.
24. Mobile/iPhone-first.
25. No backend/database.
26. Full offline/PWA support.
27. Do not add to Benchmark v1.

## 39. v2 addition: Random Color variant

Added after v1, at the user's request — the same role it plays in Schulte Tables' and Switch
Trail's own Random Color variants. A single checkbox, **Random Color**, available at every
difficulty.

- Each cell in the grid gets a random background color, reassigned fresh on every new trial (a
  brand-new grid is already generated on every correct tap, so there's no "does the color travel
  with a repositioned cell" question to solve, unlike Switch Trail's free-form layout).
- Pure visual noise: colors are assigned independent of `oddIndex`, so which cell is the odd one
  is never hinted at by color. §26/§27's rule against encoding the answer through color is
  unaffected.
- Only applies while a cell isn't showing the wrong-tap flash — that feedback color always takes
  priority, so it's never obscured by the random background.
- Scoring, timing and the trial-generation rules are unchanged. Random Color is tracked as its own
  variant bucket per difficulty (own best score/accuracy/trial-count/median RT, own history), so
  it can never distort or be distorted by plain (Classic) results.

## 40. v2 addition: Untimed variant

Added alongside Random Color, at the user's request — modeled on Mental Rotation's Timed/Untimed
mode, not on Switch Trail's. A second independent checkbox, **Untimed**, available at every
difficulty and combinable with Random Color, giving four variant buckets total: Classic, Random
Color, Untimed, and Untimed + Color.

- Odd One Out's trial generation is endless (§6/§7's whole point is that a correct answer always
  produces another trial), so "just remove the timeout" has no natural stopping point the way
  Switch Trail's finite trail does. Untimed instead ends the round after a **fixed number of
  correct answers** (20) — Mental Rotation's exact model — shown as "Correct X / 20" in place of
  the countdown.
- No clock shown during play. Score remains visible throughout (unlike Switch Trail's Untimed,
  which hides live Score to remove rush pressure) — Odd One Out's score never had a time-based
  component to begin with (§17), so there's no rush cue tied to it in the first place.
- Scoring formula is completely unchanged (§17) — Untimed needed zero changes to it, since it
  never had a time bonus to withhold.
- A wrong tap behaves exactly as in Classic (costs points, flashes red, doesn't advance) and does
  not count toward the 20-correct target — only correct answers do.
- Pause/resume-with-a-fresh-trial on app-hide (§24) is unaffected by Untimed; the target count and
  progress-so-far are preserved across a pause exactly like elapsed time is in a timed round.
- Combines cleanly with Random Color — the two checkboxes are completely independent.
