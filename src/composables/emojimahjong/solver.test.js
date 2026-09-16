import { describe, it, expect } from 'vitest'
import { solveBoard, getSolvableNextPairs } from './solver.js'
import { generateSolvableBoard } from './generator.js'
import { getLayout, removePair, getAvailablePairs } from './board.js'

const LAYOUT = 'em-tutorial-2' // small flat 12-tile layout

describe('solveBoard', () => {
  it('a freshly generated board is always solvable', () => {
    const board = generateSolvableBoard(LAYOUT, 1)
    const result = solveBoard(board)
    expect(result.timedOut).toBe(false)
    expect(result.solvable).toBe(true)
    expect(result.solution.length).toBe(board.emoji.length / 2)
  })

  it('a fully cleared board is trivially solvable with an empty solution', () => {
    const n = getLayout(LAYOUT).slots.length
    const state = { layoutId: LAYOUT, removed: new Array(n).fill(true), emoji: new Array(n).fill(null) }
    const result = solveBoard(state)
    expect(result.solvable).toBe(true)
    expect(result.solution).toEqual([])
  })

  it('detects an unsolvable dead-end state (tiles remain, no matching free pair)', () => {
    const layout = getLayout(LAYOUT)
    const emoji = layout.slots.map((_, i) => `unique-${i}`)
    const state = { layoutId: LAYOUT, removed: new Array(layout.slots.length).fill(false), emoji }
    const result = solveBoard(state)
    expect(result.solvable).toBe(false)
  })

  it('a hint-sized state (one legal pair left) resolves to exactly that pair', () => {
    const board = generateSolvableBoard(LAYOUT, 5)
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

describe('getSolvableNextPairs', () => {
  it('every returned pair is a currently-available pair', () => {
    const board = generateSolvableBoard(LAYOUT, 1)
    const solvablePairs = getSolvableNextPairs(board)
    const available = getAvailablePairs(board)
    for (const [a, b] of solvablePairs) {
      expect(available.some(([x, y]) => (x === a && y === b) || (x === b && y === a))).toBe(true)
    }
  })

  it('removing any returned pair still leaves the board solvable', () => {
    const board = generateSolvableBoard(LAYOUT, 1)
    const solvablePairs = getSolvableNextPairs(board)
    expect(solvablePairs.length).toBeGreaterThan(0)
    for (const [a, b] of solvablePairs) {
      const next = removePair(board, a, b)
      expect(solveBoard(next).solvable).toBe(true)
    }
  })

  it('is empty for a dead-end state', () => {
    const layout = getLayout(LAYOUT)
    const emoji = layout.slots.map((_, i) => `unique-${i}`)
    const state = { layoutId: LAYOUT, removed: new Array(layout.slots.length).fill(false), emoji }
    expect(getSolvableNextPairs(state)).toEqual([])
  })

  it('a hint pair (solveBoard\'s first suggestion) always appears in the solvable-pairs set', () => {
    const board = generateSolvableBoard(LAYOUT, 1)
    const { solution } = solveBoard(board)
    const solvablePairs = getSolvableNextPairs(board)
    const [a, b] = solution[0]
    expect(solvablePairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))).toBe(true)
  })
})
