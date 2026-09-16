// Persistence for Target Tap — best score/hit-rate/false-alarm-rate/median
// hit RT, rolling history and derived statistics, all keyed per difficulty
// (SPEC §26-28). Also owns the single, difficulty-independent "last target"
// value (SPEC §6/§38) so a new game's target can never repeat the
// immediately previous game's, across every difficulty. Follows the same
// read/write shape as switchtrail/oddoneout's stats composables.

import { avg, median } from '../mathStats.js'
import { METRIC_VERSIONS } from '../../constants/metricVersions.js'

const STATS_PREFIX = 'targettap:stats:'
const HISTORY_PREFIX = 'targettap:history:'
const LAST_TARGET_KEY = 'targettap:last-target'
const MAX_HISTORY = 30 // SPEC §27
const MAX_STATS_SAMPLES = 50 // per-difficulty sample cap for avg/median, separate from the 30-entry history
const RT_BEST_MIN_HIT_RATE = 80 // SPEC §26
const RT_BEST_MAX_FALSE_ALARM_RATE = 20 // SPEC §26

function statsKeyFor(difficultyKey) {
  return `${STATS_PREFIX}${difficultyKey}`
}

function historyKeyFor(difficultyKey) {
  return `${HISTORY_PREFIX}${difficultyKey}`
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — silently skip persistence
  }
}

function defaultStats() {
  return {
    started: 0,
    completed: 0,
    bestScore: null, // { score, hitRate, falseAlarmRate, medianHitRT, date }
    bestHitRate: null, // { hitRate, date }
    bestFalseAlarmRate: null, // { falseAlarmRate, date } — lowest is best
    bestMedianHitRT: null, // { medianHitRT, hitRate, falseAlarmRate, date } — eligible completions only
    completions: [], // capped samples used for avg/median
  }
}

// SPEC §26 tie-breakers for equal score: higher Hit Rate, then lower False
// Alarm Rate, then lower Median Hit RT.
function isBetterScore(candidate, current) {
  if (!current) return true
  if (candidate.score !== current.score) return candidate.score > current.score
  if (candidate.hitRate !== current.hitRate) return candidate.hitRate > current.hitRate
  if (candidate.falseAlarmRate !== current.falseAlarmRate) return candidate.falseAlarmRate < current.falseAlarmRate
  return candidate.medianHitRT < current.medianHitRT
}

