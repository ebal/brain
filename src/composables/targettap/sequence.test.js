import { describe, it, expect } from 'vitest'
import {
  selectTarget, calculateTotalStimuli, calculateTargetCount,
  generateTargetPositions, generateDistractors, generateSequence,
  validateSequence, makeRng,
} from './sequence.js'
import { TARGETTAP_DIFFICULTIES } from '../../constants/targettap/difficulties.js'
import { TARGETTAP_LETTER_POOL, CONFUSION_EXCLUSIONS } from '../../constants/targettap/letterPool.js'

describe('selectTarget', () => {
  it('comes from the validated pool', () => {
    for (let seed = 0; seed < 30; seed++) {
      expect(TARGETTAP_LETTER_POOL).toContain(selectTarget(null, makeRng(seed)))
    }
  })

  it('is never the same as the previous game\'s target (SPEC §6)', () => {
    for (let seed = 0; seed < 100; seed++) {
      const target = selectTarget('K', makeRng(seed))
      expect(target).not.toBe('K')
    }
  })

  it('has no previous-target restriction on the very first game', () => {
    const targets = new Set()
    for (let seed = 0; seed < 50; seed++) targets.add(selectTarget(null, makeRng(seed)))
    expect(targets.size).toBeGreaterThan(1)
  })
})

describe('calculateTotalStimuli', () => {
  it('every stimulus fits its full interval inside the round duration (SPEC §9)', () => {
    for (const config of Object.values(TARGETTAP_DIFFICULTIES)) {
      const total = calculateTotalStimuli(config)
      expect(total * config.stimulusInterval).toBeLessThanOrEqual(config.duration * 1000)
    }
  })
})

describe('generateTargetPositions', () => {
  it('never places a target in the first two positions (SPEC §8)', () => {
    for (let seed = 0; seed < 30; seed++) {
      const positions = generateTargetPositions(56, 14, makeRng(seed))
      expect(positions.every((p) => p >= 2)).toBe(true)
    }
  })

  it('never places two targets closer than the minimum gap (SPEC §7)', () => {
    for (let seed = 0; seed < 30; seed++) {
      const positions = generateTargetPositions(56, 14, makeRng(seed)).sort((a, b) => a - b)
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i] - positions[i - 1]).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('caps the count at what spacing can actually fit rather than overflowing', () => {
    const positions = generateTargetPositions(10, 100, makeRng(1))
    // eligible range [2, 9], min gap 3 → at most 3 targets fit (2, 5, 8)
    expect(positions.length).toBeLessThanOrEqual(3)
  })

  it('returns nothing when the grid is too small to fit any target', () => {
    expect(generateTargetPositions(2, 5, makeRng(1))).toEqual([])
  })

  it('every configured difficulty\'s desired target count fits within the spacing cap', () => {
    for (const config of Object.values(TARGETTAP_DIFFICULTIES)) {
      const total = calculateTotalStimuli(config)
      const desired = calculateTargetCount(config, total)
      const positions = generateTargetPositions(total, desired, makeRng(1))
      expect(positions.length).toBe(desired)
    }
  })
})

describe('generateDistractors', () => {
  it('every target position shows the target letter, every other position does not', () => {
    const positions = [2, 6, 10]
    const letters = generateDistractors('K', 14, positions, makeRng(1))
    letters.forEach((letter, i) => {
      if (positions.includes(i)) expect(letter).toBe('K')
      else expect(letter).not.toBe('K')
    })
  })

  it('never uses a letter flagged as confusable with the target (SPEC §11)', () => {
    const letters = generateDistractors('U', 40, [], makeRng(1))
    expect(letters).not.toContain('V') // CONFUSION_EXCLUSIONS.U includes V
  })

  it('avoids excessive immediate repetition (SPEC §12)', () => {
    const letters = generateDistractors('K', 60, [], makeRng(1))
    let maxRun = 1
    let run = 1
    for (let i = 1; i < letters.length; i++) {
      run = letters[i] === letters[i - 1] ? run + 1 : 1
      maxRun = Math.max(maxRun, run)
    }
    expect(maxRun).toBeLessThanOrEqual(2) // a same-letter repeat only via the RNG landing on it twice from a filtered pool, never 3+
  })
})

describe('generateSequence / validateSequence', () => {
  it('produces a fully valid sequence for every difficulty', () => {
    for (const config of Object.values(TARGETTAP_DIFFICULTIES)) {
      const sequence = generateSequence(config, null, 1)
      expect(() => validateSequence(sequence)).not.toThrow()
    }
  })

  it('a seeded sequence is fully reproducible', () => {
    const a = generateSequence(TARGETTAP_DIFFICULTIES.medium, null, 42)
    const b = generateSequence(TARGETTAP_DIFFICULTIES.medium, null, 42)
    expect(a).toEqual(b)
  })

  it('two different seeds usually produce different sequences', () => {
    const a = generateSequence(TARGETTAP_DIFFICULTIES.medium, null, 1)
    const b = generateSequence(TARGETTAP_DIFFICULTIES.medium, null, 2)
    expect(a).not.toEqual(b)
  })

  it('never repeats the previous game\'s target, across many seeds', () => {
    for (let seed = 0; seed < 100; seed++) {
      const sequence = generateSequence(TARGETTAP_DIFFICULTIES.easy, 'K', seed)
      expect(sequence.target).not.toBe('K')
    }
  })

  it('throws on an internally inconsistent sequence rather than starting it', () => {
    const sequence = generateSequence(TARGETTAP_DIFFICULTIES.easy, null, 1)
    const broken = { ...sequence, isTarget: [...sequence.isTarget] }
    broken.isTarget[0] = true // violates the first-two-non-target rule
    expect(() => validateSequence(broken)).toThrow()
  })

  it('rejects a target scheduled inside the minimum gap of the previous one', () => {
    const sequence = generateSequence(TARGETTAP_DIFFICULTIES.medium, null, 1)
    const firstTargetIndex = sequence.isTarget.findIndex(Boolean)
    const broken = {
      ...sequence,
      isTarget: [...sequence.isTarget],
      letters: [...sequence.letters],
    }
    broken.isTarget[firstTargetIndex + 1] = true
    broken.letters[firstTargetIndex + 1] = sequence.target
    expect(() => validateSequence(broken)).toThrow()
  })
})
