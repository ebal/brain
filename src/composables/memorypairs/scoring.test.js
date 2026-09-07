import { describe, it, expect } from 'vitest'
import { calculateMemoryScore, calculateMoveEfficiency } from './scoring.js'

describe('calculateMemoryScore', () => {
  it('matches SPEC §16 worked example: Easy, 6 pairs, 32s, 9 moves, 3 mistakes', () => {
    const score = calculateMemoryScore({ baseScore: 3000, elapsedSeconds: 32, moves: 9, pairs: 6, mistakes: 3 })
    expect(score).toBe(1675)
  })

  it('matches SPEC §16 worked example: Medium, 8 pairs, 45s, 11 moves, 3 mistakes', () => {
    const score = calculateMemoryScore({ baseScore: 5000, elapsedSeconds: 45, moves: 11, pairs: 8, mistakes: 3 })
    expect(score).toBe(3350)
  })

  it('the theoretical minimum moves (moves === pairs) has no extra-move penalty', () => {
    const withMinimum = calculateMemoryScore({ baseScore: 3000, elapsedSeconds: 0, moves: 6, pairs: 6, mistakes: 0 })
    expect(withMinimum).toBe(3000)
  })

  it('time reduces score by 25 per whole elapsed second, floored', () => {
    const a = calculateMemoryScore({ baseScore: 3000, elapsedSeconds: 10.9, moves: 6, pairs: 6, mistakes: 0 })
    const b = calculateMemoryScore({ baseScore: 3000, elapsedSeconds: 11, moves: 6, pairs: 6, mistakes: 0 })
    expect(a).toBe(3000 - 10 * 25) // 10.9 floors to 10
    expect(b).toBe(3000 - 11 * 25)
  })

  it('extra moves above the theoretical minimum reduce score by 75 each', () => {
    const score = calculateMemoryScore({ baseScore: 3000, elapsedSeconds: 0, moves: 9, pairs: 6, mistakes: 0 })
    expect(score).toBe(3000 - 3 * 75)
  })

  it('mistakes reduce score by 100 each, independent of the extra-move penalty', () => {
    const score = calculateMemoryScore({ baseScore: 3000, elapsedSeconds: 0, moves: 6, pairs: 6, mistakes: 2 })
    expect(score).toBe(3000 - 2 * 100)
  })

  it('a mismatch is both an extra move and a mistake, so it carries a combined penalty', () => {
    // 2 mismatches: 2 extra moves (75 each) + 2 mistakes (100 each) = 350
    const score = calculateMemoryScore({ baseScore: 3000, elapsedSeconds: 0, moves: 8, pairs: 6, mistakes: 2 })
    expect(score).toBe(3000 - 2 * 75 - 2 * 100)
  })

  it('never displays below zero', () => {
    const score = calculateMemoryScore({ baseScore: 3000, elapsedSeconds: 0, moves: 50, pairs: 6, mistakes: 50 })
    expect(score).toBe(0)
  })
})

describe('calculateMoveEfficiency', () => {
  it('matches SPEC §17 worked example: 6 pairs, 9 moves -> 66.7%', () => {
    expect(calculateMoveEfficiency(6, 9)).toBeCloseTo(66.7, 1)
  })

  it('is 100% at the theoretical minimum', () => {
    expect(calculateMoveEfficiency(6, 6)).toBe(100)
  })

  it('is 0 when no moves have been made yet', () => {
    expect(calculateMoveEfficiency(6, 0)).toBe(0)
  })
})
