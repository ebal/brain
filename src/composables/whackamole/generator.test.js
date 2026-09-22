import { describe, it, expect } from 'vitest'
import { chooseSpawnCell, generateStimulusSequence, validateSequence, classifyResponse, makeRng } from './generator.js'
import { WHACKAMOLE_LEVELS, getLevelConfig } from '../../constants/whackamole/levels.js'

describe('chooseSpawnCell', () => {
  it('never produces three consecutive picks of the same cell (SPEC §8)', () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = makeRng(seed)
      const bag = []
      const recent = []
      for (let i = 0; i < 200; i++) {
        const cell = chooseSpawnCell(recent, bag, 4, rng)
        recent.push(cell)
      }
      let consecutive = 1
      for (let i = 1; i < recent.length; i++) {
        consecutive = recent[i] === recent[i - 1] ? consecutive + 1 : 1
        expect(consecutive).toBeLessThan(3)
      }
    }
  })

  it('gives every cell fair representation over a long run', () => {
    const rng = makeRng(7)
    const bag = []
    const recent = []
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0 }
    for (let i = 0; i < 400; i++) {
      const cell = chooseSpawnCell(recent, bag, 4, rng)
      recent.push(cell)
      counts[cell] += 1
    }
    for (const count of Object.values(counts)) {
      expect(count).toBeGreaterThan(50) // ~100 expected each; generous floor
    }
  })
})

describe('generateStimulusSequence', () => {
  it('produces exactly targetCount + distractorCount stimuli for every level', () => {
    for (const config of WHACKAMOLE_LEVELS) {
      const seq = generateStimulusSequence(config, 1)
      expect(seq.stimuli).toHaveLength(config.targetCount + config.distractorCount)
    }
  })

  it('has the exact configured distractor count, the rest are moles', () => {
    const config = getLevelConfig(27)
    const seq = generateStimulusSequence(config, 42)
    const distractors = seq.stimuli.filter((s) => s.isDistractor).length
    const moles = seq.stimuli.filter((s) => !s.isDistractor).length
    expect(distractors).toBe(config.distractorCount)
    expect(moles).toBe(config.targetCount)
  })

  it('every stimulus cell is within the grid and every gap is within the configured range', () => {
    const config = getLevelConfig(35)
    const seq = generateStimulusSequence(config, 5)
    const totalCells = config.gridSize * config.gridSize
    for (const s of seq.stimuli) {
      expect(s.cell).toBeGreaterThanOrEqual(0)
      expect(s.cell).toBeLessThan(totalCells)
      expect(s.gapMs).toBeGreaterThanOrEqual(config.gapMinMs)
      expect(s.gapMs).toBeLessThanOrEqual(config.gapMaxMs)
      expect(s.visibleMs).toBe(config.targetVisibleMs)
    }
  })

  it('a seeded sequence is fully reproducible', () => {
    const config = getLevelConfig(10)
    const a = generateStimulusSequence(config, 99)
    const b = generateStimulusSequence(config, 99)
    expect(a.stimuli).toEqual(b.stimuli)
  })

  it('different seeds produce different sequences', () => {
    const config = getLevelConfig(10)
    const a = generateStimulusSequence(config, 1)
    const b = generateStimulusSequence(config, 2)
    expect(a.stimuli).not.toEqual(b.stimuli)
  })

  it('passes validateSequence for every level, every seed', () => {
    for (const config of WHACKAMOLE_LEVELS) {
      for (let seed = 0; seed < 3; seed++) {
        const seq = generateStimulusSequence(config, seed * 1000 + config.id)
        expect(() => validateSequence(seq, config)).not.toThrow()
      }
    }
  })
})

describe('classifyResponse', () => {
  it('a tapped mole is a Hit; an untapped mole is a Miss', () => {
    const mole = { isDistractor: false }
    expect(classifyResponse(mole, true)).toBe('hit')
    expect(classifyResponse(mole, false)).toBe('miss')
  })

  it('a tapped distractor is a False Alarm; an untapped distractor is a Correct Rejection', () => {
    const distractor = { isDistractor: true }
    expect(classifyResponse(distractor, true)).toBe('falseAlarm')
    expect(classifyResponse(distractor, false)).toBe('correctRejection')
  })
})
