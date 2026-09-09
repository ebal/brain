import { describe, it, expect } from 'vitest'
import {
  isNumericMatch,
  isLegalPair,
  findLegalPairs,
  removePair,
  appendRemainingNumbers,
  remainingCount,
  isBoardCleared,
} from './board.js'

describe('isNumericMatch', () => {
  it('matches identical digits', () => {
    expect(isNumericMatch(8, 8)).toBe(true)
    expect(isNumericMatch(3, 3)).toBe(true)
  })

  it('matches digits summing to 10', () => {
    expect(isNumericMatch(1, 9)).toBe(true)
    expect(isNumericMatch(2, 8)).toBe(true)
    expect(isNumericMatch(3, 7)).toBe(true)
    expect(isNumericMatch(4, 6)).toBe(true)
    expect(isNumericMatch(5, 5)).toBe(true)
  })

  it('rejects unrelated values', () => {
    expect(isNumericMatch(3, 4)).toBe(false)
    expect(isNumericMatch(1, 2)).toBe(false)
  })
})

describe('isLegalPair', () => {
  it('true for a numerically valid pair, however far apart on the board', () => {
    // v2: position never matters — only the numbers do (Number-Match-SPEC.md §34).
    const state = { cols: 4, cells: [3, null, null, null, null, null, null, 7] }
    expect(isLegalPair(state, 0, 7)).toBe(true) // 3 + 7 = 10
  })

  it('true for an identical pair anywhere on the board', () => {
    const state = { cols: 4, cells: [5, null, null, null, null, null, null, 5] }
    expect(isLegalPair(state, 0, 7)).toBe(true)
  })

  it('false for a numerically invalid pair', () => {
    expect(isLegalPair({ cols: 4, cells: [3, null, null, 4] }, 0, 3)).toBe(false)
  })

  it('an occupied cell sitting between two matching numbers has no effect', () => {
    // The exact "6+4 blocked by something between them" case reported by a
    // user — position/occupancy in between must never matter now.
    const state = { cols: 4, cells: [6, 9, 9, 4] }
    expect(isLegalPair(state, 0, 3)).toBe(true)
  })

  it('false when either cell is empty', () => {
    expect(isLegalPair({ cols: 4, cells: [3, null, null, 7] }, 1, 3)).toBe(false)
  })

  it('false comparing a cell to itself', () => {
    expect(isLegalPair({ cols: 4, cells: [3, 4, 5, 6] }, 0, 0)).toBe(false)
  })
})

describe('findLegalPairs', () => {
  it('finds every legal pair on a small board, regardless of position', () => {
    const state = { cols: 2, cells: [3, 4, 5, 7] } // 3+7=10, 4+... , 5 alone
    const pairs = findLegalPairs(state)
    expect(pairs).toContainEqual([0, 3]) // 3 + 7, far apart
  })

  it('finds identical pairs anywhere, not just neighbors', () => {
    const state = { cols: 2, cells: [5, 1, 2, 5] }
    const pairs = findLegalPairs(state)
    expect(pairs).toContainEqual([0, 3])
  })

  it('returns an empty array when no legal pair exists', () => {
    const state = { cols: 2, cells: [1, 2, 3, 4] }
    expect(findLegalPairs(state)).toEqual([])
  })
})

describe('removePair', () => {
  it('empties exactly the two given cells and does not mutate the input', () => {
    const state = { cols: 2, cells: [3, 7, 5, 5] }
    const after = removePair(state, 0, 1)
    expect(after.cells).toEqual([null, null, 5, 5])
    expect(state.cells).toEqual([3, 7, 5, 5]) // input untouched
  })
})

describe('appendRemainingNumbers', () => {
  it('copies only occupied values, in reading order, to the end', () => {
    const state = { cols: 4, cells: [3, null, 7, null, null, 4, null, 6] }
    const after = appendRemainingNumbers(state)
    // remaining in reading order: 3, 7, 4, 6
    expect(after.cells.slice(8, 12)).toEqual([3, 7, 4, 6])
  })

  it('pads the tail with null up to a whole number of rows', () => {
    const state = { cols: 4, cells: [3, null, null, null] } // 1 remaining value
    const after = appendRemainingNumbers(state)
    expect(after.cells.length % state.cols).toBe(0)
    expect(after.cells).toEqual([3, null, null, null, 3, null, null, null])
  })

  it('does not mutate the input state', () => {
    const state = { cols: 2, cells: [3, null] }
    appendRemainingNumbers(state)
    expect(state.cells).toEqual([3, null])
  })
})

describe('remainingCount / isBoardCleared', () => {
  it('counts only non-null cells', () => {
    expect(remainingCount({ cols: 2, cells: [3, null, 7, null] })).toBe(2)
  })

  it('isBoardCleared is true only when every cell is null', () => {
    expect(isBoardCleared({ cols: 2, cells: [null, null, null, null] })).toBe(true)
    expect(isBoardCleared({ cols: 2, cells: [3, null, null, null] })).toBe(false)
  })
})
