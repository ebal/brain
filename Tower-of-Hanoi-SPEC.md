# Tower of Hanoi --- Planning & Sequential Problem Solving --- Specification

## Goal

Add a progressive, mobile-first Tower of Hanoi puzzle to Brain. Move a
complete disk tower from peg A to peg C, one disk at a time, never
placing a larger disk on a smaller one. It exercises planning,
sequential problem solving, working memory, rule maintenance, and
look-ahead.

## Brain entry

**🗼 Tower of Hanoi** --- Move the tower in as few moves as possible.
Planning & sequential problem solving.

## Core rules

Three pegs: A, B, C. The starting tower is on A, largest disk at the
bottom. Only a peg's top disk may move. Destination must be empty or
topped by a larger disk. Goal: complete ordered tower on C.

## Natural progression

Use six straightforward levels:

  Level     Disks   Optimal Moves
  ------- ------- ---------------
  1             3               7
  2             4              15
  3             5              31
  4             6              63
  5             7             127
  6             8             255

Optimal moves = `2^n - 1`.

Do not add 9+ disks in v1: 511+ moves becomes repetitive execution
rather than useful progression. If later testing shows a need for more
levels, add meaningful challenge variants only if they remain enjoyable;
do not inflate level count artificially.

## Unlocking

Level 1 starts unlocked. Legal completion unlocks the next level;
optimal completion is not required. Completed levels remain replayable.

## Interaction

Use reliable mobile tap interaction: 1. tap a peg/top disk 2. highlight
selected disk and legal destination pegs 3. tap destination 4. make
legal move

Do not require drag-and-drop in v1.

Illegal destination: board unchanged, brief feedback, Mistakes +1.
Selection changes are not mistakes.

## Moves and optimum

Every successful transfer increments Moves. Calculate optimum directly
as `(2 ** disks) - 1`. Primary result is Moves vs Optimal.

Efficiency: `optimalMoves / actualMoves × 100`, capped at 100%.

## Stars

Suggested: - ★★★ optimal solution - ★★☆ actual moves \<= \~115% of
optimum - ★☆☆ completed

Use sensible integer rounding. Hint-assisted completion cannot earn
clean 3 stars.

## Timer

Count up with `performance.now()`. No hard time limit. Time is secondary
to Moves.

## Undo / Restart / Hint

Support multiple Undo; restore exact previous legal move, track Undos,
do not rewind time. Restart restores initial tower. Hint uses the
deterministic optimal Hanoi strategy to highlight source disk/peg and
recommended destination; it does not move automatically. Track Hints.

## Completion

Complete when all disks are legally ordered on peg C. Stop timer
immediately and unlock next level.

## Results

Show Level Complete, stars, Disks, Moves, Optimal, Efficiency, Time,
Mistakes, Undos, Hints, best Moves/Time, and prominent Next Level / Play
Again.

## Personal bests

Per level/disk count track Best Moves, Best Clean Moves, Stars,
Efficiency, and Time for equivalent move result. Compare by fewer Moves,
then Hints, Mistakes, Undos, then Time.

## Level selector

Simple numbered level grid with stars and locks. No decorative world
map.

## Pause/autosave

When hidden, pause timer, preserve exact peg state, clear current
selection. Save after every legal move, Undo, Hint, Pause, and
visibility change. Continue restores exact disks, pegs, history, moves,
mistakes, undos, hints, elapsed time, and metricVersion.

## Mobile UX

iPhone portrait first. All three pegs visible simultaneously; no
active-play scrolling; top disks easy to select; legal destinations
clear; disk sizes distinguishable; no hover/text selection/double-tap
zoom; safe-area aware; one-handed tap interaction where practical.

Use CSS/SVG disks, no external assets. Disk identity is primarily
width/size, not color.

## Animation

Optional short lift/move/drop animation. Keep it fast and consistent so
it does not materially distort completion time or block rapid play.

## Practice

Interactive 2- or 3-disk demo: move tower A → C, one disk at a time,
never larger-on-smaller. No score/history.

## Architecture

Integrate with Brain conventions. Pure functions include
`createHanoiState`, `getTopDisk`, `isLegalMove`, `applyMove`,
`undoMove`, `isSolved`, `getOptimalMoveCount`, `getOptimalNextMove`,
`calculateEfficiency`, and `calculateStars`. No complex AI solver is
needed.

## Tests

Test initial ordering, top-disk restriction, legal
empty/smaller-on-larger moves, illegal larger-on-smaller, exact state
updates/Undo, solved detection, optimal counts for 3--8 disks, legal
optimal Hint, efficiency/stars, unlocking, and autosave restore.

## Offline/PWA

All logic and SVG/CSS visuals local. No API/CDN/images. Progress/history
and active game work offline and cold-start from installed Brain PWA in
Airplane Mode.

## Future

No 4+ pegs, Reve's puzzle, mandatory drag-and-drop, 9+ disks, Daily
Challenge, leaderboards, themes, or global Brain Score in v1.

## Final decisions

1.  Tower of Hanoi with 3 pegs.
2.  Six levels: 3--8 disks.
3.  One top disk at a time; never larger-on-smaller.
4.  Goal A → C.
5.  Mathematical optimum `2^n - 1`.
6.  Do not exceed 8 disks in v1.
7.  Completion unlocks next level.
8.  Primary metric Moves vs Optimal.
9.  Efficiency and 3-star progression.
10. No hard timer.
11. Multiple Undo, Restart, optimal-strategy Hint.
12. Tap-select/tap-destination.
13. Autosave/Continue.
14. Mobile/iPhone-first.
15. Existing Brain architecture.
16. No backend.
17. Full offline/PWA.
