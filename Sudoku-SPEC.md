# Sudoku — Logic, Time and Progress — Specification

## 1. Goal

A clean, mobile-first Sudoku game for personal use.

The game uses standard **9×9 Sudoku** rules with three difficulty levels:

- **Easy**
- **Medium**
- **Hard**

Hard should be challenging but still enjoyable. The project deliberately avoids expert, extreme, or deliberately frustrating puzzles.

The main measurements are:

- completion time
- mistakes
- hints used
- puzzles completed
- best time
- average completion time
- current and best streak

There is no points system in v1. Sudoku already has a natural result: solve the puzzle correctly, preferably with fewer mistakes/hints and a better time.

---

## 2. Sudoku rules

Each puzzle uses a 9×9 grid divided into nine 3×3 boxes.

The player must fill every empty cell with a number from **1 to 9** so that:

- every row contains 1–9 exactly once
- every column contains 1–9 exactly once
- every 3×3 box contains 1–9 exactly once

The starting numbers are fixed clues and cannot be edited.

A puzzle is complete only when all 81 cells contain the correct values.

---

## 3. Difficulty

Difficulty should be based on the **logical techniques required to solve the puzzle**, not only on the number of empty cells.

| Difficulty | Intended experience |
|---|---|
| Easy | Relaxed, approachable, good for learning |
| Medium | Requires more scanning and candidate reasoning |
| Hard | Challenging, but still fair and reasonably solvable |

### Easy

Typical techniques:

- naked singles
- hidden singles
- straightforward row/column/box elimination

Avoid puzzles requiring advanced techniques.

### Medium

May additionally require:

- naked pairs
- hidden pairs
- locked candidates / box-line interactions

The puzzle should still progress without long periods of guessing.

### Hard

May additionally require:

- triples
- quads (naked/hidden quad elimination) — added after generation showed genuine "needs triples and
  nothing more" puzzles are vanishingly rare; most puzzles past the pair stage need this too
- repeated candidate interactions
- more involved locked-candidate reasoning
- several logical steps chained together

Hard should **not** intentionally require expert techniques such as:

- X-Wing
- Swordfish
- XY-Wing
- forcing chains
- trial-and-error / guessing

Those can belong to a future Expert difficulty.

### Difficulty validation

Do not classify difficulty only by clue count.

The puzzle generator/validator should solve the puzzle using the permitted logical techniques and classify it according to the hardest technique required.

Every puzzle must:

1. have exactly one solution
2. be solvable logically
3. match the selected difficulty
4. avoid requiring guessing

---

## 4. Starting a game

Main menu:

```text
SUDOKU

Easy
Medium
Hard

Continue Game
History
How to Play
```

`Continue Game` appears only when an unfinished puzzle exists.

Selecting a difficulty starts a newly generated puzzle.

Before replacing an unfinished puzzle, ask for confirmation.

There is no 3-2-1 countdown. The timer starts when the puzzle becomes visible and interactive.

---

## 5. Game board

The 9×9 board is the main focus of the screen.

Visual requirements:

- clear 3×3 box boundaries
- thinner lines between normal cells
- starting clues visually distinct from player-entered numbers
- selected cell clearly highlighted
- selected row and column subtly highlighted
- selected 3×3 box subtly highlighted
- all cells containing the same number as the selected number highlighted
- candidate notes visually smaller than normal values

The entire board and number pad should fit comfortably on a typical phone screen without requiring page scrolling during play.

---

## 6. Number input

Below the board display a fixed number pad:

```text
1 2 3 4 5 6 7 8 9
```

Additional controls:

```text
Notes
Erase
Undo
Hint
Pause
```

Input flow:

1. select an empty cell
2. tap a number
3. enter either a normal value or a candidate depending on Notes mode

Desktop additionally supports keyboard input:

```text
1–9       enter number
Backspace erase
N         toggle Notes
Ctrl/Cmd+Z undo
Arrow keys move selection
```

Number-pad positions never move during play.

---

## 7. Notes / pencil marks

Notes mode allows candidate numbers to be stored inside an empty cell.

A cell may contain multiple candidates from 1–9.

Example:

```text
1   3
  5
      9
```

When a normal value is placed correctly, that value should automatically be removed from candidate notes in cells sharing the same:

- row
- column
- 3×3 box

Undo must restore both the entered value and any candidate notes automatically removed by that move.

Notes do not count as mistakes.

---

## 8. Mistakes

V1 uses **immediate mistake checking**.

If the player enters a normal value that does not match the puzzle solution:

- show the value briefly as incorrect
- increment the mistake counter
- do not permanently place the incorrect value

