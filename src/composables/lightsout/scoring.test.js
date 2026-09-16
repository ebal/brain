import { describe, it, expect } from 'vitest'
import { calculateEfficiency, calculateStars } from './scoring.js'

describe('calculateEfficiency', () => {
  it('is optimal / actual * 100', () => {
    expect(calculateEfficiency(3, 3)).toBe(100)
    expect(calculateEfficiency(3, 6)).toBe(50)
  })

  it('is capped at 100%', () => {
    expect(calculateEfficiency(3, 1)).toBe(100)
  })

  it('is 0 when no moves were made', () => {
    expect(calculateEfficiency(3, 0)).toBe(0)
  })
})

describe('calculateStars', () => {
  it('awards 3 stars for the exact optimal solution with no hints', () => {
    expect(calculateStars({ actualMoves: 5, optimalMoves: 5, hints: 0 })).toBe(3)
  })

  it('caps an optimal-but-hinted solution at 2 stars', () => {
    expect(calculateStars({ actualMoves: 5, optimalMoves: 5, hints: 1 })).toBe(2)
  })

  it('awards 2 stars within optimal + 2 moves', () => {
    expect(calculateStars({ actualMoves: 7, optimalMoves: 5, hints: 0 })).toBe(2)
  })

  it('awards 1 star beyond optimal + 2 moves', () => {
    expect(calculateStars({ actualMoves: 8, optimalMoves: 5, hints: 0 })).toBe(1)
  })
})
