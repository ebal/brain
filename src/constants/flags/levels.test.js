import { describe, it, expect } from 'vitest'
import { FLAGS_LEVELS, getLevelConfig, LEVEL_VERSION, STAR_THRESHOLDS } from './levels.js'
import { COUNTRIES } from './countries.js'

const VALID_CODES = new Set(COUNTRIES.map((c) => c.code))

describe('FLAGS_LEVELS', () => {
  it('has exactly 50 levels, numbered 1-50 with no gaps or duplicates', () => {
    expect(FLAGS_LEVELS).toHaveLength(50)
    const ids = FLAGS_LEVELS.map((l) => l.id).sort((a, b) => a - b)
    expect(ids).toEqual(Array.from({ length: 50 }, (_, i) => i + 1))
  })

  it('stamps every level with the current LEVEL_VERSION', () => {
    for (const level of FLAGS_LEVELS) {
      expect(level.version).toBe(LEVEL_VERSION)
    }
  })

  it('every level has a non-empty countryPool made only of real dataset codes', () => {
    for (const level of FLAGS_LEVELS) {
      expect(level.countryPool.length).toBeGreaterThan(0)
      for (const code of level.countryPool) {
        expect(VALID_CODES.has(code)).toBe(true)
      }
    }
  })

  it('pools are cumulative: a later level\'s pool is a superset of an earlier level\'s', () => {
    for (let i = 2; i <= 50; i++) {
      const prevPool = new Set(getLevelConfig(i - 1).countryPool)
      const pool = new Set(getLevelConfig(i).countryPool)
      for (const code of prevPool) {
        expect(pool.has(code)).toBe(true)
      }
    }
  })

  it('reaches the full dataset pool by level 30 (Europe+Americas+Asia+Africa+Oceania, SPEC §7)', () => {
    expect(getLevelConfig(30).countryPool.length).toBe(COUNTRIES.length)
    expect(getLevelConfig(50).countryPool.length).toBe(COUNTRIES.length)
  })

  it('matches SPEC §9\'s distractor tier progression', () => {
    const tiers = [
      { range: [1, 5], tier: 1 },
      { range: [6, 10], tier: 2 },
      { range: [11, 15], tier: 2 },
      { range: [16, 20], tier: 2 },
      { range: [21, 25], tier: 3 },
      { range: [26, 30], tier: 3 },
      { range: [31, 40], tier: 3 },
      { range: [41, 45], tier: 4 },
      { range: [46, 50], tier: 4 },
    ]
    for (const t of tiers) {
      for (let n = t.range[0]; n <= t.range[1]; n++) {
        expect(getLevelConfig(n).distractorTier).toBe(t.tier)
      }
    }
  })

  it('every level asks 10 questions (SPEC §7)', () => {
    for (const level of FLAGS_LEVELS) {
      expect(level.questionCount).toBe(10)
    }
  })

  it('getLevelConfig returns undefined out of range', () => {
    expect(getLevelConfig(0)).toBeUndefined()
    expect(getLevelConfig(51)).toBeUndefined()
  })

  it('STAR_THRESHOLDS: three-star is stricter than two-star', () => {
    expect(STAR_THRESHOLDS.threeStar.minCorrect).toBeGreaterThan(STAR_THRESHOLDS.twoStar.minCorrect)
  })
})
