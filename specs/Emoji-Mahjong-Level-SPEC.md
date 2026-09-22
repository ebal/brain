# Emoji Mahjong --- Progressive Visual Search & Planning --- Specification

## 1. Goal

Add a relaxing, mobile-first **Mahjong Solitaire-style** game to Brain
using emoji instead of traditional Mahjong tiles.

The player removes matching pairs of currently free tiles until the
board is cleared.

Unlike the earlier difficulty-based design, Emoji Mahjong is a
**progressive level game**:

``` text
Level 1 → Level 2 → Level 3 → ... → Level 50
```

Each level gradually increases the amount of blocking, layering,
dependency depth, and planning required.

The game primarily exercises and tracks performance in:

-   visual search
-   spatial planning
-   pattern matching
-   sustained attention
-   look-ahead

This is simplified Mahjong Solitaire, not traditional four-player
Mahjong and not a clinical assessment.

------------------------------------------------------------------------

## 2. Brain chooser entry

**🀄 Emoji Mahjong**

> Match free emoji tiles and clear the board. Visual search & planning.

When progress exists, the chooser may additionally show:

``` text
Level 23 / 50
Continue
```

Do not clutter the main Brain chooser with detailed statistics.

------------------------------------------------------------------------

## 3. Core rule

Every emoji belongs to a matching pair.

Select two identical **free** tiles:

``` text
🐶 + 🐶 → removed
```

Removing pairs exposes previously blocked tiles.

Goal:

``` text
tiles remaining = 0
```

Completion unlocks the next level.

------------------------------------------------------------------------

## 4. Free-tile rule

A tile is selectable only when:

1.  no tile covers it from above, and
2.  at least one horizontal side is open:
    -   left side, or
    -   right side

The engine determines this from logical board geometry.

Do not infer availability from CSS position or visual appearance.

------------------------------------------------------------------------

## 5. Simplified Brain rules

V1 does not use:

-   traditional suits
-   winds
-   dragons
-   flowers/seasons
-   special matching exceptions
-   traditional Mahjong scoring
-   multiplayer rules

Every match is:

``` text
same emoji + same emoji
```

No exceptions.

------------------------------------------------------------------------

# LEVEL SYSTEM

## 6. Progressive level model

V1 contains **50 deterministic levels**.

``` text
1 → 2 → 3 → ... → 50
```

Rules:

-   Level 1 unlocked initially.
-   Clearing Level N unlocks Level N+1.
-   Completed levels remain replayable.
-   Locked levels cannot be started.
-   The same level always uses the same logical puzzle.
-   Level definitions must not silently change after release.

The purpose is to create a natural:

``` text
one more level
```

progression rather than asking the player to choose Easy/Medium/Hard.

------------------------------------------------------------------------

## 7. Difficulty progression

Suggested level progression:

  Levels     Approx. tiles   Layers Character
  -------- --------------- -------- -------------------------
  1--5               8--20        1 Tutorial / introductory
  6--10             20--28     1--2 Simple
  11--20            28--36        2 Easy planning
  21--30            36--48     2--3 Intermediate
  31--40            48--56        3 Hard
  41--45            56--64     3--4 Deep dependencies
  46--50            64--72       4+ Advanced

These are design targets, not rigid formulas.

Do not make every level larger than the previous one.

A smaller board may be harder when its geometry creates:

-   fewer initial free tiles
-   fewer available pairs
-   deeper dependencies
-   stronger bottlenecks
-   more consequential removal choices

Difficulty should come from puzzle structure, not merely tile count.

------------------------------------------------------------------------

## 8. Difficulty characteristics

When ranking/curating levels, consider:

``` text
tile count
layer count
maximum stack depth
initial free-tile count
initial removable-pair count
dependency depth
bottlenecks
solver branching
number of viable removal paths
dead-end opportunities
```

Do not expose these technical values in the normal UI.

They exist to help order the campaign sensibly.

------------------------------------------------------------------------

## 9. Tutorial levels

Levels 1--4 teach the game through interaction rather than a long
instructions page.

### Level 1 --- Matching

Very small, flat board.

Teach:

``` text
same emoji + same emoji → remove
```

