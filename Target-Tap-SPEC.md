# Target Tap --- Sustained Attention & Reaction Speed --- Specification

## 1. Goal

Add a small, fast, mobile-first **Target Tap** game to the Brain
project.

A stream of letters appears one at a time. Before the round starts, the
player is given one target letter.

The player must:

> Tap anywhere on the game area whenever the target letter appears.
> Ignore every other letter.

Example:

``` text
TARGET: K

A
R
K   ← TAP
M
B
T
K   ← TAP
D
S
...
```

The game primarily exercises and tracks performance in:

-   sustained attention
-   vigilance
-   target detection
-   reaction speed
-   response inhibition

It is inspired by continuous-performance / target-detection tasks, but
it is a casual cognitive game and must not be presented as a clinical or
diagnostic test.

------------------------------------------------------------------------

## 2. Brain chooser entry

User-facing name:

``` text
Target Tap
```

Suggested chooser entry:

> **🎯 Target Tap**\
> Watch the letter stream and tap when your target appears. Sustained
> attention & reaction speed.

------------------------------------------------------------------------

## 3. Core rule

At the beginning of each game, show the target:

``` text
TARGET: K
```

After a short countdown, letters appear sequentially in the center of
the screen.

Example:

``` text
A → R → K → M → B → T → K → D
        ↑                 ↑
       TAP               TAP
```

The player taps anywhere inside the active game area when the target
appears.

The player should not tap for non-target letters.

------------------------------------------------------------------------

## 4. Response classification

Every stimulus is classified using standard target-detection outcomes.

  Stimulus     Player action   Classification
  ------------ --------------- -----------------------
  Target       Tap             **Hit**
  Target       No tap          **Miss**
  Non-target   Tap             **False Alarm**
  Non-target   No tap          **Correct Rejection**

Store these four outcomes separately.

These raw measurements are more important than the synthetic game score.

------------------------------------------------------------------------

## 5. Difficulty

Use four levels.

  Difficulty     Duration   Target frequency   Stimulus interval
  ------------ ---------- ------------------ -------------------
  Easy               30 s              \~30%             1000 ms
  Medium             45 s              \~25%              800 ms
  Hard               60 s              \~20%              650 ms
  Very Hard          90 s              \~15%              500 ms

These are initial tuning values.

Difficulty increases through:

-   faster presentation
-   less frequent targets
-   longer sustained-attention requirement

Do not make difficulty through visually confusing letters, tiny text,
poor contrast, or ambiguous fonts.

------------------------------------------------------------------------

## 6. Target-letter selection

Use a curated target pool of clearly distinguishable uppercase letters.

Suggested initial pool:

``` text
A B D E F G H J K L M N P R S T U V X Y
```

Avoid target letters that can be easily confused with digits or other
glyphs in the chosen system font.

For example, avoid or carefully validate:

``` text
I
O
Q
```

The target is selected randomly from the validated pool.

### Critical rule

The target letter for a new game must **never be the same as the
immediately previous game's target letter**.

Example:

``` text
Previous game target: K

Next game:
K  ✕
R  ✓
B  ✓
T  ✓
```

Persist the previous target locally so this rule also works after
returning to the menu and starting another round.

------------------------------------------------------------------------

## 7. Target spacing

Target events must be deliberately generated.

Do not rely on unconstrained random letter generation.

A target must never immediately follow another target.

Forbidden:

``` text
K → K
```

Also require at least **two non-target stimuli between target stimuli**.

Forbidden:

``` text
K → B → K
```

Valid:

``` text
K → B → R → K
```

Therefore:

``` text
minimum target gap = 2 non-target stimuli
```

This prevents ambiguous rapid double-response situations and gives every
target a distinct response opportunity.

------------------------------------------------------------------------

## 8. Beginning of round protection

The first **two stimuli** of every round are always non-targets.

Example:

``` text
3
2
1
GO!

A
R
K   ← first possible target
```

Never begin:

``` text
GO!

K
```

