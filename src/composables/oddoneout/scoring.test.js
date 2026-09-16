import { describe, it, expect } from 'vitest'
import { calculateOddOneOutScore, calculateAccuracy, calculateRTStats } from './scoring.js'

describe('calculateOddOneOutScore', () => {
  it('awards +100 per correct answer', () => {
    expect(calculateOddOneOutScore({ correct: 5, wrong: 0 })).toBe(500)
  })

  it('subtracts 75 per wrong answer', () => {
    expect(calculateOddOneOutScore({ correct: 5, wrong: 2 })).toBe(500 - 150)
  })

  it('never falls below zero', () => {
    expect(calculateOddOneOutScore({ correct: 0, wrong: 10 })).toBe(0)
    expect(calculateOddOneOutScore({ correct: 1, wrong: 5 })).toBe(0)
  })
})

describe('calculateAccuracy', () => {
  it('computes correct / (correct + wrong) * 100', () => {
    expect(calculateAccuracy({ correct: 29, wrong: 4 })).toBeCloseTo((29 / 33) * 100, 5)
  })

  it('is 0 when nothing has been tapped', () => {
    expect(calculateAccuracy({ correct: 0, wrong: 0 })).toBe(0)
  })

  it('is 100 when every tap was correct', () => {
    expect(calculateAccuracy({ correct: 10, wrong: 0 })).toBe(100)
  })
})

describe('calculateRTStats', () => {
  it('computes avg/median/fastest/slowest over correct RTs only', () => {
    const stats = calculateRTStats([1000, 2000, 3000])
    expect(stats.avgCorrectRT).toBe(2000)
    expect(stats.medianCorrectRT).toBe(2000)
    expect(stats.fastestCorrectRT).toBe(1000)
    expect(stats.slowestCorrectRT).toBe(3000)
  })

  it('returns zeros when there are no correct answers yet', () => {
    const stats = calculateRTStats([])
    expect(stats).toEqual({
      avgCorrectRT: 0,
      medianCorrectRT: 0,
      fastestCorrectRT: 0,
      slowestCorrectRT: 0,
    })
  })
})
