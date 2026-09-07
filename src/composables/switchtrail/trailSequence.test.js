import { describe, it, expect } from 'vitest'
import { createTrailSequence, getExpectedTarget } from './trailSequence.js'
import { SWITCHTRAIL_DIFFICULTIES } from '../../constants/switchtrail/difficulties.js'

describe('createTrailSequence', () => {
  it('Easy produces 12 targets alternating 1 A 2 B ... 6 F', () => {
    const seq = createTrailSequence(SWITCHTRAIL_DIFFICULTIES.easy)
    expect(seq).toHaveLength(12)
    expect(seq).toEqual(['1', 'A', '2', 'B', '3', 'C', '4', 'D', '5', 'E', '6', 'F'])
  })

  it('Medium produces 16 targets ending at 8 H', () => {
    const seq = createTrailSequence(SWITCHTRAIL_DIFFICULTIES.medium)
    expect(seq).toHaveLength(16)
    expect(seq.slice(-2)).toEqual(['8', 'H'])
  })

  it('Hard produces 24 targets ending at 12 L', () => {
    const seq = createTrailSequence(SWITCHTRAIL_DIFFICULTIES.hard)
    expect(seq).toHaveLength(24)
    expect(seq.slice(-2)).toEqual(['12', 'L'])
  })

  it('strictly alternates number, letter, number, letter ...', () => {
    const seq = createTrailSequence(SWITCHTRAIL_DIFFICULTIES.hard)
    seq.forEach((label, i) => {
      if (i % 2 === 0) expect(label).toMatch(/^\d+$/)
      else expect(label).toMatch(/^[A-Z]$/)
    })
  })

  it('every required target appears exactly once', () => {
    const seq = createTrailSequence(SWITCHTRAIL_DIFFICULTIES.medium)
    expect(new Set(seq).size).toBe(seq.length)
  })
})

describe('getExpectedTarget', () => {
  const seq = createTrailSequence(SWITCHTRAIL_DIFFICULTIES.easy)

  it('returns the label at the given index', () => {
    expect(getExpectedTarget(seq, 0)).toBe('1')
    expect(getExpectedTarget(seq, 1)).toBe('A')
  })

  it('returns null past the end of the sequence', () => {
    expect(getExpectedTarget(seq, seq.length)).toBeNull()
  })
})