The player should have a brief opportunity to settle into the stream
before the first response is required.

------------------------------------------------------------------------

## 9. End-of-round protection

Do not deliberately schedule a target so late that its full response
window would extend beyond the round duration.

The final scheduled target must have enough time for its normal response
window.

If the timer expires while a non-target is active, finish normally.

Do not create an unavoidable Miss because the round ended before the
player could reasonably respond.

------------------------------------------------------------------------

## 10. Target count stability

Target frequency should be approximately:

``` text
Easy       30%
Medium     25%
Hard       20%
Very Hard  15%
```

However, target positions should be deliberately generated so rounds at
the same difficulty contain a reasonably stable number of target
opportunities.

Do not allow pure randomness to create one round with very few targets
and another with many.

The generator should calculate an intended target count from:

``` text
round duration
stimulus interval
target frequency
spacing constraints
```

and distribute those targets across valid positions.

------------------------------------------------------------------------

## 11. Distractor generation

Non-target letters are selected from the same validated uppercase-letter
pool, excluding the current target.

Avoid using visually confusing distractors for the selected target.

Examples:

``` text
Target O → avoid Q and possibly 0
Target I → avoid L and 1
```

Target Tap is intended to measure temporal attention and target
detection.

Fine visual discrimination belongs in **Odd One Out**, not this game.

------------------------------------------------------------------------

## 12. Repeated distractors

Non-target letters may repeat, but avoid excessive immediate repetition
where practical.

Example:

``` text
A → A → A → A
```

should be avoided because it creates unnecessary visual monotony.

A simple recent-letter exclusion rule is sufficient.

Do not build a complicated sequence optimizer.

------------------------------------------------------------------------

## 13. Stimulus presentation

Only one letter is visible at a time.

Suggested active screen:

``` text
Target Tap                         00:37

TARGET

   K


                  A


              TAP ANYWHERE
```

The current stimulus should be:

-   large
-   centered
-   high contrast
-   visually isolated

Do not display several letters simultaneously.

------------------------------------------------------------------------

## 14. Tap area

The **entire active gameplay area** should act as the response surface.

Do not require the player to find a small TAP button.

Conceptually:

``` text
┌─────────────────────────────┐
│                             │
│        TARGET: K            │
│                             │
│                             │
│             A               │
│                             │
│                             │
│       TAP ANYWHERE          │
│                             │
└─────────────────────────────┘
```

This reduces motor-navigation variability and is ideal for one-handed
iPhone play.

Exclude navigation/header controls from the response surface.

------------------------------------------------------------------------

## 15. Stimulus timing model

Each stimulus has a fixed presentation interval based on difficulty.

Conceptually:

``` text
stimulus appears
      ↓
response window active
      ↓
interval expires
      ↓
next stimulus
```

For v1, the stimulus remains visible for the complete interval.

No separate blank inter-stimulus gap is required unless real
play-testing shows that letters visually blur together.

If a gap is added later, keep it fixed and include it in the documented
interval model.

------------------------------------------------------------------------

## 16. Hit response

When the target appears and the player taps within its response window:

``` text
Hit
```

Record:

-   target letter
-   stimulus index
-   reaction time
-   classification = Hit

Only the first valid tap during that target window counts.

Additional taps before the next stimulus must be ignored rather than
creating multiple responses.

------------------------------------------------------------------------

## 17. Miss response

If the target's response window expires without a tap:

``` text
Miss
```

Record the target as missed.

Do not show long error feedback because the stream must continue.

------------------------------------------------------------------------

## 18. False Alarm

If the player taps while a non-target is active:

``` text
False Alarm
```

Record it immediately.

Only the first tap during that stimulus interval counts.

Additional taps during the same non-target stimulus are ignored.

This prevents accidental double-taps from creating multiple penalties.

------------------------------------------------------------------------

## 19. Correct Rejection

If a non-target interval expires without a tap:

``` text
Correct Rejection
```

Record it.

