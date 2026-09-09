import { describe, it, expect } from 'vitest'
import { createBoard } from './board.js'
import { solvePuzzle } from './solver.js'
import { MARBLEJUMP_PUZZLES } from '../../constants/marblejump/puzzles.js'

describe('solvePuzzle', () => {
  it('finds the known 8-move optimum for a small n=4 corner-start puzzle', () => {
    const state = createBoard({ n: 4, emptyHoles: [[1, 0]] })
    const result = solvePuzzle(state)
    expect(result.timedOut).toBe(false)
    expect(result.optimalRemaining).toBe(1)
    expect(result.solution.length).toBe(8)
  })

  it('reports zero achievable jumps for the isolated n=4 center start', () => {
    const state = createBoard({ n: 4, emptyHoles: [[2, 1]] })
    const result = solvePuzzle(state)
    expect(result.timedOut).toBe(false)
    expect(result.optimalRemaining).toBe(9) // 10 holes - 1 empty start, no legal moves at all
    expect(result.solution.length).toBe(0)
  })

  it('every shipped puzzle in MARBLEJUMP_PUZZLES matches its stored optimalRemaining', () => {
    for (const puzzle of MARBLEJUMP_PUZZLES) {
      const state = createBoard(puzzle)
      const result = solvePuzzle(state)
      expect(result.timedOut, `${puzzle.id} timed out`).toBe(false)
      expect(result.optimalRemaining, `${puzzle.id} optimalRemaining mismatch`).toBe(puzzle.optimalRemaining)
    }
  })
})
