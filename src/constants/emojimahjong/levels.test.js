import { describe, it, expect } from 'vitest'
import { EMOJIMAHJONG_LEVELS, getLevelConfig } from './levels.js'
import { EMOJIMAHJONG_LAYOUTS } from './layouts.js'
import { generateSolvableBoard } from '../../composables/emojimahjong/generator.js'
import { getAvailablePairs, removePair, isBoardCleared } from '../../composables/emojimahjong/board.js'

// Level-SPEC §11: "Every shipped level must have at least one known path
// that clears the entire board" — re-verified here against the live code
// (not trusted from the curation script's own output), so any edit to a
// level or layout definition that breaks solvability fails a test too.
describe('EMOJIMAHJONG_LEVELS', () => {
  it('has exactly 50 levels, numbered 1-50 with no gaps or duplicates', () => {
    expect(EMOJIMAHJONG_LEVELS).toHaveLength(50)
    const numbers = EMOJIMAHJONG_LEVELS.map((l) => l.level).sort((a, b) => a - b)
    expect(numbers).toEqual(Array.from({ length: 50 }, (_, i) => i + 1))
  })

  it('every level references a layout that actually exists', () => {
    const layoutIds = new Set(EMOJIMAHJONG_LAYOUTS.map((l) => l.id))
    for (const level of EMOJIMAHJONG_LEVELS) {
      expect(layoutIds.has(level.layoutId)).toBe(true)
    }
  })

  it('every level is fully clearable via real emoji-matching pair removal', () => {
    for (const level of EMOJIMAHJONG_LEVELS) {
      let state = generateSolvableBoard(level.layoutId, level.seed)
      let guard = 0
      while (!isBoardCleared(state)) {
        const pairs = getAvailablePairs(state)
        expect(pairs.length).toBeGreaterThan(0) // level ${level.level} must never dead-end when always taking an available pair
        state = removePair(state, pairs[0][0], pairs[0][1])
        guard += 1
        expect(guard).toBeLessThan(2000)
      }
      expect(isBoardCleared(state)).toBe(true)
    }
  })

  it('tile counts land within the spec\'s per-tier target ranges (Level-SPEC §7)', () => {
    // Levels 1-4 are hand-designed tutorial exceptions (Level-SPEC §9), each
    // built to teach exactly one rule in isolation rather than to hit the
    // generic tier table — Level 3 in particular is deliberately smaller
    // (6 tiles) than the table's 8-20 band. Only level 5 (the tier's last,
    // "transitioning to normal play" level) is checked against it.
    const tiers = [
      { range: [5, 5], tileMin: 8, tileMax: 20 },
      { range: [6, 10], tileMin: 20, tileMax: 28 },
      { range: [11, 20], tileMin: 28, tileMax: 36 },
      { range: [21, 30], tileMin: 36, tileMax: 48 },
      { range: [31, 40], tileMin: 48, tileMax: 56 },
      { range: [41, 45], tileMin: 56, tileMax: 64 },
      { range: [46, 50], tileMin: 64, tileMax: 72 },
    ]
    for (const tier of tiers) {
      for (let n = tier.range[0]; n <= tier.range[1]; n++) {
        const level = getLevelConfig(n)
        const layout = EMOJIMAHJONG_LAYOUTS.find((l) => l.id === level.layoutId)
        expect(layout.slots.length).toBeGreaterThanOrEqual(tier.tileMin)
        expect(layout.slots.length).toBeLessThanOrEqual(tier.tileMax)
      }
    }
  })

  it('every level has a positive integer version', () => {
    for (const level of EMOJIMAHJONG_LEVELS) {
      expect(Number.isInteger(level.version)).toBe(true)
      expect(level.version).toBeGreaterThan(0)
    }
  })

  it('getLevelConfig returns the right level, or undefined for an out-of-range one', () => {
    expect(getLevelConfig(1).layoutId).toBe('em-tutorial-1')
    expect(getLevelConfig(50)).toBeDefined()
    expect(getLevelConfig(51)).toBeUndefined()
    expect(getLevelConfig(0)).toBeUndefined()
  })
})