Correct Rejections are useful as a raw attention metric but should not
dominate the game score because non-targets are intentionally much more
common.

------------------------------------------------------------------------

## 20. Reaction time

Use:

``` javascript
performance.now()
```

Reaction time starts when the target stimulus becomes visible and
interactive.

It ends on the first valid tap.

Store RT in milliseconds.

Primary RT metrics use **Hits only**.

False Alarm timing may be stored separately but must not be mixed into
target reaction-time statistics.

------------------------------------------------------------------------

## 21. Feedback

Feedback should be subtle and extremely brief.

Hit:

``` text
✓
```

False Alarm:

``` text
✕
```

Misses do not need a disruptive full-screen message.

Do not pause the stream for feedback.

The task depends on maintaining continuous attention.

------------------------------------------------------------------------

## 22. Score

Keep Score secondary to raw performance metrics.

Suggested scoring:

``` text
Hit                +100
Correct Rejection   +10
Miss                -75
False Alarm        -100
```

Minimum displayed score:

``` text
0
```

Do not add a reaction-time speed bonus in v1.

The player's reaction speed is already measured directly, and adding a
speed bonus could encourage premature tapping and distort the attention
task.

------------------------------------------------------------------------

## 23. Why False Alarms have a stronger penalty

A player should not achieve a good score by tapping repeatedly.

False Alarm:

``` text
-100
```

Miss:

``` text
-75
```

This encourages the intended behavior:

``` text
watch carefully
→ identify target
→ respond
```

rather than:

``` text
tap frequently
→ hope to catch targets
```

------------------------------------------------------------------------

## 24. Accuracy

Primary accuracy:

``` text
accuracy =
(Hits + Correct Rejections)
/
(all classified stimuli)
× 100
```

Also calculate target-specific measures:

``` text
Hit Rate =
Hits / (Hits + Misses)

False Alarm Rate =
False Alarms / (False Alarms + Correct Rejections)
```

These are more informative than Accuracy alone because non-targets are
much more common.

------------------------------------------------------------------------

## 25. End-of-round results

Example:

``` text
Time!

Score                 3,420

Accuracy                95%
Hit Rate                95%
False Alarm Rate         3%

Hits                  19 / 20
Misses                     1
False Alarms               2
Correct Rejections        58

Median Reaction         374 ms
Average Reaction        401 ms

Best Score              3,610
```

Primary visual hierarchy:

### Game

-   Score
-   Personal Best

### Attention

-   Hit Rate
-   False Alarm Rate
-   Hits / Misses / False Alarms

### Speed

-   Median Hit RT
-   Average Hit RT

Do not overwhelm the main Results screen. Secondary values can live
under Details.

------------------------------------------------------------------------

## 26. Personal bests

Track separately per difficulty:

-   Best Score
-   Best Hit Rate
-   Lowest False Alarm Rate
-   Best eligible Median Hit RT

Median RT personal-best eligibility requires:

``` text
Hit Rate >= 80%
AND
False Alarm Rate <= 20%
```

This prevents reckless fast tapping from producing a misleading RT
personal best.

Tie-break equal scores by:

1.  higher Hit Rate
2.  lower False Alarm Rate
3.  lower Median Hit RT

------------------------------------------------------------------------

## 27. History

Keep the last **30 completed games** per difficulty.

Each entry:

``` text
{
  difficulty,
  targetLetter,
  score,
  totalStimuli,
  targets,
  hits,
  misses,
  falseAlarms,
  correctRejections,
  accuracy,
  hitRate,
  falseAlarmRate,
  avgHitRT,
  medianHitRT,
  fastestHitRT,
  duration,
  completedAt,
  metricVersion
}
```

------------------------------------------------------------------------

## 28. Statistics

Track separately per difficulty:

-   games played
-   best score
-   average/median score
-   average Hit Rate
-   average False Alarm Rate
-   average Accuracy
-   best eligible Median Hit RT
-   average/median Hit RT
-   total Hits
-   total Misses
-   total False Alarms
-   total Correct Rejections

