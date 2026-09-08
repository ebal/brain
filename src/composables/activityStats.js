// Longitudinal statistics / Activity dashboard, built on top of the common
// session model and personal baseline. Purely a read/aggregation layer:
// no new storage, nothing here is ever written back.
//
// Deliberately NOT doing: a unified cross-game "Brain Score," fake
// population percentiles, or any framing beyond "your performance on these
// specific tasks, over time."

import { median } from './mathStats.js'
import { computeBaseline, compareToBaseline, METRIC_DIRECTION } from './baseline.js'
import { getAllSessions } from './sessionModel.js'
import { useBenchmarkHistory } from './benchmarkHistory.js'
import { BENCHMARK_CONFIGS } from '../constants/benchmark.js'

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, all: Infinity }

export function filterByDateRange(sessions, rangeKey, now = new Date()) {
  const days = RANGE_DAYS[rangeKey]
  if (!Number.isFinite(days)) return sessions
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return sessions.filter((s) => new Date(s.completedAt) >= cutoff)
}

// Local calendar day (not UTC) — a session logged at 11pm local time should
// count for "today" from the player's own point of view, not whatever day
// that instant happens to fall on in UTC.
function localDayKeyFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function localDayKey(isoString) {
  return localDayKeyFromDate(new Date(isoString))
}

export function medianAbsoluteDeviation(values) {
  if (!values.length) return 0
  const m = median(values)
  return median(values.map((v) => Math.abs(v - m)))
}

// sessions: any list of common-shape sessions (play + benchmark combined —
// engagement doesn't care about difficulty-comparability the way a
// performance metric does).
export function computeActivityStats(sessions) {
  const sessionsPerGame = {}
  for (const s of sessions) sessionsPerGame[s.game] = (sessionsPerGame[s.game] || 0) + 1

  return {
    totalSessions: sessions.length,
    gamesPlayed: new Set(sessions.map((s) => s.game)).size,
    activeDays: new Set(sessions.map((s) => localDayKey(s.completedAt))).size,
    sessionsPerGame,
  }
}

// Consecutive days with at least one session, counting back from today — if
// nothing has been played yet today, the streak is still considered "alive"
// through yesterday rather than resetting to 0 before today is even over.
export function computeCurrentStreak(sessions, now = new Date()) {
  const dayKeys = new Set(sessions.map((s) => localDayKey(s.completedAt)))
  const cursor = new Date(now)
  if (!dayKeys.has(localDayKeyFromDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }
  let streak = 0
  while (dayKeys.has(localDayKeyFromDate(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// entries: common-shape BENCHMARK sessions for ONE game, already filtered to
// whatever date range the caller wants reflected. Pure — no localStorage.
export function computeGamePerformance(game, entries) {
  const baseline = computeBaseline(entries)
  const metrics = entries.map((e) => e.primaryMetric)
  const direction = METRIC_DIRECTION[game]
  const mostRecent = entries.length ? entries[entries.length - 1] : null
  const recentDelta = mostRecent && baseline.ready
    ? compareToBaseline(game, baseline, mostRecent.primaryMetric)
    : null

  return {
    game,
    sampleSize: entries.length,
    baseline,
    rollingMedian: metrics.length ? median(metrics) : null,
    mad: metrics.length ? medianAbsoluteDeviation(metrics) : null,
    best: metrics.length ? (direction === 'lower' ? Math.min(...metrics) : Math.max(...metrics)) : null,
    mostRecent,
    recentDelta,
  }
}

// The one function that touches localStorage (via getAllSessions() and
// useBenchmarkHistory()) — not unit-tested directly, same as
// sessionModel.js's getAllSessions() and for the same reason: correctness
// follows from the pure functions above, which are.
export function getActivityDashboardData(rangeKey, now = new Date()) {
  const allSessions = filterByDateRange(getAllSessions(), rangeKey, now)
  const { getHistory } = useBenchmarkHistory()

  const gamePerformance = Object.keys(BENCHMARK_CONFIGS).map((game) => {
    const entries = filterByDateRange(getHistory(game), rangeKey, now)
    return computeGamePerformance(game, entries)
  })

  return {
    activity: computeActivityStats(allSessions),
    currentStreak: computeCurrentStreak(getAllSessions(), now), // streak always uses all-time data, not the range filter
    gamePerformance,
  }
}
