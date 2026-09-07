// Pure scoring/stats math — no Vue dependency (SPEC §10/§13).
import { avg, median } from '../mathStats.js'

// result: { correctTargets, errors, completed, remainingSeconds }
// SPEC §10: time bonus and clean bonus only apply to a completed trail;
// an incomplete (timed-out) round gets neither, so a player can't benefit
// from leaving time unused. Score is clamped to a minimum of 0.
export function calculateScore(result) {
  const { correctTargets, errors, completed, remainingSeconds } = result
  let score = correctTargets * 100 - errors * 50

  if (completed) {
    score += Math.floor(remainingSeconds) * 25
    if (errors === 0) score += 250
  }

  return Math.max(0, score)
}

// transitions: [{ duration }] — one entry per successful tap, GO!->1 included.
export function calculateTransitionStats(transitions) {
  const durations = transitions.map((t) => t.duration)
  return {
    avgTransitionTime: avg(durations),
    medianTransitionTime: median(durations),
    fastestTransition: durations.length ? Math.min(...durations) : 0,
    slowestTransition: durations.length ? Math.max(...durations) : 0,
  }
}