Do not combine difficulty levels into one universal Target Tap score.

------------------------------------------------------------------------

## 29. Pause / app switching

No manual Pause is required because rounds are short and continuous.

If the PWA becomes hidden:

1.  immediately pause the round
2.  hide the current letter
3.  invalidate the current stimulus
4.  preserve completed stimulus statistics

On Resume:

``` text
3
2
1
```

then continue with a newly generated non-target stimulus.

Do not resume the interrupted stimulus.

Do not classify the interrupted stimulus as Hit, Miss, False Alarm, or
Correct Rejection.

------------------------------------------------------------------------

## 30. Countdown

Before each game:

``` text
TARGET: K

3
2
1

GO!
```

The target letter remains visible during the countdown.

Once the stream starts, keep a smaller persistent:

``` text
Target: K
```

indicator visible so forgetting the assigned letter does not become the
primary task.

The game measures vigilance, not target-letter working memory.

------------------------------------------------------------------------

## 31. Practice mode

Provide a short untimed or slow practice.

Example:

``` text
TARGET: K

A     ignore
R     ignore
K     TAP
M     ignore
K     TAP
```

Practice should teach:

-   tap only the target
-   ignore everything else
-   target never appears twice consecutively
-   tapping a distractor is a False Alarm

Practice:

-   no score
-   no history
-   no personal best

------------------------------------------------------------------------

## 32. About / How to Play

Suggested explanation:

> Watch the letters as they appear one at a time. Tap anywhere on the
> game area whenever your target letter appears. Do not tap for other
> letters.

Explain the four outcomes briefly:

``` text
Target + tap        = Hit
Target + no tap     = Miss
Other + tap         = False Alarm
Other + no tap      = Correct Rejection
```

Mention that the game is inspired by sustained-attention /
target-detection tasks, without presenting it as a clinical test.

------------------------------------------------------------------------

## 33. Deterministic generation

Support an internal seed:

``` text
seed + difficulty + target → reproducible stream
```

The seed controls:

-   target positions
-   distractor sequence

Normal gameplay uses a random seed.

This is useful for:

-   automated tests
-   debugging
-   future benchmark design

Do not expose seeds in normal v1 UI.

------------------------------------------------------------------------

## 34. Sequence generator

Keep sequence generation pure and independent from Vue.

Conceptually:

``` javascript
selectTarget(previousTarget, rng)
calculateTargetCount(config)
generateTargetPositions(config, rng)
generateDistractors(target, positions, rng)
validateSequence(sequence, config)
```

Validation must confirm:

-   target differs from previous game's target
-   first two stimuli are non-targets
-   no consecutive targets
-   at least two non-targets between targets
-   intended target count is met
-   no forbidden target/distractor confusion pair
-   final target has a full response window

Never start a scored round with an invalid sequence.

------------------------------------------------------------------------

## 35. Tests

At minimum test:

### Target selection

-   target comes from validated pool
-   target is not the same as previous game's target

### Target placement

-   first two stimuli never targets
-   no consecutive targets
-   at least two non-targets between targets
-   target count matches intended configuration
-   target not scheduled too late for full response window

### Distractors

-   distractor never equals target
-   forbidden confusing distractors excluded
-   excessive immediate repetition avoided

### Classification

-   target + tap = Hit
-   target + timeout = Miss
-   non-target + tap = False Alarm
-   non-target + timeout = Correct Rejection
-   repeated taps in same interval ignored

### Timing

-   Hit RT uses `performance.now()`
-   RT starts at stimulus presentation
-   backgrounded stimulus discarded
-   timer resumes correctly after countdown

### Metrics

-   Accuracy
-   Hit Rate
-   False Alarm Rate
-   average/median Hit RT

### Score

-   Hit +100
-   Correct Rejection +10
-   Miss -75
-   False Alarm -100
-   score never below zero

------------------------------------------------------------------------

## 36. Mobile-first UX

