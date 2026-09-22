import { describe, it, expect } from 'vitest'
import { calculateScore, calculateStars } from './scoring.js'

describe('calculateScore', () => {
  it('is +100 per correct, +0 per incorrect, no speed component (SPEC §19)', () => {
    expect(calculateScore({ correctCount: 0 })).toBe(0)
    expect(calculateScore({ correctCount: 7 })).toBe(700)
    expect(calculateScore({ correctCount: 10 })).toBe(1000)
  })
})

describe('calculateStars', () => {
  it('10/10 is 3 stars', () => {
    expect(calculateStars({ correctCount: 10, totalCount: 10 })).toBe(3)
  })

  it('8-9/10 is 2 stars', () => {
    expect(calculateStars({ correctCount: 9, totalCount: 10 })).toBe(2)
    expect(calculateStars({ correctCount: 8, totalCount: 10 })).toBe(2)
  })

  it('any lower completion is 1 star', () => {
    expect(calculateStars({ correctCount: 7, totalCount: 10 })).toBe(1)
    expect(calculateStars({ correctCount: 0, totalCount: 10 })).toBe(1)
  })
})
