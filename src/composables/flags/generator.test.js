import { describe, it, expect } from 'vitest'
import { COUNTRIES } from '../../constants/flags/countries.js'
import { CONFUSION_CLUSTERS } from '../../constants/flags/confusionSets.js'
import { getLevelConfig } from '../../constants/flags/levels.js'
import { getCountry } from './dataset.js'
import { makeRng, selectDistractors, generateQuestion, generateRound } from './generator.js'

describe('selectDistractors', () => {
  it('never includes the target and never duplicates, across every tier', () => {
    const rng = makeRng(1)
    for (const tier of [1, 2, 3, 4]) {
      for (const country of COUNTRIES.slice(0, 20)) {
        const distractors = selectDistractors(country, tier, undefined, rng)
        expect(distractors).toHaveLength(3)
        expect(distractors).not.toContain(country.code)
        expect(new Set(distractors).size).toBe(3)
      }
    }
  })

  it('tier 1 picks cross-region, cross-pattern distractors when available', () => {
    const rng = makeRng(42)
    const target = getCountry('gr') // Europe, 'cross'
    const distractors = selectDistractors(target, 1, undefined, rng).map(getCountry)
    for (const d of distractors) {
      expect(d.region).not.toBe(target.region)
      expect(d.patternTag).not.toBe(target.patternTag)
    }
  })

  it('tier 2 picks same-region distractors', () => {
    const rng = makeRng(7)
    const target = getCountry('fr')
    const distractors = selectDistractors(target, 2, undefined, rng).map(getCountry)
    for (const d of distractors) {
      expect(d.region).toBe(target.region)
    }
  })

  it('tier 4 prefers confusion-cluster members when the target is in one', () => {
    const rng = makeRng(99)
    const target = getCountry('ro') // in the Romania/Chad/Andorra/Moldova cluster
    const distractors = selectDistractors(target, 4, undefined, rng)
    const clusterCodes = new Set(CONFUSION_CLUSTERS.find((c) => c.includes('ro')))
    const fromCluster = distractors.filter((code) => clusterCodes.has(code))
    expect(fromCluster.length).toBeGreaterThan(0)
  })
})

describe('generateQuestion', () => {
  it('produces exactly 4 choices, exactly one correct, no duplicates', () => {
    const rng = makeRng(5)
    for (const country of COUNTRIES.slice(0, 15)) {
      const q = generateQuestion(country, { distractorTier: 2 }, rng)
      expect(q.choices).toHaveLength(4)
      expect(new Set(q.choices).size).toBe(4)
      expect(q.choices[q.correctIndex]).toBe(country.code)
      expect(q.correctIndex).toBeGreaterThanOrEqual(0)
      expect(q.correctIndex).toBeLessThanOrEqual(3)
    }
  })

  it('is deterministic given the same seed', () => {
    const q1 = generateQuestion('de', { distractorTier: 2 }, makeRng(123))
    const q2 = generateQuestion('de', { distractorTier: 2 }, makeRng(123))
    expect(q1).toEqual(q2)
  })

  it('can differ given a different seed', () => {
    const q1 = generateQuestion('de', { distractorTier: 2 }, makeRng(1))
    const q2 = generateQuestion('de', { distractorTier: 2 }, makeRng(2))
    expect(q1).not.toEqual(q2)
  })
})

describe('generateRound', () => {
  it('produces questionCount distinct-target questions, each with a valid shape', () => {
    const level = getLevelConfig(20)
    const round = generateRound(level, 55)
    expect(round).toHaveLength(level.questionCount)
    const targets = round.map((q) => q.country)
    expect(new Set(targets).size).toBe(targets.length)
    for (const q of round) {
      expect(q.choices).toHaveLength(4)
      expect(new Set(q.choices).size).toBe(4)
      expect(q.choices).toContain(q.country)
    }
  })

  it('never has the correct answer in the same position more than 2 times in a row', () => {
    const level = getLevelConfig(45)
    const round = generateRound(level, 777)
    let streak = 1
    for (let i = 1; i < round.length; i++) {
      if (round[i].correctIndex === round[i - 1].correctIndex) {
        streak += 1
        expect(streak).toBeLessThanOrEqual(2)
      } else {
        streak = 1
      }
    }
  })

  it('is deterministic given the same seed', () => {
    const level = getLevelConfig(10)
    const r1 = generateRound(level, 999)
    const r2 = generateRound(level, 999)
    expect(r1).toEqual(r2)
  })

  it('respects the level\'s distractor tier (spot check: tier 1 stays cross-region)', () => {
    const level = getLevelConfig(3) // tier 1
    const round = generateRound(level, 3)
    for (const q of round) {
      const target = getCountry(q.country)
      for (const code of q.choices) {
        if (code === q.country) continue
        expect(getCountry(code).region).not.toBe(target.region)
      }
    }
  })
})
