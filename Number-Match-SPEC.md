# Number Match — Numerical Search & Planning — Specification

## 1. Goal

Add a small, addictive, mobile-first **Number Match** puzzle to Brain.

Remove two digits when they are either **identical** or **add up to 10**, provided they also satisfy the board connection rules.

Examples:

```text
8 + 8 ✓
3 + 3 ✓
1 + 9 ✓
2 + 8 ✓
3 + 7 ✓
4 + 6 ✓
5 + 5 ✓
```

The game combines visual search, numerical processing, sustained attention, planning, and pattern recognition. It is a casual cognitive puzzle, not a clinical or mathematical-ability assessment.

## 2. Brain chooser entry

**🔟 Number Match**

> Match identical numbers or pairs that add up to 10. Clear the board with careful planning.

## 3. Numeric rule

A pair is numerically valid when:

```text
a === b
OR
a + b === 10
```

Digits are 1–9.

## 4. Board

Use a rectangular grid.

```text
1  4  7  3  8  8
6  2  5  5  1  9
3  7  4  6  2  8
```

Removed cells become empty but do not collapse/reflow:

```text
1  ·  ·  9
6  2  8  ·
3  ·  ·  7
```

Stable positions are important for planning.

## 5. Connection rules

A numerically valid pair can be removed when connected by:

- horizontal path
- vertical path
- true diagonal path
- sequential row-wrap path

For straight-line paths, every logical cell between the selected numbers must already be empty. Adjacent cells are valid automatically.

Examples:

```text
3 · · 7      ✓
3 · 5 · 7    ✕
```

Vertical and diagonal paths follow the same clear-intermediate-cell rule.

## 6. Sequential row-wrap

Also treat the board as a row-major linear sequence.

Two valid numbers may match when every flattened logical cell between them is empty, allowing continuation across row boundaries.

```text
row 1: · · · · · 4
row 2: 6 · · · · ·
```

`4 + 6 = 10`, so this may match when nothing occupied lies between them in flattened order.

## 7. Legal-pair function

Conceptually:

```text
numericMatch(a,b)
AND
(horizontalClear
 OR verticalClear
 OR diagonalClear
 OR sequentialClear)
```

Keep this pure and unit-testable.

## 8. Interaction

1. Tap a number.
2. Highlight it.
3. Tap another.
4. Validate numeric + path rules.
5. Remove both if legal.

Invalid pair/path: brief feedback, Mistakes +1, board unchanged, selection cleared.

Tapping selected number again deselects it. Empty cells do nothing.

Do not permanently highlight every available pair.

## 9. Difficulty

| Difficulty | Columns | Starting rows | Cells | Add Numbers |
|---|---:|---:|---:|---:|
| Easy | 6 | 3 | 18 | 4 |
| Medium | 7 | 4 | 28 | 3 |
| Hard | 8 | 5 | 40 | 2 |
| Very Hard | 9 | 6 | 54 | 2 |
| Expert | 9 | 8 | 72 | 2 |
| Extreme | 9 | 10 | 90 | 1 |

These are initial tuning values.

Difficulty comes from board size, search possibilities, planning depth, and limited Add Numbers opportunities.

If 9 columns are too cramped on a physical iPhone, tune Very Hard. Mobile usability outranks preserving arbitrary dimensions.

## 10. Initial generation

Generate locally using digits 1–9.

Do not use completely unconstrained randomness.

Require:

- at least one legal opening pair
- reasonable digit distribution
- deterministic generation from a seed
- no extreme domination by one digit

A guaranteed full clear is desirable but not mandatory because Add Numbers is a core mechanic.

The game must never start with zero legal moves.

## 11. Add Numbers

When stuck, the player may press:

```text
Add Numbers
```

Take every currently occupied number in board reading order and append a copy to the end of the logical board.

Empty/removed cells are not copied.

Example remaining values:

```text
3 7 4 6
```

append:

```text
3 7 4 6
```

into new cells/rows.

Uses:

```text
Easy       4
Medium     3
Hard       2
Very Hard  2
```

Display `Add Numbers (2)` and disable at zero.

## 12. Board expansion

Add Numbers may create new rows.

A dedicated vertically scrolling board region is acceptable after expansion.

Requirements:

