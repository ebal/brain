import { describe, it, expect } from 'vitest'
import { calculateNumberMatchScore } from './scoring.js'

describe('calculateNumberMatchScore', () => {
  it('applies the SPEC §19 formula for an uncleared attempt', () => {
    const score = calculateNumberMatchScore({
      difficultyKey: 'medium',
      pairsRemoved: 10,
      mistakes: 3,
      hints: 0,
      addNumbersUsed: 1,
      undos: 1,
      elapsedSeconds: 47, // floor(47/10)*5 = 20
      cleared: false,
    })
    // base 5000 + 10*50 - 3*50 - 0 - 1*200 - 1*25 - 20 = 5000+500-150-200-25-20=5105
    expect(score).toBe(5105)
  })

  it('adds the clear bonus only when cleared', () => {
    const args = {
      difficultyKey: 'easy',
      pairsRemoved: 9,
      mistakes: 0,
      hints: 0,
      addNumbersUsed: 0,
      undos: 0,
      elapsedSeconds: 0,
    }
    const cleared = calculateNumberMatchScore({ ...args, cleared: true })
    const notCleared = calculateNumberMatchScore({ ...args, cleared: false })
    expect(cleared - notCleared).toBe(500) // easy's clearBonus
  })

  it('uses the correct base score and clear bonus per difficulty', () => {
    const args = { pairsRemoved: 0, mistakes: 0, hints: 0, addNumbersUsed: 0, undos: 0, elapsedSeconds: 0, cleared: false }
    expect(calculateNumberMatchScore({ ...args, difficultyKey: 'easy' })).toBe(3000)
    expect(calculateNumberMatchScore({ ...args, difficultyKey: 'medium' })).toBe(5000)
    expect(calculateNumberMatchScore({ ...args, difficultyKey: 'hard' })).toBe(7500)
    expect(calculateNumberMatchScore({ ...args, difficultyKey: 'very-hard' })).toBe(10000)
    expect(calculateNumberMatchScore({ ...args, difficultyKey: 'expert' })).toBe(13000)
    expect(calculateNumberMatchScore({ ...args, difficultyKey: 'extreme' })).toBe(16000)
  })

  it('never goes below zero', () => {
    const score = calculateNumberMatchScore({
      difficultyKey: 'easy',
      pairsRemoved: 0,
      mistakes: 1000,
      hints: 1000,
      addNumbersUsed: 1000,
      undos: 1000,
      elapsedSeconds: 100000,
      cleared: false,
    })
    expect(score).toBe(0)
  })
})
