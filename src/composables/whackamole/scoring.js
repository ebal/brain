// Pure scoring/stats math — no Vue dependency (SPEC §14-16).
import { avg, median } from '../mathStats.js'
import { STAR_THRESHOLDS } from '../../constants/whackamole/levels.js'

const HIT_POINTS = 100 // SPEC §14
const CORRECT_REJECTION_POINTS = 25 // SPEC §14
const MISS_PENALTY = 75 // SPEC §14
const FALSE_ALARM_PENALTY = 100 // SPEC §14
const EMPTY_TAP_PENALTY = 25 // SPEC §14

// result: { hits, misses, falseAlarms, correctRejections, emptyTaps }. No RT
// speed bonus (SPEC §14) and never below zero.
export function calculateWhackAMoleScore(result) {
  const { hits, misses, falseAlarms, correctRejections, emptyTaps } = result
  const raw =
    hits * HIT_POINTS +
    correctRejections * CORRECT_REJECTION_POINTS -
    misses * MISS_PENALTY -
    falseAlarms * FALSE_ALARM_PENALTY -
    emptyTaps * EMPTY_TAP_PENALTY
  return Math.max(0, raw)
}

// SPEC §15: Hits / (Hits + Misses).
export function calculateHitRate({ hits, misses }) {
  const total = hits + misses
  return total > 0 ? (hits / total) * 100 : 0
}

// SPEC §15: False Alarms / (False Alarms + Correct Rejections).
export function calculateFalseAlarmRate({ falseAlarms, correctRejections }) {
  const total = falseAlarms + correctRejections
  return total > 0 ? (falseAlarms / (falseAlarms + correctRejections)) * 100 : 0
}

// hitRTs: ms, Hits only (SPEC §12 — RT begins when the mole is visible and
// interactive, ends on the first valid tap in its cell).
export function calculateRTStats(hitRTs) {
  return {
    avgHitRT: avg(hitRTs),
    medianHitRT: median(hitRTs),
    fastestHitRT: hitRTs.length ? Math.min(...hitRTs) : 0,
  }
}

// SPEC §16: ★★★ needs Hit Rate >=95%, Empty Taps=0, and (only when the
// level has distractors) False Alarm Rate <=5%. ★★☆ relaxes to >=85% /
// <=15%. ★☆☆ for any completion. "For levels without distractors, ignore
// False Alarm Rate" — hasDistractors below is exactly that carve-out.
export function calculateStars({ hitRate, falseAlarmRate, emptyTaps, hasDistractors }) {
  const { threeStar, twoStar } = STAR_THRESHOLDS

  const meetsThree =
    hitRate >= threeStar.minHitRate &&
    emptyTaps <= threeStar.maxEmptyTaps &&
    (!hasDistractors || falseAlarmRate <= threeStar.maxFalseAlarmRate)
  if (meetsThree) return 3

  const meetsTwo = hitRate >= twoStar.minHitRate && (!hasDistractors || falseAlarmRate <= twoStar.maxFalseAlarmRate)
  if (meetsTwo) return 2

  return 1
}
