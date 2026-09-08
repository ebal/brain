import { describe, it, expect } from 'vitest'
import { generateSequence, validateSequence } from './sequence.js'
import { NBACK_DIFFICULTIES, TARGET_RATIO, LETTER_POOL } from '../../constants/nback/difficulties.js'

describe('generateSequence', () => {
  it('produces n + scoredTrials numbers, and passes its own validation, for every difficulty and many seeds', () => {
    for (const { n, scoredTrials } of Object.values(NBACK_DIFFICULTIES)) {
      for (let seed = 0; seed < 25; seed++) {
        const sequence = generateSequence(n, scoredTrials, seed)
        expect(sequence.numbers).toHaveLength(n + scoredTrials)
        expect(sequence.isTarget).toHaveLength(n + scoredTrials)
        expect(() => validateSequence(sequence)).not.toThrow()
      }
    }
  })

  it('is deterministic for a given seed', () => {
    const a = generateSequence(2, 40, 12345)
    const b = generateSequence(2, 40, 12345)
    expect(a).toEqual(b)
  })

  it('marks exactly round(scoredTrials * TARGET_RATIO) scored positions as targets', () => {
    const { n, scoredTrials } = NBACK_DIFFICULTIES.classic
    const sequence = generateSequence(n, scoredTrials, 7)
    const expectedTargets = Math.round(scoredTrials * TARGET_RATIO)
    const actualTargets = sequence.isTarget.filter(Boolean).length
    expect(actualTargets).toBe(expectedTargets)
    expect(sequence.targetCount).toBe(expectedTargets)
  })

  it('never marks a setup-phase position (before n) as a target', () => {
    const { n, scoredTrials } = NBACK_DIFFICULTIES.hard
    const sequence = generateSequence(n, scoredTrials, 3)
    for (let i = 0; i < n; i++) {
      expect(sequence.isTarget[i]).toBe(false)
    }
  })

  it('never produces an accidental (unintended) n-back match at a non-target scored position', () => {
    for (let seed = 0; seed < 25; seed++) {
      const { n, scoredTrials } = NBACK_DIFFICULTIES.veryHard
      const sequence = generateSequence(n, scoredTrials, seed)
      for (let i = n; i < sequence.numbers.length; i++) {
        const isRealMatch = sequence.numbers[i] === sequence.numbers[i - n]
        expect(isRealMatch).toBe(sequence.isTarget[i])
      }
    }
  })

  it('draws every stimulus from the given pool (Extreme/Letters) instead of the number default', () => {
    const { n, scoredTrials } = NBACK_DIFFICULTIES.extreme
    for (let seed = 0; seed < 25; seed++) {
      const sequence = generateSequence(n, scoredTrials, seed, LETTER_POOL)
      for (const value of sequence.numbers) expect(LETTER_POOL).toContain(value)
      expect(() => validateSequence(sequence)).not.toThrow()
    }
  })
})

describe('validateSequence', () => {
  it('throws when the sequence length is wrong', () => {
    const sequence = generateSequence(2, 40, 1)
    sequence.numbers = sequence.numbers.slice(0, -1)
    expect(() => validateSequence(sequence)).toThrow(/wrong length/)
  })

  it('throws when a setup position is incorrectly marked as a target', () => {
    const sequence = generateSequence(2, 40, 1)
    sequence.isTarget[0] = true
    expect(() => validateSequence(sequence)).toThrow(/setup position/)
  })

  it('throws when a position marked target is not actually a real match', () => {
    const sequence = generateSequence(2, 40, 1)
    const firstTargetIdx = sequence.isTarget.findIndex((t, i) => t && i >= sequence.n)
    sequence.numbers[firstTargetIdx] = sequence.numbers[firstTargetIdx] === 1 ? 2 : 1
    expect(() => validateSequence(sequence)).toThrow(/marked target but isn't a real match/)
  })

  it('throws when an accidental match exists but was not designated a target', () => {
    const sequence = generateSequence(2, 40, 1)
    const firstNonTargetIdx = sequence.isTarget.findIndex((t, i) => !t && i >= sequence.n)
    sequence.numbers[firstNonTargetIdx] = sequence.numbers[firstNonTargetIdx - sequence.n]
    expect(() => validateSequence(sequence)).toThrow(/accidental match/)
  })

  it('throws when the actual target count does not match the declared targetCount', () => {
    const sequence = generateSequence(2, 40, 1)
    sequence.targetCount += 1
    expect(() => validateSequence(sequence)).toThrow(/expected .* targets/)
  })

  it('returns true for a genuinely valid sequence', () => {
    const sequence = generateSequence(2, 40, 1)
    expect(validateSequence(sequence)).toBe(true)
  })
})