Primary target: iPhone portrait.

Requirements:

-   entire game area acts as response surface
-   one-handed play
-   large centered letter
-   target indicator always visible
-   no page scrolling
-   no accidental text selection
-   avoid double-tap zoom
-   safe-area aware
-   navigation controls excluded from tap surface
-   no hover dependency
-   minimal animation
-   high contrast
-   no external fonts required

Do not display a small response button.

------------------------------------------------------------------------

## 37. Visual design

Keep the active screen intentionally minimal.

Example:

``` text
Target Tap                      00:31

Target: K


                 A


              TAP ANYWHERE
```

All letters use the same:

-   font
-   size
-   weight
-   position
-   color

Do not make targets visually different from distractors.

The player must identify the letter itself.

------------------------------------------------------------------------

## 38. Persistence

Follow Brain's existing session/history architecture.

Conceptually:

``` text
targettap:history:easy
targettap:history:medium
targettap:history:hard
targettap:history:very-hard
```

Also persist:

``` text
targettap:last-target
```

so consecutive games cannot use the same target letter.

If Brain has shared session infrastructure, integrate with it rather
than creating a parallel system.

------------------------------------------------------------------------

## 39. Offline / PWA

Target Tap must work completely offline inside Brain.

Requirements:

-   local target pool
-   local stream generation
-   no runtime API
-   no CDN
-   no remote fonts/assets
-   local timing/scoring
-   local history/statistics
-   cold-start available from installed Brain PWA in Airplane Mode

Adding Target Tap introduces **zero required runtime network
dependencies**.

------------------------------------------------------------------------

## 40. Benchmark

Do not add Target Tap to Brain Benchmark v1.

First collect normal-play data and tune:

-   presentation intervals
-   target frequencies
-   duration
-   target spacing
-   scoring

A future Benchmark version may use a versioned fixed configuration and
deterministic stream pool.

------------------------------------------------------------------------

## 41. Future changes

Not part of v1:

-   digits as targets
-   symbols/shapes
-   audio targets
-   dual-target tasks
-   AX-CPT style sequences
-   adaptive stimulus rate
-   color targets
-   target switching during a round
-   Daily Challenge
-   population norms
-   clinical claims
-   global Brain Score

Keep v1 focused on detecting one target letter in a continuous letter
stream.

------------------------------------------------------------------------

## 42. Final v1 decisions

1.  Name: **Target Tap**.
2.  Single uppercase target letter per game.
3.  Tap anywhere in the active game area when the target appears.
4.  Target letter changes between consecutive games.
5.  Same target can never be used in two consecutive games.
6.  Target never appears twice consecutively in the stream.
7.  At least **2 non-target letters** between target events.
8.  First **2 stimuli are always non-targets**.
9.  Final target must have a complete response window.
10. Target positions deliberately generated, not pure random.
11. Stable approximate target frequency per difficulty.
12. Avoid visually confusing distractors for the selected target.
13. Easy = 30 s / \~30% targets / 1000 ms.
14. Medium = 45 s / \~25% / 800 ms.
15. Hard = 60 s / \~20% / 650 ms.
16. Very Hard = 90 s / \~15% / 500 ms.
17. Hit / Miss / False Alarm / Correct Rejection classification.
18. Hit = +100.
19. Correct Rejection = +10.
20. Miss = -75.
21. False Alarm = -100.
22. No RT speed bonus in v1.
23. Primary raw metrics = Hit Rate, False Alarm Rate, Median Hit RT.
24. Only first tap per stimulus interval counts.
25. Use `performance.now()`.
26. No manual Pause.
27. Backgrounded stimulus is discarded.
28. Persistent target reminder remains visible.
29. Keep last 30 games per difficulty.
30. Deterministic seeded sequence generation.
31. Mobile/iPhone-first.
32. Entire gameplay area is the response surface.
33. Existing Brain architecture.
34. No backend/database.
35. Full offline/PWA support.
36. Not part of Brain Benchmark v1.
