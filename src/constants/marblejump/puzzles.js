// Curated, solver-verified puzzle set (SPEC §6/§21). Every optimalRemaining
// value here was proven by composables/marblejump/solver.js — see
// solver.test.js, which re-verifies each entry — not guessed or estimated.
//
// The board itself is always the full n-row triangle (no cells are cut out
// of the shape), so SPEC §6's `validHoles`/`occupiedHoles` fields are
// derivable rather than stored: validHoles is every [row,col] with
// 0 <= row < n and 0 <= col <= row, and occupiedHoles is validHoles minus
// emptyHoles below.
//
// Adding a puzzle: pick an n and an empty-start cell, run solvePuzzle() on
// it, and only add it here if optimalRemaining comes back solver-proven
// (not timed out). Avoid n=4 (2,1) — the isolated center cell — it starts
// with zero legal moves (see board.test.js).
export const MARBLEJUMP_PUZZLES = [
  { id: 'easy-1', difficulty: 'easy', n: 4, emptyHoles: [[1, 0]], optimalRemaining: 1, version: 1 },
  { id: 'easy-2', difficulty: 'easy', n: 4, emptyHoles: [[2, 0]], optimalRemaining: 1, version: 1 },
  { id: 'easy-3', difficulty: 'easy', n: 4, emptyHoles: [[3, 1]], optimalRemaining: 1, version: 1 },

  // medium-1 is the classic "Cracker Barrel" 15-hole board/start.
  { id: 'medium-1', difficulty: 'medium', n: 5, emptyHoles: [[0, 0]], optimalRemaining: 1, version: 1 },
  { id: 'medium-2', difficulty: 'medium', n: 5, emptyHoles: [[2, 0]], optimalRemaining: 1, version: 1 },
  { id: 'medium-3', difficulty: 'medium', n: 5, emptyHoles: [[4, 1]], optimalRemaining: 1, version: 1 },

  { id: 'hard-1', difficulty: 'hard', n: 6, emptyHoles: [[5, 2]], optimalRemaining: 1, version: 1 },
  { id: 'hard-2', difficulty: 'hard', n: 6, emptyHoles: [[5, 0]], optimalRemaining: 1, version: 1 },

  // Only one Extreme puzzle in v1 — the other N=7 starts tried during
  // curation didn't finish solving to a proven optimum within budget (see
  // Marble-Jump plan). More can be added once verified with a longer run.
  { id: 'extreme-1', difficulty: 'extreme', n: 7, emptyHoles: [[3, 1]], optimalRemaining: 1, version: 1 },
]
