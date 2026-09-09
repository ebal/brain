import { describe, it, expect } from 'vitest'
import { generateBoard, makeRng } from './generator.js'
import { findLegalPairs } from './board.js'
import { NUMBERMATCH_DIFFICULTIES } from '../../constants/numbermatch/difficulties.js'

describe('generateBoard', () => {
  it.each(Object.values(NUMBERMATCH_DIFFICULTIES))(
    '$key produces the right size board with at least one legal opening pair',
    (config) => {
      const board = generateBoard(config, 42)
      expect(board.cols).toBe(config.cols)
      expect(board.cells.length).toBe(config.cols * config.startingRows)
      expect(board.cells.every((v) => v >= 1 && v <= 9)).toBe(true)
      expect(findLegalPairs(board).length).toBeGreaterThan(0)
    }
  )

  it('a deterministic seed reproduces the same board', () => {
    const a = generateBoard(NUMBERMATCH_DIFFICULTIES.medium, 123)
    const b = generateBoard(NUMBERMATCH_DIFFICULTIES.medium, 123)
    expect(a.cells).toEqual(b.cells)
  })

  it('a different seed can produce a different board', () => {
    const a = generateBoard(NUMBERMATCH_DIFFICULTIES.medium, 1)
    const b = generateBoard(NUMBERMATCH_DIFFICULTIES.medium, 2)
    expect(a.cells).not.toEqual(b.cells)
  })

  it('no single digit dominates more than 35% of the board, across many seeds', () => {
    for (let seed = 0; seed < 25; seed++) {
      const board = generateBoard(NUMBERMATCH_DIFFICULTIES.extreme, seed)
      const counts = new Map()
      for (const v of board.cells) counts.set(v, (counts.get(v) || 0) + 1)
      for (const count of counts.values()) {
        expect(count / board.cells.length).toBeLessThanOrEqual(0.35)
      }
    }
  })
})

describe('makeRng', () => {
  it('falls back to Math.random when no numeric seed is given', () => {
    expect(makeRng(undefined)).toBe(Math.random)
  })

  it('a numeric seed produces a deterministic sequence', () => {
    const rngA = makeRng(7)
    const rngB = makeRng(7)
    expect(rngA()).toBe(rngB())
  })
})
