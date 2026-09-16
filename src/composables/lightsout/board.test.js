import { describe, it, expect } from 'vitest'
import { toggleCell, neighborsOf, applyMove, isSolved, createEmptyBoard } from './board.js'

describe('toggleCell', () => {
  it('flips exactly one cell', () => {
    const board = createEmptyBoard(3)
    const next = toggleCell(board, 3, 1, 1)
    expect(next[1 * 3 + 1]).toBe(1)
    expect(next.filter((v) => v === 1).length).toBe(1)
  })

  it('does not mutate the original array', () => {
    const board = createEmptyBoard(3)
    toggleCell(board, 3, 0, 0)
    expect(board.every((v) => v === 0)).toBe(true)
  })
})

describe('neighborsOf', () => {
  it('a center cell has self plus all four neighbours', () => {
    expect(neighborsOf(3, 1, 1)).toHaveLength(5)
  })

  it('an edge cell (not corner) has self plus three neighbours', () => {
    expect(neighborsOf(3, 0, 1)).toHaveLength(4)
  })

  it('a corner cell has self plus two neighbours', () => {
    expect(neighborsOf(3, 0, 0)).toHaveLength(3)
  })

  it('never includes a diagonal neighbour', () => {
    const cells = neighborsOf(3, 1, 1)
    expect(cells).not.toContainEqual([0, 0])
    expect(cells).not.toContainEqual([0, 2])
    expect(cells).not.toContainEqual([2, 0])
    expect(cells).not.toContainEqual([2, 2])
  })
})

describe('applyMove', () => {
  it('toggles a center cell and all four neighbours', () => {
    const board = createEmptyBoard(3)
    const next = applyMove(board, 3, 1, 1)
    expect(next.filter((v) => v === 1).length).toBe(5)
    expect(next[1 * 3 + 1]).toBe(1) // self
    expect(next[0 * 3 + 1]).toBe(1) // up
    expect(next[2 * 3 + 1]).toBe(1) // down
    expect(next[1 * 3 + 0]).toBe(1) // left
    expect(next[1 * 3 + 2]).toBe(1) // right
  })

  it('toggles a corner cell and only its two valid neighbours', () => {
    const board = createEmptyBoard(3)
    const next = applyMove(board, 3, 0, 0)
    expect(next.filter((v) => v === 1).length).toBe(3)
    expect(next[0]).toBe(1)
    expect(next[1]).toBe(1) // right
    expect(next[3]).toBe(1) // down
  })

  it('toggles an edge cell and its three valid neighbours', () => {
    const board = createEmptyBoard(3)
    const next = applyMove(board, 3, 0, 1)
    expect(next.filter((v) => v === 1).length).toBe(4)
  })

  it('double-toggling (the same move applied twice) restores the original board', () => {
    const board = createEmptyBoard(3)
    const once = applyMove(board, 3, 1, 1)
    const twice = applyMove(once, 3, 1, 1)
    expect(twice).toEqual(board)
  })

  it('move order does not matter — presses commute', () => {
    const board = createEmptyBoard(3)
    const ab = applyMove(applyMove(board, 3, 0, 0), 3, 2, 2)
    const ba = applyMove(applyMove(board, 3, 2, 2), 3, 0, 0)
    expect(ab).toEqual(ba)
  })
})

describe('isSolved', () => {
  it('is true for an all-off board', () => {
    expect(isSolved(createEmptyBoard(4))).toBe(true)
  })

  it('is false when any cell is on', () => {
    expect(isSolved(applyMove(createEmptyBoard(4), 4, 2, 2))).toBe(false)
  })
})