All or almost all tiles are free.

### Level 2 --- Open sides

Introduce horizontal blocking.

When the player taps a blocked tile for the first time, briefly explain:

``` text
Blocked — needs an open side
```

### Level 3 --- Layers

Introduce a tile covering another tile.

First blocked-cover tap may explain:

``` text
Blocked — tile on top
```

### Level 4 --- Planning

Introduce the first puzzle where removal order meaningfully matters.

Teach Undo naturally.

### Level 5+

Normal game UI.

Do not repeatedly show tutorial explanations after the player has
learned them.

------------------------------------------------------------------------

## 10. Level definitions

Each level stores conceptually:

``` text
{
  id,
  version,
  layoutId,
  seed,
  tileCount,
  optimalMetadata,
  difficultyRank
}
```

The level's layout + deterministic assignment must reproduce the same
starting puzzle.

If a level must be changed after release because of a correctness
problem, increment its version and handle existing saved progress
safely.

------------------------------------------------------------------------

# SOLVABILITY

## 11. Guaranteed solvability

Every shipped level must have at least one known path that clears the
entire board.

Never:

``` text
create pairs
→ random shuffle
→ fill layout
→ hope it is solvable
```

That is unacceptable.

------------------------------------------------------------------------

## 12. Solvable generation

Preferred approach:

``` text
empty layout
    ↓
construct matching pairs in a valid reverse-removal order
    ↓
complete full board
    ↓
solver verifies complete solution
    ↓
accept level
```

Alternatively:

``` text
candidate assignment
    ↓
solver
    ↓
accept only if fully clearable
```

Either is valid if correctness is proven.

For campaign levels, it is acceptable and preferable to
generate/validate puzzles during development and ship deterministic
level definitions rather than solving expensive generation problems at
runtime.

------------------------------------------------------------------------

## 13. Solver

Keep pure solver logic outside Vue.

Useful functions:

``` javascript
isTileFree(state, tileId)
getFreeTiles(state)
getAvailablePairs(state)
removePair(state, a, b)
undoPair(state, move)
isDeadEnd(state)
isBoardCleared(state)
solveBoard(state)
getSolvableNextPairs(state)
```

Use memoization/transposition caching where useful.

The solver is used for:

-   validating all 50 levels
-   detecting dead ends
-   Hint
-   difficulty analysis
-   tests

It is not an AI opponent.

------------------------------------------------------------------------

## 14. Player-created dead ends

A starting level can be guaranteed solvable while the player can still
choose a poor removal order and reach:

``` text
tiles remain
AND
no matching free pair exists
```

This is intentional.

Show:

``` text
No available pairs

[ Undo ]
[ Restart ]
```

If Hint can meaningfully help from the current state, it may also remain
available.

Do not automatically reshuffle the board.

Planning matters.

------------------------------------------------------------------------

# VISUAL STATE SYSTEM

## 15. Visual-state principle

The player must be able to understand four states immediately:

``` text
FREE
BLOCKED
SELECTED
HINTED
```

The UI must make them distinct without making blocked emoji unreadable.

Blocked tiles are still strategically important because the player needs
to plan which pairs will become available later.

Therefore:

> **Blocked emoji must remain readable enough for strategic planning.**

This is a hard UX requirement.

------------------------------------------------------------------------

## 16. Free tile

A free/selectable tile should appear fully available.

Recommended visual characteristics:

``` text
brightness / opacity: 100%
normal tile background
normal border
normal shadow/depth
emoji fully saturated/readable
```

The player should intuitively understand:

``` text
I can tap this.
```

Do not make every free tile glow or pulse.

Availability should be clear but visually quiet.

------------------------------------------------------------------------

## 17. Blocked tile

Blocked tiles remain visible but visually recede.

Recommended starting values:

``` text
overall opacity: approximately 0.60–0.70
reduced shadow
slightly muted tile background
emoji remains clearly identifiable
```

Do not:

-   hide blocked tiles
-   reduce opacity to near invisibility
-   heavily grayscale emoji
-   blur emoji
-   overlay permanent lock icons

The player must still be able to think:

``` text
There is another 🐶 underneath there.
```

Tune exact opacity on a real iPhone.

