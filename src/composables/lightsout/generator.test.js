import { describe, it, expect } from 'vitest'
import { generateCandidate, generateLevel, makeRng } from './generator.js'
import { minimumMoves, isSolvable } from './solver.js'

describe('generateCandidate', () => {
  it('produces a board of the requested size', () => {
    const cells = generateCandidate(4, 5, makeRng(1))
    expect(cells.length).toBe(16)
    expect(cells.every((v) => v === 0 || v === 1)).toBe(true)
  })

  it('is deterministic for a given seed', () => {
    const a = generateCandidate(4, 5, makeRng(42))
    const b = generateCandidate(4, 5, makeRng(42))
    expect(a).toEqual(b)
  })

  it('every candidate is solvable — reachable-from-solved boards always are', () => {
    for (let seed = 0; seed < 30; seed++) {
      const cells = generateCandidate(5, 8, makeRng(seed))
      expect(isSolvable(cells, 5)).toBe(true)
    }
  })
})

describe('generateLevel', () => {
  it('finds a candidate whose solver-verified minimum falls in the requested range', () => {
    const level = generateLevel(3, 3, 1, 3, makeRng(7))
    expect(level).not.toBeNull()
    expect(level.optimalMoves).toBeGreaterThanOrEqual(1)
    expect(level.optimalMoves).toBeLessThanOrEqual(3)
    expect(minimumMoves(level.cells, 3)).toBe(level.optimalMoves) // re-verify independently
  })

  it('never returns the already-solved board', () => {
    const level = generateLevel(3, 3, 0, 0, makeRng(1), 20)
    expect(level).toBeNull() // 0 is the solved board itself — deliberately excluded
  })
})
