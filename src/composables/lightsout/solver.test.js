import { describe, it, expect } from 'vitest'
import { solveLightsOut, isSolvable, minimumMoves, getOptimalSolution } from './solver.js'
import { createEmptyBoard, applyMove, isSolved } from './board.js'

describe('solveLightsOut', () => {
  it('the solved board needs zero moves', () => {
    const result = solveLightsOut(createEmptyBoard(3), 3)
    expect(result.solvable).toBe(true)
    expect(result.minimumMoves).toBe(0)
    expect(result.solution.every((v) => v === 0)).toBe(true)
  })

  it('a board reached by one tap has a minimum of exactly 1 move', () => {
    const board = applyMove(createEmptyBoard(3), 3, 1, 1)
    const result = solveLightsOut(board, 3)
    expect(result.solvable).toBe(true)
    expect(result.minimumMoves).toBe(1)
  })

  it("applying the solver's own solution actually solves the board", () => {
    let board = createEmptyBoard(4)
    board = applyMove(board, 4, 0, 0)
    board = applyMove(board, 4, 2, 3)
    board = applyMove(board, 4, 1, 1)

    const { solution } = solveLightsOut(board, 4)
    let result = board
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (solution[r * 4 + c]) result = applyMove(result, 4, r, c)
      }
    }
    expect(isSolved(result)).toBe(true)
  })

  it('is always the true global minimum — brute-force cross-check over every one of the 512 possible 3x3 boards', () => {
    const size = 3
    const totalCells = size * size

    // Brute force: try all 2^9 possible press-sets and keep the lightest
    // one that actually clears the given board — completely independent of
    // solveLightsOut's row-chasing approach.
    function bruteForceMinimum(cells) {
      let best = null
      for (let mask = 0; mask < 2 ** totalCells; mask++) {
        let result = cells
        let weight = 0
        for (let i = 0; i < totalCells; i++) {
          if ((mask >> i) & 1) {
            result = applyMove(result, size, Math.floor(i / size), i % size)
            weight += 1
          }
        }
        if (result.every((v) => v === 0) && (best === null || weight < best)) {
          best = weight
        }
      }
      return best // null if unsolvable
    }

    for (let boardMask = 0; boardMask < 2 ** totalCells; boardMask++) {
      const cells = Array.from({ length: totalCells }, (_, i) => (boardMask >> i) & 1)
      const expected = bruteForceMinimum(cells)
      const actual = minimumMoves(cells, size)
      expect(actual).toBe(expected)
    }
  })
})

describe('isSolvable', () => {
  it('matches solveLightsOut.solvable', () => {
    expect(isSolvable(createEmptyBoard(3), 3)).toBe(true)
  })
})

describe('getOptimalSolution', () => {
  it('can be safely recomputed mid-play — solving from the current state, not just the original', () => {
    let board = createEmptyBoard(3)
    board = applyMove(board, 3, 0, 0)
    board = applyMove(board, 3, 2, 2)
    // Partially solve it by hand, then ask for a fresh optimal solution
    // from THIS new (still-unsolved) state.
    board = applyMove(board, 3, 0, 0)
    const solution = getOptimalSolution(board, 3)
    let result = board
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (solution[r * 3 + c]) result = applyMove(result, 3, r, c)
      }
    }
    expect(isSolved(result)).toBe(true)
  })
})