------------------------------------------------------------------------

## 18. Selected tile

Selection must be unmistakable.

Recommended:

``` text
100% brightness
strong outline/border
slightly stronger shadow/lift
```

Do not significantly scale the tile because layered Mahjong tiles
overlap and scaling can distort board geometry.

Only one tile can be selected at a time.

------------------------------------------------------------------------

## 19. Hinted tile

Hint highlights a valid matching pair.

Use:

``` text
outline
+
subtle pulse
```

Do not recolor the emoji itself.

The hint animation should stop when:

-   either hinted tile is selected
-   another action changes the board
-   a short timeout expires

------------------------------------------------------------------------

## 20. Removed tile

Removed tile:

``` text
hidden
non-interactive
```

Its logical slot remains part of the immutable layout geometry.

A short removal/fade animation is acceptable, but keep it fast.

------------------------------------------------------------------------

## 21. Recommended state table

  State        Brightness Border          Shadow     Interaction
  ---------- ------------ --------------- ---------- ------------------
  Free               100% normal          normal     selectable
  Blocked       \~60--70% subtle          reduced    blocked feedback
  Selected           100% strong          stronger   selected
  Hinted             100% pulse outline   normal     selectable
  Removed          hidden ---             ---        none

These values are starting points for physical-device testing.

------------------------------------------------------------------------

## 22. Blocked-tile feedback

Tapping a blocked tile is not a Mistake.

Provide short feedback:

``` text
small shake
+
Blocked
```

Suggested shake duration:

``` text
100–150 ms
```

During tutorial levels, optionally explain the reason:

``` text
Blocked — tile on top
```

or:

``` text
Blocked — both sides closed
```

After tutorial levels, a simple:

``` text
Blocked
```

or brief lock affordance is enough.

------------------------------------------------------------------------

## 23. Temporary lock affordance

If useful, tapping a blocked tile may briefly show:

``` text
🔒
```

for approximately:

``` text
300–500 ms
```

Then remove it.

Do not permanently render locks over every blocked tile.

That would create visual noise.

------------------------------------------------------------------------

# LAYER VISUALIZATION

## 24. Layer readability

The player must understand which tile is physically above another.

Use consistent visual depth.

Possible implementation:

``` text
small x offset per layer
small y offset per layer
z-index
shadow
edge/border
```

Suggested starting offset:

``` text
3–4 CSS px per layer
```

Exact values depend on tile size.

Do not exaggerate perspective.

------------------------------------------------------------------------

## 25. Layer example

Conceptually:

``` text
          ┌───────┐
          │  🐶   │
      ┌───┴───────┴───┐
      │ 🍎          🚀 │
   ┌──┴──────┐  ┌──────┴──┐
   │   🌈    │  │    🍋   │
   └─────────┘  └─────────┘
```

The top tile should visibly feel above the lower tiles.

Clarity outranks decorative 3D appearance.

------------------------------------------------------------------------

## 26. Do not over-highlight legal tiles

Do not make every free tile look like:

``` text
✨🐶 ✨🍎 ✨🚀 ✨🐱
```

The game still contains visual search.

The free/blocked distinction should be perceivable, not an automatic
answer overlay.

------------------------------------------------------------------------

# GAMEPLAY

## 27. Emoji pool

Use locally defined Unicode emoji only.

Example pool:

``` text
🐶 🐱 🦊 🐼 🐸 🐵 🐰 🦁
🍎 🍋 🍇 🍓 🥝 🍒 🍊 🍉
🚗 🚀 🎈 🎲 💎 🎁 🔔 ☂️
🌞 ⭐ 🌙 🌈 🔥 🌸 🍀 ❄️
⚽ 🏀 🎾 🏐 🎯 🥊 🏓 🏸
```

Prefer visually distinct, broadly supported emoji.

Avoid:

-   flags
-   skin-tone variants
-   complex family/ZWJ emoji
-   near-identical faces/hearts
-   obscure emoji with inconsistent support

No remote tile assets.

------------------------------------------------------------------------

## 28. Interaction

Tap a free tile to select it.

Then tap another free tile.

### Same emoji

``` text
🐶 + 🐶
```