- header/controls remain accessible
- no horizontal scrolling in normal portrait play
- cells remain large enough to tap
- logical positions never reflow
- selection remains stable

## 13. End states

### Win

No numbers remain:

`Board Cleared!`

### Stalled

Numbers remain, no legal pairs, Add Numbers available:

`No matches available — Try Add Numbers`

### Game Over

Numbers remain, no legal pairs, Add Numbers = 0:

`No more matches`

This is a completed attempt but not a cleared board.

## 14. Hint

Hint highlights one currently legal pair using the same `findLegalPairs()` logic as gameplay.

It does not remove the pair.

Track Hints Used.

## 15. Undo

Support multiple Undo operations for successful removals.

Restore both numbers to their exact cells. Do not rewind time.

Track Undos.

Add Numbers does not need Undo in v1. If necessary, clear removal Undo history when Add Numbers is used to keep state unambiguous.

## 16. Timer

Count up with `performance.now()`.

No hard limit.

Stop when the board is cleared or reaches no-pairs/no-adds Game Over.

## 17. Moves and mistakes

A Move is one completed two-number attempt.

```text
legal removal  = 1 Move, 0 Mistakes
invalid pair   = 1 Move, 1 Mistake
```

Single selection/deselection is not a Move.

## 18. Primary result

Primary:

```text
Board Cleared: Yes / No
```

If not cleared:

```text
Numbers Remaining
```

Also show:

- Time
- Moves
- Mistakes
- Add Numbers used
- Hints
- Undos

## 19. Score

Score is secondary and shown on Results, not prominently during play.

Base:

```text
Easy        3000
Medium      5000
Hard        7500
Very Hard  10000
Expert     13000
Extreme    16000
```

Reward:

`+50 per removed pair`

Penalties:

```text
Mistake      -50
Hint         -150
Add Numbers  -200
Undo          -25
Time          -5 per 10 whole seconds
```

Clear bonus:

```text
Easy         +500
Medium       +750
Hard        +1000
Very Hard   +1250
Expert      +1500
Extreme     +2000
```

Minimum score 0. Tune constants through real play.

## 20. Results

```text
Board Cleared!

Difficulty        Medium
Score              5,920
Time               04:18
Moves                 26
Mistakes               3
Add Numbers            1
Hints                  0
Undos                  1

Best Score          6,140
Best Time           03:52

[ Play Again ]
```

For stalled games show Numbers Left prominently.

## 21. Clean completion

Clean means:

```text
board cleared
AND
hints = 0
```

Using Add Numbers does not disqualify Clean because it is a core mechanic.

Track Best Score, Best Clean Score, and Best Clear Time.

## 22. History and statistics

Keep last 30 attempts per difficulty.

Store:

```text
difficulty, seed, boardCleared, startingCells,
numbersRemaining, pairsRemoved, score,
completionTime, moves, mistakes, addNumbersUsed,
hints, undos, clean, completedAt, metricVersion
```

Track clear rate, best/median scores and times, average numbers remaining, moves, mistakes, Add Numbers, hints, and total pairs removed.

Do not combine difficulties into one universal score.

## 23. Pause / autosave

Follow Brain conventions.

When hidden: pause timer, preserve board, clear half-selection.

Autosave after removal, invalid completed Move, Add Numbers, Hint, Undo, Pause/visibility change.

Continue restores the exact expanded logical board and Add Numbers count.

## 24. Mobile-first UX

Primary target: iPhone portrait.

```text
Number Match             03:14
Medium

Numbers Left: 18
Moves: 12      Mistakes: 2

┌───┬───┬───┬───┬───┬───┬───┐
│ 3 │ · │ · │ 7 │ 8 │ 2 │ 5 │
│ 6 │ 4 │ · │ · │ 1 │ 9 │ 5 │
│ · │ 6 │ 4 │ · │ 2 │ 8 │ 3 │
└───────────────────────────────┘

Hint     Undo     Add Numbers (2)
```

Numbers must be readable, tap targets practical, empty cells quiet, controls reachable, no accidental zoom/text selection, safe-area aware.

Vertical board scrolling after expansion is allowed; horizontal scrolling should not be required.

For Expert and Extreme, keep the board at a maximum of **9 columns** and increase difficulty vertically. This deliberately avoids 10–12 column layouts that would make number cells too small on an iPhone. Expert and Extreme are expected to use the dedicated vertical board scroll region even before Add Numbers is used.

