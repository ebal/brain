import { describe, it, expect } from 'vitest'
import { calculateEmojiMahjongScore, calculateStars } from './scoring.js'

describe('calculateEmojiMahjongScore', () => {
  it('applies the Level-SPEC §38 formula', () => {
    const score = calculateEmojiMahjongScore({
      tileCount: 40,
      elapsedSeconds: 47, // floor(47/5)*5 = 45
      mistakes: 3,
      hints: 1,
      undos: 2,
    })
    // base 40*125=5000 - time 45 - mistakes 150 - hints 250 - undos 50 = 4505
    expect(score).toBe(4505)
  })

  it('scales the base score with tile count', () => {
    const args = { elapsedSeconds: 0, mistakes: 0, hints: 0, undos: 0 }
    expect(calculateEmojiMahjongScore({ ...args, tileCount: 24 })).toBe(3000)
    expect(calculateEmojiMahjongScore({ ...args, tileCount: 48 })).toBe(6000)
  })

  it('never goes below zero', () => {
    const score = calculateEmojiMahjongScore({
      tileCount: 24,
      elapsedSeconds: 100000,
      mistakes: 100,
      hints: 100,
      undos: 100,
    })
    expect(score).toBe(0)
  })
})

describe('calculateStars', () => {
  it('awards 3 stars for a hint-free completion', () => {
    expect(calculateStars({ hints: 0 })).toBe(3)
  })

  it('awards 2 stars for exactly one hint', () => {
    expect(calculateStars({ hints: 1 })).toBe(2)
  })

  it('awards 1 star for two or more hints', () => {
    expect(calculateStars({ hints: 2 })).toBe(1)
    expect(calculateStars({ hints: 10 })).toBe(1)
  })
})