Remove both.

### Different emoji

Brief mismatch feedback; remove neither.

### Blocked tile

Do not select it.

Provide blocked feedback.

### Selected tile tapped again

Deselect it.

No Submit button.

------------------------------------------------------------------------

## 29. Moves and mistakes

A Move is one completed comparison between two free tiles.

Matching pair:

``` text
Moves +1
Mistakes +0
```

Different free emoji:

``` text
Moves +1
Mistakes +1
```

Blocked taps and deselection are not Moves or Mistakes.

------------------------------------------------------------------------

## 30. Undo

Support multiple Undo operations.

Undo restores the most recently removed pair and all resulting
blocked/free relationships.

Undo:

-   does not rewind time
-   increments Undos
-   should preserve deterministic board state

Undo is the primary recovery mechanism after poor planning.

------------------------------------------------------------------------

## 31. Restart

Restart restores the exact initial state of the current level.

After meaningful progress, ask for confirmation.

Restart does not generate a new puzzle.

------------------------------------------------------------------------

## 32. Hint

Hint must be solver-backed.

Highlight one currently removable matching pair that lies on at least
one valid path to clearing the current board, where the solver can
establish this.

Do not knowingly suggest a move that forces a dead end.

Track:

``` text
Hints Used
```

Hint-assisted completion is valid but cannot earn the best clean star
result.

------------------------------------------------------------------------

## 33. No Shuffle

Do not add Shuffle in v1.

Shuffle:

-   weakens planning
-   obscures dead-end consequences
-   can hide generator/solver problems

Undo + Restart + Hint are sufficient.

------------------------------------------------------------------------

## 34. Timer

Use a count-up timer with:

``` javascript
performance.now()
```

No hard time limit.

Emoji Mahjong should feel thoughtful and relaxing.

Start when the level becomes interactive.

Stop when the final pair is removed.

------------------------------------------------------------------------

# LEVEL RESULTS AND STARS

## 35. Primary result

Primary outcome:

``` text
Level Cleared
```

Then show:

-   Time
-   Moves
-   Mistakes
-   Hints
-   Undos

Score is secondary.

------------------------------------------------------------------------

## 36. Stars

Use a simple level-star system.

Recommended:

``` text
★★★  cleared + zero hints + target time achieved
★★☆  cleared + zero hints
★☆☆  cleared
```

Undo does not automatically prevent 3 stars.

The player is allowed to experiment.

Target time must be established from puzzle complexity and play-testing,
not arbitrary global thresholds.

Do not require stars to unlock the next level.

Completion alone unlocks progression.

------------------------------------------------------------------------

## 37. Target time

Each level may define:

``` text
targetTime
```

for the 3-star challenge.

Target time should be:

-   realistic
-   level-specific
-   tested on mobile
-   generous enough that planning remains enjoyable

If target times cannot be calibrated reliably before release, use a
simpler star rule initially:

``` text
★★★ cleared + zero hints
★★☆ cleared + <= 1 hint
★☆☆ cleared
```

Correctness and enjoyment outrank having a timer-based star system.

------------------------------------------------------------------------

## 38. Score

Score appears on Results only.

Suggested conceptual inputs:

``` text
level complexity
completion
time
mistakes
hints
undos
```

Do not force one global formula before real level data exists.

For the level-based redesign, prefer implementing and tuning the 50
levels first, then calibrating score from actual play data.

Raw results + stars are sufficient for v1 if necessary.

------------------------------------------------------------------------

## 39. Results screen

Example:

``` text
LEVEL 23 COMPLETE

★★★

Time              02:13
Moves                18
Mistakes              2
Hints                 0
Undos                 2

Best Time          02:08

[ NEXT LEVEL ]
[ PLAY AGAIN ]
```

If Score is implemented:

``` text
Score              4,320
```

Keep it secondary.

Primary action after first completion:

``` text
Next Level
```

------------------------------------------------------------------------

## 40. Per-level personal bests

Track:

-   best Stars
-   best clean Time
-   best Time
-   fewest Moves
-   fewest Mistakes
-   hints/undos associated with best result

Do not compare Level 8 directly with Level 38 as though they are
equivalent tasks.