## 25. Visual design

Simple square/rounded cells.

States:

`occupied`, `empty`, `selected`, `hinted`, `invalid-feedback`, `recently-removed`

Do not color-code complementary pairs; that would reveal the arithmetic relationship.

## 26. How to Play

> Remove two numbers when they are identical or add up to 10.

```text
8 + 8 ✓
3 + 7 ✓
```

They must also be connected through the allowed board path.

```text
3 · · 7    ✓
3 · 5 · 7  ✕
```

> If you get stuck, Add Numbers copies the remaining digits to the end of the board and creates new matching opportunities.

Include a small untimed practice.

## 27. Architecture

Integrate with existing Brain Vue/Vite conventions.

Pure functions should include:

```javascript
isNumericMatch(a,b)
isHorizontalClear(...)
isVerticalClear(...)
isDiagonalClear(...)
isSequentialClear(...)
isLegalPair(...)
findLegalPairs(...)
removePair(...)
appendRemainingNumbers(...)
generateBoard(...)
calculateNumberMatchScore(...)
```

Keep matching/path logic independent of Vue.

## 28. Tests

Test:

- identical and sum-to-10 rules
- unrelated values fail
- horizontal/vertical/diagonal clear and blocked paths
- sequential row-wrap rules
- removal empties exactly two cells
- Add Numbers copies only occupied values in reading order
- uses decrement
- deterministic seed
- at least one opening pair
- cleared/stalled/game-over states
- persistence restores expanded board exactly

## 29. Offline / PWA

Fully offline inside Brain:

- local generation/matching engine
- no API/CDN/assets
- local scoring/persistence
- active game resumable offline
- cold-start in installed Brain PWA in Airplane Mode

Introduce zero runtime network dependencies.

## 30. Benchmark

Do not add to Brain Benchmark v1.

Puzzle variation and Add Numbers create substantial practice/configuration effects. A future benchmark may use a rotating versioned seed pool.

## 31. Future changes

Not v1:

- bombs/rockets/power-ups
- coins/lives/ads
- Daily Challenge
- custom target sums
- custom boards
- multiplayer/leaderboards
- cloud sync

## 32. Final v1 decisions

1. **Number Match**.
2. Digits 1–9.
3. Remove identical pairs OR pairs summing to 10.
4. Pair must satisfy legal connection path.
5. Horizontal, vertical, diagonal, sequential row-wrap.
6. Removed cells stay empty; no collapse.
7. Easy 6×3 / 18 / 4 Add Numbers.
8. Medium 7×4 / 28 / 3.
9. Hard 8×5 / 40 / 2.
10. Very Hard 9×6 / 54 / 2, subject to iPhone testing.
11. Expert 9×8 / 72 / 2.
12. Extreme 9×10 / 90 / 1.
13. Expert and Extreme increase vertical board depth rather than exceeding 9 columns.
14. At least one legal opening pair.
15. Deterministic seeded generation.
16. Add Numbers copies remaining values in reading order.
17. Board may vertically expand/scroll.
18. No hard time limit.
19. Hint shows one legal pair.
20. Multiple Undo for removals.
21. Primary outcome: Board Cleared / Numbers Remaining.
22. Score secondary, Results only.
23. Clean = cleared with zero Hints.
24. Autosave / Continue.
25. Last 30 attempts per difficulty.
26. Pure path/matching logic separated from Vue.
27. Mobile/iPhone-first.
28. Existing Brain architecture.
29. No backend/database.
30. Full offline/PWA.
31. Not part of Benchmark v1.

---

## 33. Implementation note: distinguishing "not a pair" from "blocked"

**Superseded by §34.** After shipping this fix, further playtesting feedback was that the
connection-rule concept itself (§5-§7) was the wrong design for this game, not just under-explained
— see §34. The path/connection system this note describes, and the `isConnected`/`reason`
machinery it added, were removed entirely in that pass. Kept here for the historical record.