Display:

```text
Mistakes: 1
```

There is **no three-mistakes game over** rule.

The player can always finish the puzzle. Mistakes are a statistic, not a reason to terminate the game.

Candidate notes are never checked as mistakes.

---

## 9. Hints

The Hint button fills one currently empty cell with its correct value.

Prefer:

1. the currently selected empty cell
2. otherwise a random empty cell

A hinted value becomes fixed and cannot be edited.

Each hint increments:

```text
Hints: 1
```

There is no artificial hint limit in v1.

However, personal-best times are separated into:

- **Clean Best** — zero hints
- completed-with-hints history

A puzzle solved with hints can still count as completed, but cannot replace the clean personal-best time.

---

## 10. Undo and erase

### Erase

Erase removes:

- a player-entered value, or
- candidate notes from the selected cell

It cannot remove original clues or hint-filled cells.

### Undo

Maintain a move history for the current puzzle.

Undo should restore the complete previous state affected by the move, including automatically removed candidate notes.

Undo does not reverse:

- elapsed time
- mistake count
- hint count

This prevents undo from being used to erase performance statistics.

---

## 11. Timer

The timer starts when the puzzle becomes visible and interactive.

Use a monotonic timer based on `performance.now()` while the page is active.

Display time as:

```text
04:32
18:47
01:05:21
```

The timer pauses when:

- the player explicitly presses Pause
- the browser tab/app becomes hidden

When paused, hide the puzzle contents so the player cannot study the board while the clock is stopped.

Example:

```text
PAUSED

Resume
```

The timer resumes when the player explicitly continues.

Persist accumulated elapsed time so an unfinished game can survive browser refresh/restart.

---

## 12. Autosave / Continue Game

Only one active puzzle needs to be stored in v1.

Save game state to `localStorage` after every meaningful action.

Store:

```text
{
  puzzleId,
  puzzle,
  solution,
  difficulty,
  values,
  notes,
  fixedCells,
  hintedCells,
  mistakes,
  hints,
  elapsedTime,
  moveHistory,
  startedAt,
  updatedAt
}
```

Key:

```text
sudoku:active
```

When the application opens and an unfinished game exists, show:

```text
Continue Game
```

Completing or explicitly abandoning the puzzle removes the active-game entry.

---

## 13. Completion

A round ends immediately when all cells are correctly filled.

Show a simple completion state before the Results screen.

Results:

```text
Puzzle Complete

Difficulty       Medium
Time             08:42
Mistakes         1
Hints            0
Clean solve      Yes

Best             07:58
Average          09:31
```

If a clean personal best is beaten:

```text
New Best!
```

---

## 14. Statistics

Track statistics separately for Easy, Medium, and Hard.

Per difficulty:

- puzzles started
- puzzles completed
- completion rate
- best clean time
- average completion time
- median completion time
- average mistakes
- average hints
- clean solves
- current completion streak
- best completion streak

### Clean solve

A clean solve means:

```text
hints = 0
```

Mistakes do **not** disqualify a clean solve, but the mistake count remains visible.

The clean-best tie-breaker is:

1. lower completion time
2. fewer mistakes

### Completion streak

A streak increases whenever a puzzle is completed.

Explicitly abandoning an active puzzle resets the current streak.

Simply closing the browser or continuing the puzzle later does not reset it.

---

## 15. History

Store the last **30 completed puzzles**.

Each entry:

```text
{
  puzzleId,
  difficulty,
  completionTime,
  mistakes,
  hints,
  cleanSolve,
  completedAt,
  metricVersion,
  appVersion
}
```

`metricVersion`/`appVersion` are a later, suite-wide addition (see the app-level README) that lets a
future change to the scoring/measurement definition be told apart from older entries without
rewriting them; entries written before this existed are simply treated as version 1.

History screen supports difficulty filtering:

```text
All | Easy | Medium | Hard
```

Show:

- date
- difficulty
- time
- mistakes
- hints
- clean indicator

Also show a simple completion-time trend for the selected difficulty.

Times should only be compared directly within the same difficulty.

---

## 16. Persistence keys

Use browser `localStorage`.

```text
sudoku:active
sudoku:history
sudoku:stats:easy
sudoku:stats:medium
sudoku:stats:hard
```

No login, backend, database, or volume is required.

Data remains browser/device-specific.

---

## 17. Puzzle generation

The generator must create valid 9×9 Sudoku puzzles with exactly one solution.

Suggested generation flow:

