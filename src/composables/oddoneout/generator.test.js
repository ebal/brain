import { describe, it, expect } from 'vitest'
import { generateTrial, validateTrial, findOddIndex, eligiblePairs, makeRng } from './generator.js'
import { ODDONEOUT_DIFFICULTIES } from '../../constants/oddoneout/difficulties.js'
import { CONFUSION_PAIRS } from '../../constants/oddoneout/confusionPairs.js'

describe('eligiblePairs', () => {
  it('every difficulty has at least one eligible pair', () => {
    for (const key of Object.keys(ODDONEOUT_DIFFICULTIES)) {
      expect(eligiblePairs(key).length).toBeGreaterThan(0)
    }
  })

  it('mixed-family (ambiguous) pairs never appear below Expert (SPEC §4)', () => {
    for (const key of ['easy', 'medium', 'hard', 'very-hard']) {
      const families = eligiblePairs(key).map((p) => p.family)
      expect(families).not.toContain('mixed')
    }
    expect(eligiblePairs('expert').some((p) => p.family === 'mixed')).toBe(true)
    expect(eligiblePairs('extreme').some((p) => p.family === 'mixed')).toBe(true)
  })

  it('returns nothing for an unknown difficulty', () => {
    expect(eligiblePairs('nonsense')).toEqual([])
  })
})

describe('generateTrial', () => {
  it('produces a grid of the requested size', () => {
    const trial = generateTrial('easy', 4, makeRng(1))
    expect(trial.cells.length).toBe(16)
    expect(trial.gridSize).toBe(4)
  })

  it('has exactly one odd item, at the declared oddIndex', () => {
    for (let seed = 0; seed < 50; seed++) {
      const trial = generateTrial('hard', 6, makeRng(seed))
      const differing = trial.cells.filter((c) => c !== trial.base)
      expect(differing.length).toBe(1)
      expect(trial.cells[trial.oddIndex]).toBe(trial.odd)
      expect(trial.cells[trial.oddIndex]).not.toBe(trial.base)
    }
  })

  it('every non-odd cell is identical to base', () => {
    const trial = generateTrial('extreme', 9, makeRng(7))
    trial.cells.forEach((cell, i) => {
      if (i === trial.oddIndex) return
      expect(cell).toBe(trial.base)
    })
  })

  it('the odd position varies across many generations (not pinned to one spot)', () => {
    const positions = new Set()
    for (let seed = 0; seed < 100; seed++) {
      const trial = generateTrial('medium', 5, makeRng(seed))
      positions.add(trial.oddIndex)
    }
    expect(positions.size).toBeGreaterThan(10)
  })

  it('a seeded rng reproduces the exact same trial (SPEC §31)', () => {
    const a = generateTrial('very-hard', 7, makeRng(42))
    const b = generateTrial('very-hard', 7, makeRng(42))
    expect(a).toEqual(b)
  })

  it('two different seeds usually produce different trials', () => {
    const a = generateTrial('hard', 6, makeRng(1))
    const b = generateTrial('hard', 6, makeRng(2))
    expect(a).not.toEqual(b)
  })

  it('only draws pairs eligible for the requested difficulty', () => {
    for (let seed = 0; seed < 30; seed++) {
      const trial = generateTrial('easy', 4, makeRng(seed))
      const eligibleIds = eligiblePairs('easy').map((p) => p.id)
      expect(eligibleIds).toContain(trial.pairId)
    }
  })

  it('throws for a difficulty with no eligible pairs', () => {
    expect(() => generateTrial('nonsense', 4, makeRng(1))).toThrow()
  })
})

describe('validateTrial', () => {
  it('accepts a well-formed trial', () => {
    const trial = generateTrial('hard', 6, makeRng(3))
    expect(validateTrial(trial)).toBe(true)
  })

  it('rejects a trial with zero odd cells', () => {
    const trial = generateTrial('hard', 6, makeRng(3))
    const cells = trial.cells.map(() => trial.base)
    expect(validateTrial({ ...trial, cells })).toBe(false)
  })

  it('rejects a trial with more than one odd cell', () => {
    const trial = generateTrial('hard', 6, makeRng(3))
    const cells = [...trial.cells]
    const otherIndex = cells.findIndex((c, i) => i !== trial.oddIndex)
    cells[otherIndex] = trial.odd
    expect(validateTrial({ ...trial, cells })).toBe(false)
  })

  it('rejects a trial whose declared oddIndex does not point at the differing cell', () => {
    const trial = generateTrial('hard', 6, makeRng(3))
    const wrongIndex = (trial.oddIndex + 1) % trial.cells.length
    expect(validateTrial({ ...trial, oddIndex: wrongIndex })).toBe(false)
  })
})

describe('findOddIndex', () => {
  it('finds the differing cell', () => {
    const trial = generateTrial('medium', 5, makeRng(9))
    expect(findOddIndex(trial)).toBe(trial.oddIndex)
  })
})

describe('confusion-pair library', () => {
  it('every pair has a valid difficulty range', () => {
    const order = ['easy', 'medium', 'hard', 'very-hard', 'expert', 'extreme']
    for (const pair of CONFUSION_PAIRS) {
      expect(order).toContain(pair.minimumDifficulty)
      expect(order).toContain(pair.maximumDifficulty)
      expect(order.indexOf(pair.minimumDifficulty)).toBeLessThanOrEqual(order.indexOf(pair.maximumDifficulty))
    }
  })

  it('every pair has two distinct, non-empty characters', () => {
    for (const pair of CONFUSION_PAIRS) {
      expect(pair.base).not.toBe(pair.odd)
      expect(pair.base.length).toBeGreaterThan(0)
      expect(pair.odd.length).toBeGreaterThan(0)
    }
  })

  it('has unique ids', () => {
    const ids = CONFUSION_PAIRS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