Added after user playtesting reported taps on numerically-valid pairs (e.g. `5+5`, `6+4`) "not
always working," suspecting a math bug. Investigation (an independent brute-force reference
implementation of §5/§6's connection rules, cross-checked against the real code across 670,000+
random pair checks — zero discrepancies) confirmed the math and path logic were correct: on a
mostly-full board, two matching numbers can only connect if nothing else occupies every possible
path between them, which in practice usually means they must be near-neighbors. Most same-value or
sum-to-10 pairs elsewhere on the board are genuinely blocked until something between them clears —
this is §5's connection rule working as specified, not a bug.

The real problem was feedback: §8's "Invalid pair/path: brief feedback" gave the exact same
generic response whether the tapped numbers didn't add up at all, or added up correctly but had no
clear path. Fixed by distinguishing the two:

- `isConnected(state, i, j)` (composables/numbermatch/board.js) is now exported separately from
  `isLegalPair` — the same path check, without the numeric-match requirement.
- A failed tap now reports a `reason`: `'mismatch'` (the numbers don't add up) or `'blocked'`
  (they do, but nothing connects them right now). The game shows "Not a valid pair" vs. "Blocked —
  no clear path connects them right now" accordingly, held long enough to actually read (900ms, up
  from the original 400ms generic flash).
- How to Play (AboutPage.vue) gained an explicit note next to the existing "3 · · 7" / "3 · 5 · 7"
  example explaining that a blocked-but-numerically-valid pair is expected behavior, and its
  practice board now surfaces the same two distinct messages.

---

## 34. v2: position never matters — the connection rule is removed

Further user feedback after §33's fix: even with clearer messaging, the connection-rule concept
itself (§5 "Connection rules", §6 "Sequential row-wrap", §7 "Legal-pair function") felt arbitrary
and unfun for what's meant to be a simple, addictive game — explicitly compared to the
[Make 10 game](https://artfulmath.com/make-10-game/), where any two numbers that add up to 10
clear, full stop, regardless of where they sit on the board. The reported example: tapping a `6`
and a `4` failed as "blocked," but the *same* `6` matched with a *different* `4` elsewhere worked —
correct under the old path rule, but indistinguishable from a bug to a player, because in this
genre position isn't supposed to matter at all.

**Decision: remove §5/§6/§7 entirely.** A pair is legal whenever the two numbers are identical or
add up to 10 (§3's numeric rule) — nothing else. No row/column/diagonal/reading-order requirement,
no "clear path" concept, no `isConnected`. This also retires §33's `reason`
(`'mismatch'`/`'blocked'`) distinction along with it: there is only one way for a tap to fail now
(the numbers don't match), so the original single generic "Invalid pair" feedback is correct again
— §33's problem doesn't exist once there's nothing to disambiguate.

What this changes:

- **Board/matching logic** (composables/numbermatch/board.js): `isHorizontalClear`,
  `isVerticalClear`, `isDiagonalClear`, `isSequentialClear`, and `isConnected` are deleted.
  `isLegalPair(state, i, j)` is now just `isNumericMatch(a, b)` plus the existing non-null/i≠j
  guards. `findLegalPairs`, `removePair`, `appendRemainingNumbers` are unchanged — they never
  depended on path logic themselves.
- **Add Numbers is now a guaranteed unstick.** A direct, welcome side effect: since a duplicated
  value always matches its own copy regardless of where either one lands, Add Numbers can no
  longer fail to create at least one new legal pair (the old path rule meant a fresh duplicate
  could still be blocked). A truly stalled board now only happens through the player's own
  removals, and only when Add Numbers is also exhausted.
- **Difficulty is unchanged in shape** (§9's six tiers, same board sizes and Add Numbers counts) —
  removing the path requirement makes every tier meaningfully easier in practice, which matches the
  "easy and addictive" goal directly; difficulty was never meant to come from path geometry, only
  from board size and how sparing Add Numbers is.
- **How to Play** (AboutPage.vue) dropped the connection-rule explanation and the blocked-path
  example entirely, replaced with a one-line rule ("tap any two numbers, anywhere, that are
  identical or add up to 10") and a practice board that deliberately places matching numbers far
  apart with unrelated numbers between them, to demonstrate that position never matters.
- §4's "Board" and §8's "Interaction" (stable positions, tap-to-select, brief feedback on an
  invalid pair, Mistakes +1) are otherwise unaffected — only what counts as a *legal* pair changed,
  not how tapping, Undo, Hint, Add Numbers, or scoring work.