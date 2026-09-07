// Personal baseline (IMPROVEMENT-PLAN.md Phase 6) — "current performance vs.
// your own baseline," never "vs. a population." There is no normative
// dataset, and none is fabricated here: a baseline only exists once at least
// MIN_SESSIONS benchmark sessions have been recorded for that game, and it
// is always the median of that game's own benchmark history — derived
// on-demand (like sessionModel.js's getAllSessions()), never stored, so it
// can never go stale relative to the benchmark history it's computed from.

import { median } from './mathStats.js'
import { useBenchmarkHistory } from './benchmarkHistory.js'

const MIN_SESSIONS = 3

// Whether a LOWER or HIGHER primaryMetric is the better result, per game —
// some games measure elapsed time (lower is better), others a score or
// count (higher is better). Needed to describe "improved" vs "regressed"
// correctly regardless of which kind of metric a game uses.
export const METRIC_DIRECTION = {
  stroop: 'higher',
  schulte: 'lower',
  nback: 'higher',
  set: 'lower',
  'sequence-memory': 'higher',
  switchtrail: 'higher',
  memorypairs: 'higher',
}

function medianOrNull(values) {
  const clean = values.filter((v) => v !== null && v !== undefined)
  return clean.length ? median(clean) : null
}

// Pure — entries is an array of common-shape benchmark sessions for ONE
// game (see sessionModel.js / benchmarkHistory.js).
export function computeBaseline(entries) {
  if (entries.length < MIN_SESSIONS) {
    return { ready: false, sampleSize: entries.length, sessionsNeeded: MIN_SESSIONS - entries.length }
  }
  return {
    ready: true,
    sampleSize: entries.length,
    medianPrimaryMetric: medianOrNull(entries.map((e) => e.primaryMetric)),
    medianAccuracy: medianOrNull(entries.map((e) => e.accuracy)),
    medianRT: medianOrNull(entries.map((e) => e.medianRT)),
  }
}

// Touches localStorage via useBenchmarkHistory — not unit-tested directly,
// same as sessionModel.js's getAllSessions() and for the same reason.
export function getBaseline(game) {
  const { getHistory } = useBenchmarkHistory()
  return computeBaseline(getHistory(game))
}

// Positive percentDelta always means "better than baseline," regardless of
// whether this game's primary metric is lower-is-better or higher-is-better.
// Returns null when there's no usable baseline to compare against yet.
export function compareToBaseline(game, baseline, latestValue) {
  if (!baseline.ready || !baseline.medianPrimaryMetric) return null
  const direction = METRIC_DIRECTION[game]
  const rawPercent = ((latestValue - baseline.medianPrimaryMetric) / baseline.medianPrimaryMetric) * 100
  // `|| 0` normalizes a -0 result (an exact tie under the 'lower' direction's
  // sign flip) back to a plain 0 — cosmetic only, but avoids ever displaying
  // "-0.0%" for a result that's identical to the baseline.
  const percentDelta = (direction === 'lower' ? -rawPercent : rawPercent) || 0
  return { percentDelta, baselineValue: baseline.medianPrimaryMetric, latestValue }
}
