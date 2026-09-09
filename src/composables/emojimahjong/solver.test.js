import { describe, it, expect } from 'vitest'
import { solveBoard } from './solver.js'
import { generateSolvableBoard } from './generator.js'
import { getLayout, removePair } from './board.js'

describe('solveBoard', () => {
  it('a freshly generated board is always solvable', () => {
    const board = generateSolvableBoard('easy-1', 1)
    const result = solveBoard(board)
    expect(result.timedOut).toBe(false)
    expect(result.solvable).toBe(true)
    expect(result.solution.length).toBe(board.emoji.length / 2)
  })

  it('a fully cleared board is trivially solvable with an empty solution', () => {
    const n = getLayout('easy-1').slots.length
    const state = { layoutId: 'easy-1', removed: new Array(n).fill(true), emoji: new Array(n).fill(null) }
    const result = solveBoard(state)
    expect(result.solvable).toBe(true)
    expect(result.solution).toEqual([])
  })

  it('detects an unsolvable dead-end state (tiles remain, no matching free pair)', () => {
    const layout = getLayout('easy-1')
    const emoji = layout.slots.map((_, i) => `unique-${i}`)
    const state = { layoutId: 'easy-1', removed: new Array(layout.slots.length).fill(false), emoji }
    const result = solveBoard(state)
    expect(result.solvable).toBe(false)
  })

  it('a hint-sized state (one legal pair left) resolves to exactly that pair', () => {
    const board = generateSolvableBoard('easy-1', 5)
    const full = solveBoard(board)
    // Replay every step of a full solution but the last, leaving exactly
    // one pair remaining.
    let state = board
    for (const [a, b] of full.solution.slice(0, -1)) {
      state = removePair(state, a, b)
    }
    const result = solveBoard(state)
    expect(result.solvable).toBe(true)
    expect(result.solution.length).toBe(1)
  })
})
