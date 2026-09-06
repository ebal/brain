import { describe, it, expect } from 'vitest'
import { solveWithTechniques, classifyDifficulty, EASY_TECHNIQUES } from './difficultyRater.js'
import { generateFullGrid, emptyGrid, countSolutions } from './sudokuSolver.js'
import { generatePuzzle } from './sudokuGenerator.js'
import hardPool from '../../constants/sudoku/hardPool.json'

describe('solveWithTechniques', () => {
  it('reports an already-complete grid as solved, with no technique used', () => {
    const grid = generateFullGrid(1)
    const result = solveWithTechniques(grid, EASY_TECHNIQUES)
    expect(result.solved).toBe(true)
    expect(result.hardestTechnique).toBeNull()
  })

  it('does not mutate the input puzzle grid', () => {
    const grid = generateFullGrid(1)
    grid[0][0] = 0
    const before = grid.map((row) => [...row])
    solveWithTechniques(grid, EASY_TECHNIQUES)
    expect(grid).toEqual(before)
  })
})

describe('classifyDifficulty', () => {
  it('classifies a completely empty grid as null (requires guessing)', () => {
    expect(classifyDifficulty(emptyGrid())).toBeNull()
  })

  it('classifies every pre-vetted Hard puzzle in hardPool.json as hard', () => {
    for (const { puzzle } of hardPool) {
      expect(classifyDifficulty(puzzle)).toBe('hard')
    }
  })

  it('agrees with the live generator: an Easy-requested puzzle classifies as easy and has a unique solution', () => {
    const { puzzle, difficulty } = generatePuzzle('easy', 100)
    expect(difficulty).toBe('easy')
    expect(classifyDifficulty(puzzle)).toBe('easy')
    expect(countSolutions(puzzle, 2)).toBe(1)
  })

  it('agrees with the live generator: a Medium-requested puzzle classifies as medium and has a unique solution', () => {
    const { puzzle, difficulty } = generatePuzzle('medium', 100)
    expect(difficulty).toBe('medium')
    expect(classifyDifficulty(puzzle)).toBe('medium')
    expect(countSolutions(puzzle, 2)).toBe(1)
  })
})