------------------------------------------------------------------------

## 41. Level selector

Simple grid/list:

``` text
1 ★★★   2 ★★☆   3 ★★★   4 ★☆☆
5 ★★☆   6 ★★★   7 🔒    8 🔒
```

Also show:

``` text
23 / 50 completed
```

No decorative world map is required.

------------------------------------------------------------------------

## 42. Overall progression

Track:

-   highest unlocked level
-   levels completed
-   total stars
-   3-star levels
-   clean completions
-   total play time

Do not create a universal cognitive/brain score.

------------------------------------------------------------------------

# HISTORY / PERSISTENCE

## 43. History

Keep the last **30 completed level attempts** globally or per reasonable
campaign-history convention.

Each entry:

``` text
{
  levelId,
  levelVersion,
  layoutId,
  seed,
  stars,
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

Per-level best data is stored separately from rolling history.

------------------------------------------------------------------------

## 44. Pause / app switching

Support manual Pause.

Automatically pause when the PWA becomes hidden.

When paused:

-   stop timer
-   disable interaction
-   preserve exact board

The board may be visually obscured for consistency with Brain.

Resume restores the exact state.

------------------------------------------------------------------------

## 45. Autosave / Continue

Maintain one active Emoji Mahjong level.

Save after:

-   pair removal
-   Undo
-   Hint
-   Pause
-   visibility change

Conceptual state:

``` text
{
  levelId,
  levelVersion,
  layoutId,
  seed,
  tileAssignments,
  removedTileIds,
  moveHistory,
  moves,
  mistakes,
  hints,
  undos,
  elapsedTime,
  startedAt,
  updatedAt,
  metricVersion
}
```

Do not persist a half-completed pair selection.

Continue restores:

-   exact level
-   exact emoji placement
-   exact removed tiles
-   no selected tile

------------------------------------------------------------------------

# MOBILE UX

## 46. Mobile-first requirement

Primary target: iPhone portrait.

Requirements:

-   board is visual focus
-   no normal page scrolling during a level
-   practical touch targets
-   emoji readable
-   layering obvious
-   blocked/free distinction clear
-   blocked emoji still readable
-   selected state unmistakable
-   Undo/Hint reachable
-   Restart protected
-   timer secondary
-   pairs/tiles remaining visible
-   no hover dependency
-   no accidental text selection
-   avoid double-tap zoom
-   safe-area aware

------------------------------------------------------------------------

## 47. Large levels

Advanced levels may contain 64--72 tiles.

Do not solve this by making tiles unreadably small.

Use:

-   compact mobile-specific layouts
-   careful overlap
-   responsive uniform board scaling
-   controlled layer offsets

If a proposed advanced layout is not comfortable on a physical iPhone,
reject or redesign that layout.

Mobile usability is a level-validation requirement.

------------------------------------------------------------------------

## 48. Physical-device visual validation

Before accepting a level into the campaign, validate on target mobile
dimensions:

-   free emoji clearly readable
-   blocked emoji clearly readable
-   selected tile obvious
-   layer ordering understandable
-   no accidental overlap hiding critical tile identity
-   tap targets reliable
-   no board overflow

This is especially important for Levels 31--50.

------------------------------------------------------------------------

# HOW TO PLAY

## 49. About / How to Play

Keep explanation short:

> Match two identical emoji tiles to remove them. You can only select a
> free tile: it must have no tile covering it and at least one side
> open. Remove all pairs to clear the level.

Visual examples should explain:

``` text
FREE
BLOCKED — side
BLOCKED — covered
SELECTED
```

The first four levels remain the primary tutorial.

------------------------------------------------------------------------

# ARCHITECTURE / TESTING

## 50. Architecture

Integrate with Brain's existing Vue/Vite conventions.

Do not redesign Brain.

Conceptually:

``` text
components/emojimahjong/
composables/emojimahjong/
game/emojimahjong/
```

Pure logic:

``` javascript
createLevel(levelDefinition)
isTileFree(state, tileId)
getBlockingReason(state, tileId)
getFreeTiles(state)
getAvailablePairs(state)
removePair(state, a, b)
undoPair(state, move)
isDeadEnd(state)
isBoardCleared(state)
solveBoard(state)
getSolvableNextPairs(state)
calculateStars(result, level)
```

------------------------------------------------------------------------

## 51. Tests

At minimum test:

### Geometry/free-state

-   covered tile blocked
-   uncovered tile with open left side free
-   uncovered tile with open right side free
-   both horizontal sides blocked means blocked
-   removing tiles correctly changes availability
-   blocking reason correct

### Pairing

-   identical free tiles remove
-   different free tiles do not
-   blocked tile cannot match
-   blocked tap is not a Mistake

### Levels

-   exactly 50 level definitions
-   level IDs unique
-   deterministic level reproduction
-   expected tile count
-   all emoji occur in valid pairs
-   every level solver-verified clearable
-   progression order valid

### Solver

-   known tiny layouts solve
-   dead-end detection
-   Hint proposes a valid solvable-path pair
-   memoized results deterministic

### Progression

-   Level 1 initially unlocked
-   clearing level unlocks next
-   replay does not corrupt unlock state
-   stars update only when improved

### Visual-state model

Where feasible in component tests:

-   free state class
-   blocked state class
-   selected state
-   hinted state
-   removed state
-   blocked feedback does not alter game state

### Persistence

-   active level restores exact board
-   level version restored
-   no half-selection restored
-   campaign progress preserved

------------------------------------------------------------------------

# OFFLINE

## 52. Offline / PWA

Emoji Mahjong must work completely offline inside Brain.

Requirements:

-   all 50 level definitions local
-   emoji pool local
-   layouts local
-   solver local
-   no runtime API
-   no CDN
-   no remote tile images/fonts
-   progression stored locally
-   active level resumable offline
-   cold-start from installed Brain PWA in Airplane Mode

Adding Emoji Mahjong introduces **zero required runtime network
dependencies**.

------------------------------------------------------------------------

## 53. Future changes

Not v1:

-   Levels 51--100
-   Daily Challenge
-   Shuffle
-   boosters/power-ups
-   traditional Mahjong artwork/rules
-   3D engine
-   procedural runtime campaign generation
-   custom layouts
-   multiplayer
-   leaderboards
-   cloud sync
-   themed emoji packs

If Levels 1--50 are enjoyable and well calibrated, Levels 51--100 can be
added later.

------------------------------------------------------------------------

## 54. Final v1 decisions

1.  Name: **Emoji Mahjong**.
2.  Mahjong Solitaire-style single-player puzzle using Unicode emoji.
3.  Transform from difficulty selector into **50 progressive levels**.
4.  Level completion unlocks the next level.
5.  Completed levels replayable.
6.  Same level always reproduces the same puzzle/version.
7.  Levels 1--4 act as interactive tutorial.
8.  Difficulty increases through geometry, layers, dependencies,
    bottlenecks, and choices --- not just tile count.
9.  Approximate ceiling 64--72 tiles for advanced levels.
10. Every starting level solver-verified as fully clearable.
11. Player choices may still create dead ends.
12. Free tile = uncovered + at least one horizontal side open.
13. Free tiles use full visual prominence.
14. Blocked tiles use approximately **60--70%** prominence but emoji
    remain clearly readable.
15. Blocked emoji readability is a hard UX requirement.
16. Selected tile uses strong outline/lift without disruptive scaling.
17. Hinted pair uses subtle pulsing outline.
18. Removed tiles hidden.
19. Layer depth shown through consistent offset/shadow/z-index.
20. Blocked tap produces short shake + feedback; no Mistake.
21. Tutorial levels may explain exact blocking reason.
22. No permanent lock icons.
23. Do not strongly glow every free tile.
24. Multiple Undo supported.
25. Solver-backed Hint.
26. No Shuffle in v1.
27. No hard time limit.
28. Stars provide level progression feedback.
29. Completion alone unlocks next level; stars are optional mastery.
30. Score secondary and may be deferred until level calibration.
31. Per-level personal bests.
32. Autosave / Continue.
33. Mobile/iPhone-first.
34. Advanced layouts require physical-device visual validation.
35. Existing Brain architecture.
36. No backend/database.
37. Full offline/PWA support.
