import { describe, it, expect } from 'vitest'
import { emptyGrid, isSafe, generateFullGrid, countSolutions, isValidCompleteGrid } from './sudokuSolver.js'

describe('generateFullGrid', () => {
  it('produces a valid complete grid for many seeds', () => {
    for (let seed = 0; seed < 10; seed++) {
      const grid = generateFullGrid(seed)
      expect(isValidCompleteGrid(grid)).toBe(true)
      expect(grid.every((row) => row.every((v) => v >= 1 && v <= 9))).toBe(true)
    }
  })

  it('is deterministic for a given seed', () => {
    expect(generateFullGrid(555)).toEqual(generateFullGrid(555))
  })

  it('produces different grids for different seeds', () => {
    expect(generateFullGrid(1)).not.toEqual(generateFullGrid(2))
  })
})

describe('isValidCompleteGrid', () => {
  it('rejects a grid with a duplicate in a row', () => {
    const grid = generateFullGrid(1)
    grid[0][1] = grid[0][0] // duplicate within row 0
    expect(isValidCompleteGrid(grid)).toBe(false)
  })

  it('rejects a grid with a duplicate in a column', () => {
    const grid = generateFullGrid(1)
    grid[1][0] = grid[0][0] // duplicate within column 0
    expect(isValidCompleteGrid(grid)).toBe(false)
  })

  it('rejects a grid with a duplicate within a 3x3 box', () => {
    const grid = generateFullGrid(1)
    grid[1][1] = grid[0][0] // both in the top-left box
    expect(isValidCompleteGrid(grid)).toBe(false)
  })
})

describe('isSafe', () => {
  it('rejects a value already present in the row', () => {
    const grid = emptyGrid()
    grid[0][0] = 5
    expect(isSafe(grid, 0, 3, 5)).toBe(false)
  })

  it('rejects a value already present in the column', () => {
    const grid = emptyGrid()
    grid[0][0] = 5
    expect(isSafe(grid, 3, 0, 5)).toBe(false)
  })

  it('rejects a value already present in the 3x3 box', () => {
    const grid = emptyGrid()
    grid[0][0] = 5
    expect(isSafe(grid, 2, 2, 5)).toBe(false)
  })

  it('accepts a value with no conflict', () => {
    const grid = emptyGrid()
    grid[0][0] = 5
    expect(isSafe(grid, 4, 4, 5)).toBe(true)
  })
})

describe('countSolutions', () => {
  it('finds exactly 1 solution for a fully-filled valid grid (itself)', () => {
    const grid = generateFullGrid(42)
    expect(countSolutions(grid, 2)).toBe(1)
  })

  it('finds at least `limit` solutions (and stops there) for a wide-open grid', () => {
    expect(countSolutions(emptyGrid(), 2)).toBe(2)
  })

  it('does not mutate the input grid', () => {
    const grid = generateFullGrid(1)
    grid[0][0] = 0 // one empty cell — still uniquely solvable
    const before = grid.map((row) => [...row])
    countSolutions(grid, 2)
    expect(grid).toEqual(before)
  })
})
