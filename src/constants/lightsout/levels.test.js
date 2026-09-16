import { describe, it, expect } from 'vitest'
import { LIGHTSOUT_LEVELS, getLevelConfig } from './levels.js'
import { minimumMoves } from '../../composables/lightsout/solver.js'
import { isSolved } from '../../composables/lightsout/board.js'

// SPEC "Level data and generation": "Every shipped level must be proven
// solvable" — re-verified here against the live solver rather than trusted
// from the generation script's own output, so any transcription error
// introduced while hand-formatting the data file would fail this test too.
describe('LIGHTSOUT_LEVELS', () => {
  it('has exactly 50 levels, numbered 1-50 with no gaps or duplicates', () => {
    expect(LIGHTSOUT_LEVELS).toHaveLength(50)
    const numbers = LIGHTSOUT_LEVELS.map((l) => l.level).sort((a, b) => a - b)
    expect(numbers).toEqual(Array.from({ length: 50 }, (_, i) => i + 1))
  })

  it('every level\'s cells array matches its declared size', () => {
    for (const level of LIGHTSOUT_LEVELS) {
      expect(level.cells.length).toBe(level.size * level.size)
    }
  })

  it('no level starts already solved', () => {
    for (const level of LIGHTSOUT_LEVELS) {
      expect(isSolved(level.cells)).toBe(false)
    }
  })

  it('every level\'s stored optimalMoves matches the live solver — re-verified independently', () => {
    for (const level of LIGHTSOUT_LEVELS) {
      const solverResult = minimumMoves(level.cells, level.size)
      expect(solverResult).not.toBeNull() // every shipped level must be provably solvable
      expect(solverResult).toBe(level.optimalMoves)
    }
  })

  it('matches the intended optimal-depth tiers from the spec\'s progression table', () => {
    const tiers = [
      { range: [1, 5], size: 3, depth: [1, 3] },
      { range: [6, 10], size: 3, depth: [3, 5] },
      { range: [11, 20], size: 4, depth: [3, 7] },
      { range: [21, 35], size: 5, depth: [4, 10] },
      { range: [36, 45], size: 5, depth: [8, 14] },
      { range: [46, 50], size: 6, depth: [8, 20] }, // "validated", not a fixed depth range in the spec
    ]
    for (const tier of tiers) {
      for (let n = tier.range[0]; n <= tier.range[1]; n++) {
        const level = getLevelConfig(n)
        expect(level.size).toBe(tier.size)
        expect(level.optimalMoves).toBeGreaterThanOrEqual(tier.depth[0])
        expect(level.optimalMoves).toBeLessThanOrEqual(tier.depth[1])
      }
    }
  })

  it('getLevelConfig returns the right level, or undefined for an out-of-range one', () => {
    expect(getLevelConfig(1).size).toBe(3)
    expect(getLevelConfig(50).size).toBe(6)
    expect(getLevelConfig(51)).toBeUndefined()
  })
})