1. generate a complete valid solved grid
2. remove values while preserving uniqueness
3. evaluate the resulting puzzle with the logical solver
4. classify its difficulty
5. accept it only if it falls within the requested difficulty

The generator must never ship a puzzle merely because it has a particular number of clues.

### Performance

Puzzle generation should not noticeably freeze the UI.

If generation becomes expensive, use:

- asynchronous generation
- a Web Worker
- or a small pre-generated local puzzle pool

A backend is not required.

---

## 18. Logical solver

The project should contain a solver used for:

- validating uniqueness
- rating difficulty
- testing generated puzzles
- future hint explanations

Keep solving logic separate from the UI.

Suggested modules:

```text
useSudokuGame.js
sudokuGenerator.js
sudokuSolver.js
difficultyRater.js
```

The solver may internally use backtracking to verify uniqueness.

However, **difficulty classification** should be based on human-style logical techniques rather than backtracking depth.

---

## 19. Mobile-first UX

Mobile is the primary interface.

During play:

- no page scrolling
- square responsive board
- fixed number pad
- large enough cells for reliable tapping
- selected cell remains obvious
- Notes mode state is unmistakable
- timer visible but not visually dominant
- Mistakes and Hints visible
- avoid decorative animation
- no hover-dependent controls
- prevent accidental text selection
- avoid double-tap zoom where practical

A typical layout:

```text
Medium              08:42
Mistakes 1          Hints 0

┌───────────────────────┐
│                       │
│       9 × 9 grid      │
│                       │
└───────────────────────┘

1 2 3 4 5 6 7 8 9

Notes   Erase   Undo   Hint   Pause
```

---

## 20. About / How to Play

The About page explains:

- row rule
- column rule
- 3×3 box rule
- how to select cells
- normal number entry
- Notes mode
- Erase
- Undo
- Hint
- mistakes
- timer/pause behavior

Include a small illustrated example of candidates/pencil marks.

Also explain difficulty simply:

> Easy focuses mostly on finding single possible numbers. Medium adds candidate interactions and pairs. Hard requires more careful multi-step reasoning, but is deliberately kept below expert-level Sudoku.

---

## 21. Architecture

Keep the project consistent with the rest of the suite (all games share one app):

- **Vue 3** Composition API
- **Vite**
- single-page application
- no backend/API
- `localStorage`
- mobile-first
- single Docker Compose development service
- `node:26-trixie-slim`
- Vite port **5173**
- bind-mounted source / hot reload
- `${DOCKER_UID:-1000}:${DOCKER_GID:-1000}`

Suggested structure:

```text
Sudoku/
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
    │   ├── SudokuBoard.vue
    │   ├── SudokuCell.vue
    │   ├── NumberPad.vue
    │   ├── GameControls.vue
    │   ├── ResultsScreen.vue
    │   ├── HistoryPage.vue
    │   └── AboutPage.vue
    ├── composables/
    │   ├── useSudokuGame.js
    │   ├── useSudokuStorage.js
    │   └── useSudokuStats.js
    └── sudoku/
        ├── sudokuGenerator.js
        ├── sudokuSolver.js
        └── difficultyRater.js
```

---

## 22. Future changes

Not part of v1:

- Expert difficulty
- daily puzzle
- challenge/shareable puzzle IDs
- multiple active games
- detailed logical hint explanations
- candidate auto-fill
- optional mistake-checking modes
- puzzle import
- puzzle export
- custom puzzles
- keyboard-only mode improvements
- statistics charts
- achievements
- server-side sync
- dark mode
- i18n

Do not add these at the expense of keeping v1 simple.

---

## 23. Decisions for v1

1. Standard **9×9 Sudoku only**.
2. Three levels: **Easy, Medium, Hard**.
3. Hard is intentionally below Expert/Extreme difficulty.
4. Difficulty is based on required logical techniques, not clue count alone.
5. Every puzzle has exactly **one solution**.
6. No guessing should be required.
7. Immediate mistake checking.
8. Mistakes never cause game over.
9. Notes / pencil marks supported.
10. Automatic candidate cleanup after correct values.
11. Undo supported.
12. Hints supported with no hard limit.
13. Hint-assisted games cannot replace the **Clean Best** time.
14. Timer automatically pauses when the app/tab is hidden.
15. Puzzle contents are hidden while paused.
16. Active puzzle autosaves after meaningful actions.
17. One unfinished puzzle can be continued.
18. Track best, average and median completion times.
19. Track mistakes, hints, clean solves and streaks.
20. Keep the last **30 completed puzzles**.
21. Browser `localStorage`.
22. Mobile-first.
23. No backend/database.
24. Single Vite development container.
