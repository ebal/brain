// Pure scoring/stats math — no Vue dependency (SPEC §17/§18/§32).
import { avg, median } from '../mathStats.js'

const CORRECT_POINTS = 100 // SPEC §17
const WRONG_PENALTY = 75 // SPEC §17

// result: { correct, wrong } — tap counts for the whole round.
// No time/completion bonus (SPEC §17: the fixed overall duration already
// rewards solving more trials, so a separate speed bonus would double-count
// it). Score can never fall below zero.
export function calculateOddOneOutScore(result) {
  const { correct, wrong } = result
  return Math.max(0, correct * CORRECT_POINTS - wrong * WRONG_PENALTY)
}

// SPEC §18: only actual grid-cell taps count; the challenge timer itself
// never affects accuracy.
export function calculateAccuracy(result) {
  const { correct, wrong } = result
  const total = correct + wrong
  return total > 0 ? (correct / total) * 100 : 0
}

// correctRTs: ms, correct taps only (SPEC §15 — "primary RT statistics use
// correct answers only").
export function calculateRTStats(correctRTs) {
  return {
    avgCorrectRT: avg(correctRTs),
    medianCorrectRT: median(correctRTs),
    fastestCorrectRT: correctRTs.length ? Math.min(...correctRTs) : 0,
    slowestCorrectRT: correctRTs.length ? Math.max(...correctRTs) : 0,
  }
}
