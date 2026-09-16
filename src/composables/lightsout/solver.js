// Mathematically correct Lights Out solver (SPEC "Solver") — the classic
// "row chasing" / exhaustive-first-row-states method: for an n x n board,
// every possible press pattern for row 0 (2^n of them) uniquely determines
// every other row's presses (pressing (r,c) is the ONLY way left to clear a
// still-lit cell at (r-1,c), since only row r can still affect row r-1 once
// rows 0..r-1 are otherwise settled), so trying every row-0 pattern and
// keeping whichever fully-determined solution both clears the board AND
// uses the fewest presses gives the true global optimum, not a heuristic.
// O(2^size * size^2) — trivial for every size this game uses (up to 6x6).
import { applyMove } from './board.js'

// Returns { solvable, minimumMoves, solution } where `solution` is a flat
// 0/1 array (same shape as a board) marking which cells to press — or
// nulls when the board has no solution at all (SPEC: "every shipped level
// must be proven solvable", so this should never happen for real levels,
// only for arbitrary/testing boards).
export function solveLightsOut(cells, size) {
  let best = null

  for (let rowPattern = 0; rowPattern < 2 ** size; rowPattern++) {
    const presses = Array(size * size).fill(0)
    for (let c = 0; c < size; c++) presses[c] = (rowPattern >> c) & 1

    let working = cells
    for (let c = 0; c < size; c++) {
      if (presses[c]) working = applyMove(working, size, 0, c)
    }

    for (let r = 1; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (working[(r - 1) * size + c] === 1) {
          presses[r * size + c] = 1
          working = applyMove(working, size, r, c)
        }
      }
    }

    const lastRowClear = Array.from({ length: size }, (_, c) => working[(size - 1) * size + c]).every((v) => v === 0)
    if (!lastRowClear) continue

    const moveCount = presses.reduce((a, b) => a + b, 0)
    if (!best || moveCount < best.moveCount) {
      best = { presses, moveCount }
    }
  }

  if (!best) return { solvable: false, minimumMoves: null, solution: null }
  return { solvable: true, minimumMoves: best.moveCount, solution: best.presses }
}

export function isSolvable(cells, size) {
  return solveLightsOut(cells, size).solvable
}

export function minimumMoves(cells, size) {
  return solveLightsOut(cells, size).minimumMoves
}

// A solution's presses are order-independent (toggling twice cancels
// regardless of when), so this can be safely recomputed from whatever the
// CURRENT board is mid-play, not just the level's original starting state —
// that's what useLightsOutGame.js's Hint calls this for.
export function getOptimalSolution(cells, size) {
  return solveLightsOut(cells, size).solution
}
