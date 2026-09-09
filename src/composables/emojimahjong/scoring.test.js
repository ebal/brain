import { describe, it, expect } from 'vitest'
import { calculateEmojiMahjongScore } from './scoring.js'

describe('calculateEmojiMahjongScore', () => {
  it('applies the SPEC §21 formula', () => {
    const score = calculateEmojiMahjongScore({
      difficultyKey: 'medium',
      elapsedSeconds: 47, // floor(47/5)*5 = 45
      mistakes: 3,
      hints: 1,
      undos: 2,
    })
    // base 5000 - time 45 - mistakes 150 - hints 250 - undos 50 = 4505
    expect(score).toBe(4505)
  })

  it('uses the correct base score per difficulty', () => {
    const args = { elapsedSeconds: 0, mistakes: 0, hints: 0, undos: 0 }
    expect(calculateEmojiMahjongScore({ ...args, difficultyKey: 'easy' })).toBe(3000)
    expect(calculateEmojiMahjongScore({ ...args, difficultyKey: 'medium' })).toBe(5000)
    expect(calculateEmojiMahjongScore({ ...args, difficultyKey: 'hard' })).toBe(7500)
    expect(calculateEmojiMahjongScore({ ...args, difficultyKey: 'very-hard' })).toBe(10000)
  })

  it('never goes below zero', () => {
    const score = calculateEmojiMahjongScore({
      difficultyKey: 'easy',
      elapsedSeconds: 100000,
      mistakes: 100,
      hints: 100,
      undos: 100,
    })
    expect(score).toBe(0)
  })
})
