// Pure scoring/stats math — no Vue dependency (SPEC §22/§24/§34).
import { avg, median } from '../mathStats.js'

const HIT_POINTS = 100 // SPEC §22
const CORRECT_REJECTION_POINTS = 10 // SPEC §22
const MISS_PENALTY = 75 // SPEC §22
const FALSE_ALARM_PENALTY = 100 // SPEC §22/§23 — stronger than Miss's, so tapping frequently to "catch" targets never beats watching carefully

// result: { hits, misses, falseAlarms, correctRejections }. No RT speed
// bonus (SPEC §22) and never below zero.
export function calculateTargetTapScore(result) {
  const { hits, misses, falseAlarms, correctRejections } = result
  const raw = hits * HIT_POINTS + correctRejections * CORRECT_REJECTION_POINTS - misses * MISS_PENALTY - falseAlarms * FALSE_ALARM_PENALTY
  return Math.max(0, raw)
}

// SPEC §24: (Hits + Correct Rejections) / all classified stimuli.
export function calculateAccuracy(result) {
  const { hits, misses, falseAlarms, correctRejections } = result
  const total = hits + misses + falseAlarms + correctRejections
  return total > 0 ? ((hits + correctRejections) / total) * 100 : 0
}

// SPEC §24: Hits / (Hits + Misses) — how often an actual target was caught.
export function calculateHitRate(result) {
  const { hits, misses } = result
  const total = hits + misses
  return total > 0 ? (hits / total) * 100 : 0
}

// SPEC §24: False Alarms / (False Alarms + Correct Rejections) — how often
// a non-target was mistakenly tapped.
export function calculateFalseAlarmRate(result) {
  const { falseAlarms, correctRejections } = result
  const total = falseAlarms + correctRejections
  return total > 0 ? (falseAlarms / total) * 100 : 0
}

// hitRTs: ms, Hits only (SPEC §20 — "primary RT metrics use Hits only").
// No slowest field — SPEC §27's history shape only lists avg/median/fastest.
export function calculateRTStats(hitRTs) {
  return {
    avgHitRT: avg(hitRTs),
    medianHitRT: median(hitRTs),
    fastestHitRT: hitRTs.length ? Math.min(...hitRTs) : 0,
  }
}
