import { describe, it, expect } from 'vitest'
import { WHACKAMOLE_LEVELS, getLevelConfig, STAR_THRESHOLDS } from './levels.js'

describe('WHACKAMOLE_LEVELS', () => {
  it('has exactly 50 levels, numbered 1-50 with no gaps or duplicates', () => {
    expect(WHACKAMOLE_LEVELS).toHaveLength(50)
    const ids = WHACKAMOLE_LEVELS.map((l) => l.id).sort((a, b) => a - b)
    expect(ids).toEqual(Array.from({ length: 50 }, (_, i) => i + 1))
  })

  it('matches SPEC §5\'s grid-size tiers exactly', () => {
    const tiers = [
      { range: [1, 5], gridSize: 2 },
      { range: [6, 10], gridSize: 3 },
      { range: [11, 15], gridSize: 3 },
      { range: [16, 20], gridSize: 3 },
      { range: [21, 30], gridSize: 3 },
      { range: [31, 40], gridSize: 4 },
      { range: [41, 45], gridSize: 4 },
      { range: [46, 50], gridSize: 4 },
    ]
    for (const tier of tiers) {
      for (let n = tier.range[0]; n <= tier.range[1]; n++) {
        expect(getLevelConfig(n).gridSize).toBe(tier.gridSize)
      }
    }
  })

  it('never exceeds 4x4 (SPEC §5: "Do not exceed 4×4 in v1")', () => {
    for (const level of WHACKAMOLE_LEVELS) {
      expect(level.gridSize).toBeLessThanOrEqual(4)
    }
  })

  it('has zero distractors before level 16, and a growing share from 16 onward (SPEC §9)', () => {
    for (const level of WHACKAMOLE_LEVELS) {
      const ratio = level.distractorCount / (level.targetCount + level.distractorCount)
      if (level.id < 16) {
        expect(level.distractorCount).toBe(0)
      } else {
        expect(ratio).toBeGreaterThan(0)
        expect(ratio).toBeLessThan(0.35) // "Distractors never become the majority" (SPEC §9), generous upper bound
      }
    }
  })

  it('distractor share roughly follows SPEC §9\'s per-tier percentages', () => {
    const tiers = [
      { range: [16, 20], min: 0.05, max: 0.15 },
      { range: [21, 30], min: 0.10, max: 0.25 },
      { range: [31, 40], min: 0.15, max: 0.30 },
      { range: [41, 50], min: 0.20, max: 0.35 },
    ]
    for (const tier of tiers) {
      for (let n = tier.range[0]; n <= tier.range[1]; n++) {
        const level = getLevelConfig(n)
        const ratio = level.distractorCount / (level.targetCount + level.distractorCount)
        expect(ratio).toBeGreaterThanOrEqual(tier.min)
        expect(ratio).toBeLessThanOrEqual(tier.max)
      }
    }
  })

  it('target visibility generally trends downward across the whole campaign (never gets harder-then-easier at a tier boundary)', () => {
    for (let n = 2; n <= 50; n++) {
      const prevTier = getLevelConfig(n - 1)
      const curr = getLevelConfig(n)
      // Within a tier it's monotonic by construction; only assert the
      // overall direction never reverses by more than one tier's own range
      // allows — i.e. a later level is never slower than an earlier one by
      // more than the interpolation step.
      expect(curr.targetVisibleMs).toBeLessThanOrEqual(prevTier.targetVisibleMs + 1)
    }
  })

  it('every level has a valid gap range and positive counts', () => {
    for (const level of WHACKAMOLE_LEVELS) {
      expect(level.gapMinMs).toBeGreaterThan(0)
      expect(level.gapMaxMs).toBeGreaterThanOrEqual(level.gapMinMs)
      expect(level.targetVisibleMs).toBeGreaterThan(0)
      expect(level.targetCount).toBeGreaterThan(0)
      expect(level.maxConsecutiveSameCell).toBe(2)
      expect(level.version).toBe(1)
    }
  })

  // SPEC §17's worked example (level 27, in the 21-30 tier) shows roughly
  // 20-26 total scheduled stimuli for a ~30s round — sanity-checks that the
  // duration-driven derivation (not hand-picked) lands in a comparable
  // range rather than wildly over/under-populating a round.
  it('a mid-campaign level\'s stimulus count is in the same ballpark as the spec\'s worked example', () => {
    const level = getLevelConfig(27)
    const total = level.targetCount + level.distractorCount
    expect(total).toBeGreaterThanOrEqual(15)
    expect(total).toBeLessThanOrEqual(35)
  })

  it('getLevelConfig returns the right level, or undefined for an out-of-range one', () => {
    expect(getLevelConfig(1).gridSize).toBe(2)
    expect(getLevelConfig(50).gridSize).toBe(4)
    expect(getLevelConfig(51)).toBeUndefined()
  })

  it('STAR_THRESHOLDS is well-formed', () => {
    expect(STAR_THRESHOLDS.threeStar.minHitRate).toBeGreaterThan(STAR_THRESHOLDS.twoStar.minHitRate)
    expect(STAR_THRESHOLDS.threeStar.maxFalseAlarmRate).toBeLessThan(STAR_THRESHOLDS.twoStar.maxFalseAlarmRate)
  })
})
