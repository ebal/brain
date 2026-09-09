import { describe, it, expect } from 'vitest'
import { rotateShape, areRotationEquivalent, areReflectionEquivalent } from './geometry.js'
import { generateTrial, calculateMentalRotationScore, makeRng } from './trialGenerator.js'
import { MENTALROTATION_SHAPES } from '../../constants/mentalrotation/shapes.js'
import { MENTALROTATION_DIFFICULTIES } from '../../constants/mentalrotation/difficulties.js'

describe('shape library validity (SPEC §7)', () => {
  it('no shape equals any of its own nonzero rotations (not rotationally symmetric)', () => {
    for (const shape of MENTALROTATION_SHAPES) {
      const baseKey = JSON.stringify(rotateShape(shape.cells, 0))
      for (let steps = 1; steps <= 3; steps++) {
        expect(JSON.stringify(rotateShape(shape.cells, steps)), `${shape.id} steps=${steps}`).not.toBe(baseKey)
      }
    }
  })

  it('no shape is reflection-equivalent to itself at any rotation', () => {
    for (const shape of MENTALROTATION_SHAPES) {
      expect(areReflectionEquivalent(shape.cells, shape.cells), shape.id).toBe(false)
    }
  })

  it('has no duplicate shape ids', () => {
    const ids = MENTALROTATION_SHAPES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('meets SPEC §29 minimums per difficulty pool (cellCount <= maxCellCount)', () => {
    const minimums = { easy: 12, medium: 20, hard: 24, veryHard: 28 }
    for (const [key, min] of Object.entries(minimums)) {
      const pool = MENTALROTATION_SHAPES.filter((s) => s.cellCount <= MENTALROTATION_DIFFICULTIES[key].maxCellCount)
      expect(pool.length, key).toBeGreaterThanOrEqual(min)
    }
  })
})

describe('generateTrial', () => {
  it('produces the right candidate count per difficulty', () => {
    for (const difficulty of Object.values(MENTALROTATION_DIFFICULTIES)) {
      const trial = generateTrial(difficulty, makeRng(1))
      expect(trial.candidates.length).toBe(difficulty.choices)
    }
  })

  it('always has exactly one correct candidate, rotation-equivalent to the reference', () => {
    const difficulty = MENTALROTATION_DIFFICULTIES.veryHard
    for (let seed = 0; seed < 200; seed++) {
      const trial = generateTrial(difficulty, makeRng(seed))
      const equivalentCount = trial.candidates.filter((c) => areRotationEquivalent(c.cells, trial.referenceCells)).length
      expect(equivalentCount, `seed=${seed}`).toBe(1)
      const marked = trial.candidates.filter((c) => c.correct)
      expect(marked.length, `seed=${seed}`).toBe(1)
      expect(marked[0].id, `seed=${seed}`).toBe(trial.correctCandidateId)
      expect(areRotationEquivalent(marked[0].cells, trial.referenceCells), `seed=${seed}`).toBe(true)
    }
  })

  it('randomizes the correct candidate position across seeds', () => {
    const difficulty = MENTALROTATION_DIFFICULTIES.hard
    const positions = new Set()
    for (let seed = 0; seed < 30; seed++) {
      const trial = generateTrial(difficulty, makeRng(seed))
      positions.add(trial.candidates.findIndex((c) => c.correct))
    }
    expect(positions.size).toBeGreaterThan(1)
  })

  it('avoids repeating a recently-used shape when the pool allows it', () => {
    const difficulty = MENTALROTATION_DIFFICULTIES.veryHard // largest pool
    const rng = makeRng(42)
    const recent = []
    for (let i = 0; i < 10; i++) {
      const trial = generateTrial(difficulty, rng, recent)
      expect(recent).not.toContain(trial.shapeId)
      recent.push(trial.shapeId)
      if (recent.length > 4) recent.shift()
    }
  })

  it('is deterministic for a given seed', () => {
    const difficulty = MENTALROTATION_DIFFICULTIES.medium
    const a = generateTrial(difficulty, makeRng(777))
    const b = generateTrial(difficulty, makeRng(777))
    expect(a).toEqual(b)
  })

  it('produces different sequences for different seeds', () => {
    const difficulty = MENTALROTATION_DIFFICULTIES.medium
    const a = generateTrial(difficulty, makeRng(1))
    const b = generateTrial(difficulty, makeRng(2))
    expect(a).not.toEqual(b)
  })
})

describe('calculateMentalRotationScore', () => {
  it('awards +100 for a correct answer with no speed bonus at/above 2000ms', () => {
    expect(calculateMentalRotationScore([{ correct: true, reactionTime: 2000 }])).toBe(100)
  })

  it('awards the correct speed-bonus tier', () => {
    expect(calculateMentalRotationScore([{ correct: true, reactionTime: 700 }])).toBe(130)
    expect(calculateMentalRotationScore([{ correct: true, reactionTime: 1000 }])).toBe(120)
    expect(calculateMentalRotationScore([{ correct: true, reactionTime: 1800 }])).toBe(110)
  })

  it('subtracts 50 for an incorrect answer, with no speed bonus', () => {
    expect(calculateMentalRotationScore([{ correct: false, reactionTime: 100 }])).toBe(0) // floored
    expect(calculateMentalRotationScore([
      { correct: true, reactionTime: 100 },
      { correct: false, reactionTime: 100 },
    ])).toBe(130 - 50)
  })

  it('never goes below 0', () => {
    const trials = Array.from({ length: 10 }, () => ({ correct: false, reactionTime: 100 }))
    expect(calculateMentalRotationScore(trials)).toBe(0)
  })
})
