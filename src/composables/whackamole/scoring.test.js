import { describe, it, expect } from 'vitest'
import { calculateWhackAMoleScore, calculateHitRate, calculateFalseAlarmRate, calculateRTStats, calculateStars } from './scoring.js'

describe('calculateWhackAMoleScore', () => {
  it('rewards hits and correct rejections, penalizes everything else', () => {
    const score = calculateWhackAMoleScore({ hits: 10, misses: 0, falseAlarms: 0, correctRejections: 5, emptyTaps: 0 })
    expect(score).toBe(10 * 100 + 5 * 25)
  })

  it('never goes below zero', () => {
    const score = calculateWhackAMoleScore({ hits: 0, misses: 10, falseAlarms: 10, correctRejections: 0, emptyTaps: 10 })
    expect(score).toBe(0)
  })

  it('a false alarm costs more than a miss (SPEC §14)', () => {
    const withMiss = calculateWhackAMoleScore({ hits: 5, misses: 1, falseAlarms: 0, correctRejections: 0, emptyTaps: 0 })
    const withFalseAlarm = calculateWhackAMoleScore({ hits: 5, misses: 0, falseAlarms: 1, correctRejections: 0, emptyTaps: 0 })
    expect(withFalseAlarm).toBeLessThan(withMiss)
  })
})

describe('calculateHitRate', () => {
  it('is Hits / (Hits + Misses)', () => {
    expect(calculateHitRate({ hits: 9, misses: 1 })).toBe(90)
  })

  it('is 0 with no mole stimuli at all', () => {
    expect(calculateHitRate({ hits: 0, misses: 0 })).toBe(0)
  })
})

describe('calculateFalseAlarmRate', () => {
  it('is False Alarms / (False Alarms + Correct Rejections)', () => {
    expect(calculateFalseAlarmRate({ falseAlarms: 1, correctRejections: 9 })).toBe(10)
  })

  it('is 0 with no distractor stimuli at all', () => {
    expect(calculateFalseAlarmRate({ falseAlarms: 0, correctRejections: 0 })).toBe(0)
  })
})

describe('calculateRTStats', () => {
  it('computes avg/median/fastest from Hit RTs only', () => {
    const stats = calculateRTStats([300, 400, 500])
    expect(stats.avgHitRT).toBe(400)
    expect(stats.medianHitRT).toBe(400)
    expect(stats.fastestHitRT).toBe(300)
  })

  it('is all zero with no hits', () => {
    const stats = calculateRTStats([])
    expect(stats).toEqual({ avgHitRT: 0, medianHitRT: 0, fastestHitRT: 0 })
  })
})

describe('calculateStars', () => {
  it('awards 3 stars for a near-perfect distractor-free level', () => {
    const stars = calculateStars({ hitRate: 100, falseAlarmRate: 0, emptyTaps: 0, hasDistractors: false })
    expect(stars).toBe(3)
  })

  it('ignores False Alarm Rate on a distractor-free level (SPEC §16)', () => {
    // A level with no distractors always has falseAlarmRate 0 anyway, but
    // this simulates the carve-out explicitly.
    const stars = calculateStars({ hitRate: 96, falseAlarmRate: 50, emptyTaps: 0, hasDistractors: false })
    expect(stars).toBe(3)
  })

  it('a high false alarm rate caps stars below 3 on a level with distractors', () => {
    const stars = calculateStars({ hitRate: 100, falseAlarmRate: 20, emptyTaps: 0, hasDistractors: true })
    expect(stars).toBeLessThan(3)
  })

  it('any empty tap caps stars below 3', () => {
    const stars = calculateStars({ hitRate: 100, falseAlarmRate: 0, emptyTaps: 1, hasDistractors: false })
    expect(stars).toBeLessThan(3)
  })

  it('falls back to 1 star for a weak but completed run', () => {
    const stars = calculateStars({ hitRate: 40, falseAlarmRate: 60, emptyTaps: 5, hasDistractors: true })
    expect(stars).toBe(1)
  })
})
