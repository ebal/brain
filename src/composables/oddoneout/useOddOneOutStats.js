// Persistence for Odd One Out — best score/accuracy/trial-count/median RT,
// rolling history and derived statistics, all keyed per difficulty (SPEC
// §21-23). Follows the same read/write shape as switchtrail/numbermatch's
// stats composables. No "all difficulties" combined view (SPEC §23: "Do not
// combine difficulties into a universal Odd One Out score") — same as
// Switch Trail.

import { avg, median } from '../mathStats.js'
import { METRIC_VERSIONS } from '../../constants/metricVersions.js'

const STATS_PREFIX = 'oddoneout:stats:'
const HISTORY_PREFIX = 'oddoneout:history:'
const MAX_HISTORY = 30 // SPEC §22
const MAX_STATS_SAMPLES = 50 // per-difficulty sample cap for avg/median, separate from the 30-entry history
const RT_BEST_MIN_ACCURACY = 80 // SPEC §21: "RT personal best requires accuracy >= 80%"

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
    bestScore: null, // { score, accuracy, trials, correct, wrong, medianCorrectRT, date }
    bestAccuracy: null, // { accuracy, date }
    bestTrialCount: null, // { trials, date }
    bestMedianCorrectRT: null, // { medianCorrectRT, accuracy, date } — accuracy >= 80% completions only
    completions: [], // capped samples used for avg/median
  }
}

// SPEC §21 tie-breakers for equal score: higher accuracy, then more correct
// trials, then lower median correct RT.
function isBetterScore(candidate, current) {
  if (!current) return true
  if (candidate.score !== current.score) return candidate.score > current.score
  if (candidate.accuracy !== current.accuracy) return candidate.accuracy > current.accuracy
  if (candidate.correct !== current.correct) return candidate.correct > current.correct
  return candidate.medianCorrectRT < current.medianCorrectRT
}

export function useOddOneOutStats() {
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
  // streak or other running state to reset for Odd One Out.
  function recordAbandon() {}

  // result: game.results value — { score, trials, correct, wrong, accuracy,
  // avgCorrectRT, medianCorrectRT, fastestCorrectRT, slowestCorrectRT,
  // duration, timeLimit, timedOut }
  function recordCompletion(difficultyKey, result) {
    const stats = getStats(difficultyKey)
    stats.completed += 1

    const date = new Date().toISOString()

    let isNewBestScore = false
    let isNewBestAccuracy = false
    let isNewBestTrialCount = false
    let isNewBestMedianRT = false

    const scoreCandidate = {
      score: result.score,
      accuracy: result.accuracy,
      trials: result.trials,
      correct: result.correct,
      wrong: result.wrong,
      medianCorrectRT: result.medianCorrectRT,
      date,
    }
    if (isBetterScore(scoreCandidate, stats.bestScore)) {
      stats.bestScore = scoreCandidate
      isNewBestScore = true
    }

    if (!stats.bestAccuracy || result.accuracy > stats.bestAccuracy.accuracy) {
      stats.bestAccuracy = { accuracy: result.accuracy, date }
      isNewBestAccuracy = true
    }

    if (!stats.bestTrialCount || result.trials > stats.bestTrialCount.trials) {
      stats.bestTrialCount = { trials: result.trials, date }
      isNewBestTrialCount = true
    }

    if (
      result.correct > 0 &&
      result.accuracy >= RT_BEST_MIN_ACCURACY &&
      (!stats.bestMedianCorrectRT || result.medianCorrectRT < stats.bestMedianCorrectRT.medianCorrectRT)
    ) {
      stats.bestMedianCorrectRT = { medianCorrectRT: result.medianCorrectRT, accuracy: result.accuracy, date }
      isNewBestMedianRT = true
    }

    stats.completions.push({
      score: result.score,
      trials: result.trials,
      correct: result.correct,
      wrong: result.wrong,
      accuracy: result.accuracy,
      avgCorrectRT: result.avgCorrectRT,
      medianCorrectRT: result.medianCorrectRT,
    })
    stats.completions = stats.completions.slice(-MAX_STATS_SAMPLES)

    writeJSON(statsKeyFor(difficultyKey), stats)

    const history = readJSON(historyKeyFor(difficultyKey), [])
    history.push({
      difficulty: difficultyKey,
      score: result.score,
      trials: result.trials,
      correct: result.correct,
      wrong: result.wrong,
      accuracy: result.accuracy,
      avgCorrectRT: result.avgCorrectRT,
      medianCorrectRT: result.medianCorrectRT,
      fastestCorrectRT: result.fastestCorrectRT,
      slowestCorrectRT: result.slowestCorrectRT,
      duration: result.duration,
      completedAt: date,
      metricVersion: METRIC_VERSIONS.oddoneout,
      appVersion: __APP_VERSION__,
    })
    writeJSON(historyKeyFor(difficultyKey), history.slice(-MAX_HISTORY))

    return { isNewBestScore, isNewBestAccuracy, isNewBestTrialCount, isNewBestMedianRT }
  }

  function getDerivedStats(difficultyKey) {
    const stats = getStats(difficultyKey)
    return {
      ...stats,
      avgScore: avg(stats.completions.map((c) => c.score)),
      medianScore: median(stats.completions.map((c) => c.score)),
      avgAccuracy: avg(stats.completions.map((c) => c.accuracy)),
      avgTrials: avg(stats.completions.map((c) => c.trials)),
      medianTrials: median(stats.completions.map((c) => c.trials)),
      avgCorrectRT: avg(stats.completions.map((c) => c.avgCorrectRT)),
      medianCorrectRT: median(stats.completions.map((c) => c.medianCorrectRT)),
      totalCorrect: stats.completions.reduce((sum, c) => sum + c.correct, 0),
      totalWrong: stats.completions.reduce((sum, c) => sum + c.wrong, 0),
    }
  }

  // History is stored per difficulty (like switchtrail's), not combined —
  // there's no meaningful "all difficulties" view (SPEC §23).
  function getHistory(difficultyKey) {
    return readJSON(historyKeyFor(difficultyKey), [])
  }

  return { getStats, getDerivedStats, recordStart, recordAbandon, recordCompletion, getHistory }
}