export function useTargetTapStats() {
  function getStats(difficultyKey) {
    return readJSON(statsKeyFor(difficultyKey), defaultStats())
  }

  function recordStart(difficultyKey) {
    const stats = getStats(difficultyKey)
    stats.started += 1
    writeJSON(statsKeyFor(difficultyKey), stats)
  }

  // Kept symmetrical with every other game's stats composable — an
  // abandoned/exited round does not count as a completion and there is no
  // streak or other running state to reset for Target Tap.
  function recordAbandon() {}

  // Single value shared across every difficulty (SPEC §38's
  // `targettap:last-target` — deliberately not scoped per difficulty, since
  // SPEC §6's rule is about the immediately previous GAME, not the
  // previous game at that same difficulty).
  function getLastTarget() {
    return readJSON(LAST_TARGET_KEY, null)
  }

  function setLastTarget(letter) {
    writeJSON(LAST_TARGET_KEY, letter)
  }

  // result: game.results value — { score, targetLetter, totalStimuli,
  // targets, hits, misses, falseAlarms, correctRejections, accuracy,
  // hitRate, falseAlarmRate, avgHitRT, medianHitRT, fastestHitRT, duration }
  function recordCompletion(difficultyKey, result) {
    const stats = getStats(difficultyKey)
    stats.completed += 1

    const date = new Date().toISOString()

    let isNewBestScore = false
    let isNewBestHitRate = false
    let isNewBestFalseAlarmRate = false
    let isNewBestMedianRT = false

    const scoreCandidate = {
      score: result.score,
      hitRate: result.hitRate,
      falseAlarmRate: result.falseAlarmRate,
      medianHitRT: result.medianHitRT,
      date,
    }
    if (isBetterScore(scoreCandidate, stats.bestScore)) {
      stats.bestScore = scoreCandidate
      isNewBestScore = true
    }

    if (!stats.bestHitRate || result.hitRate > stats.bestHitRate.hitRate) {
      stats.bestHitRate = { hitRate: result.hitRate, date }
      isNewBestHitRate = true
    }

    if (!stats.bestFalseAlarmRate || result.falseAlarmRate < stats.bestFalseAlarmRate.falseAlarmRate) {
      stats.bestFalseAlarmRate = { falseAlarmRate: result.falseAlarmRate, date }
      isNewBestFalseAlarmRate = true
    }

    if (
      result.hits > 0 &&
      result.hitRate >= RT_BEST_MIN_HIT_RATE &&
      result.falseAlarmRate <= RT_BEST_MAX_FALSE_ALARM_RATE &&
      (!stats.bestMedianHitRT || result.medianHitRT < stats.bestMedianHitRT.medianHitRT)
    ) {
      stats.bestMedianHitRT = { medianHitRT: result.medianHitRT, hitRate: result.hitRate, falseAlarmRate: result.falseAlarmRate, date }
      isNewBestMedianRT = true
    }

    stats.completions.push({
      score: result.score,
      hitRate: result.hitRate,
      falseAlarmRate: result.falseAlarmRate,
      accuracy: result.accuracy,
      avgHitRT: result.avgHitRT,
      medianHitRT: result.medianHitRT,
      hits: result.hits,
      misses: result.misses,
      falseAlarms: result.falseAlarms,
      correctRejections: result.correctRejections,
    })
    stats.completions = stats.completions.slice(-MAX_STATS_SAMPLES)

    writeJSON(statsKeyFor(difficultyKey), stats)

    const history = readJSON(historyKeyFor(difficultyKey), [])
    history.push({
      difficulty: difficultyKey,
      targetLetter: result.targetLetter,
      score: result.score,
      totalStimuli: result.totalStimuli,
      targets: result.targets,
      hits: result.hits,
      misses: result.misses,
      falseAlarms: result.falseAlarms,
      correctRejections: result.correctRejections,
      accuracy: result.accuracy,
      hitRate: result.hitRate,
      falseAlarmRate: result.falseAlarmRate,
      avgHitRT: result.avgHitRT,
      medianHitRT: result.medianHitRT,
      fastestHitRT: result.fastestHitRT,
      duration: result.duration,
      completedAt: date,
      metricVersion: METRIC_VERSIONS.targettap,
      appVersion: __APP_VERSION__,
    })
    writeJSON(historyKeyFor(difficultyKey), history.slice(-MAX_HISTORY))

    return { isNewBestScore, isNewBestHitRate, isNewBestFalseAlarmRate, isNewBestMedianRT }
  }

  function getDerivedStats(difficultyKey) {
    const stats = getStats(difficultyKey)
    return {
      ...stats,
      avgScore: avg(stats.completions.map((c) => c.score)),
      medianScore: median(stats.completions.map((c) => c.score)),
      avgHitRate: avg(stats.completions.map((c) => c.hitRate)),
      avgFalseAlarmRate: avg(stats.completions.map((c) => c.falseAlarmRate)),
      avgAccuracy: avg(stats.completions.map((c) => c.accuracy)),
      avgHitRT: avg(stats.completions.map((c) => c.avgHitRT)),
      medianHitRT: median(stats.completions.map((c) => c.medianHitRT)),
      totalHits: stats.completions.reduce((sum, c) => sum + c.hits, 0),
      totalMisses: stats.completions.reduce((sum, c) => sum + c.misses, 0),
      totalFalseAlarms: stats.completions.reduce((sum, c) => sum + c.falseAlarms, 0),
      totalCorrectRejections: stats.completions.reduce((sum, c) => sum + c.correctRejections, 0),
    }
  }

  // History is stored per difficulty, not combined — there's no meaningful
  // "all difficulties" view (SPEC §28: "do not combine difficulty levels
  // into one universal Target Tap score").
  function getHistory(difficultyKey) {
    return readJSON(historyKeyFor(difficultyKey), [])
  }

  return { getStats, getDerivedStats, recordStart, recordAbandon, recordCompletion, getHistory, getLastTarget, setLastTarget }
}
