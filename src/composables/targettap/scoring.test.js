import { describe, it, expect } from 'vitest'
import { calculateTargetTapScore, calculateAccuracy, calculateHitRate, calculateFalseAlarmRate, calculateRTStats } from './scoring.js'

describe('calculateTargetTapScore', () => {
  it('awards +100 per hit and +10 per correct rejection', () => {
    expect(calculateTargetTapScore({ hits: 3, correctRejections: 5, misses: 0, falseAlarms: 0 })).toBe(3 * 100 + 5 * 10)
  })

  it('subtracts 75 per miss and 100 per false alarm', () => {
    expect(calculateTargetTapScore({ hits: 0, correctRejections: 0, misses: 2, falseAlarms: 1 })).toBe(0)
  })

  it('a false alarm costs more than a miss (SPEC §23)', () => {
    const withMiss = calculateTargetTapScore({ hits: 5, correctRejections: 0, misses: 1, falseAlarms: 0 })
    const withFalseAlarm = calculateTargetTapScore({ hits: 5, correctRejections: 0, misses: 0, falseAlarms: 1 })
    expect(withFalseAlarm).toBeLessThan(withMiss)
  })

  it('never falls below zero', () => {
    expect(calculateTargetTapScore({ hits: 0, correctRejections: 0, misses: 10, falseAlarms: 10 })).toBe(0)
  })
})

describe('calculateAccuracy', () => {
  it('is (Hits + Correct Rejections) / all classified stimuli', () => {
    expect(calculateAccuracy({ hits: 19, correctRejections: 58, misses: 1, falseAlarms: 2 })).toBeCloseTo((77 / 80) * 100, 5)
  })

  it('is 0 when nothing has been classified', () => {
    expect(calculateAccuracy({ hits: 0, correctRejections: 0, misses: 0, falseAlarms: 0 })).toBe(0)
  })
})

describe('calculateHitRate', () => {
  it('is Hits / (Hits + Misses)', () => {
    expect(calculateHitRate({ hits: 19, misses: 1 })).toBeCloseTo(95, 5)
  })

  it('is 0 when no targets ever appeared', () => {
    expect(calculateHitRate({ hits: 0, misses: 0 })).toBe(0)
  })
})

describe('calculateFalseAlarmRate', () => {
  it('is False Alarms / (False Alarms + Correct Rejections)', () => {
    expect(calculateFalseAlarmRate({ falseAlarms: 2, correctRejections: 58 })).toBeCloseTo((2 / 60) * 100, 5)
  })

  it('is 0 when no non-targets ever appeared', () => {
    expect(calculateFalseAlarmRate({ falseAlarms: 0, correctRejections: 0 })).toBe(0)
  })
})

describe('calculateRTStats', () => {
  it('computes avg/median/fastest over Hit RTs only', () => {
    const stats = calculateRTStats([300, 400, 500])
    expect(stats.avgHitRT).toBe(400)
    expect(stats.medianHitRT).toBe(400)
    expect(stats.fastestHitRT).toBe(300)
  })

  it('returns zeros when there are no hits yet', () => {
    expect(calculateRTStats([])).toEqual({ avgHitRT: 0, medianHitRT: 0, fastestHitRT: 0 })
  })
})
