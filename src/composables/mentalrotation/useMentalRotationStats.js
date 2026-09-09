import { avg, median } from '../mathStats.js'
import { METRIC_VERSIONS } from '../../constants/metricVersions.js'

const STATS_PREFIX = 'mentalrotation:stats:'
const HISTORY_PREFIX = 'mentalrotation:history'
const MAX_HISTORY = 30
const MAX_STATS_SAMPLES = 50 // per-difficulty sample cap for avg/median, separate from the 30-entry combined history
const RT_ELIGIBILITY_ACCURACY = 80 // SPEC §22: a round must hit >=80% accuracy to be eligible for Best Median RT

// 'timed' keeps the original, pre-existing key shape (`mentalrotation:stats:<difficultyKey>`,
// `mentalrotation:history`) so nobody's already-saved timed bests/history
// change format or go missing now that the untimed mode exists — same
// convention as schulte/useBestTimes.js's 'classic' default.
function statsKeyFor(difficultyKey, modeKey = 'timed') {
  return modeKey === 'timed' ? `${STATS_PREFIX}${difficultyKey}` : `${STATS_PREFIX}${modeKey}:${difficultyKey}`
}

function historyKeyFor(modeKey = 'timed') {
  return modeKey === 'timed' ? HISTORY_PREFIX : `${HISTORY_PREFIX}:${modeKey}`
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
    totalTrials: 0,
    totalCorrect: 0,
    totalWrong: 0,
    bestScore: null, // { score, accuracy, medianRT, correct, date }
    bestAccuracy: null, // { accuracy, score, date }
    bestMedianRT: null, // { medianRT, accuracy, date } — only from >=80%-accuracy rounds
    completions: [], // [{ score, accuracy, medianRT, avgRT }], capped, used for avg/median
  }
}

// SPEC §22 tie-break for equal scores: higher accuracy, then lower median
// correct RT, then more correct answers.
function isBetterScore(candidate, current) {
  if (!current) return true
  if (candidate.score !== current.score) return candidate.score > current.score
  if (candidate.accuracy !== current.accuracy) return candidate.accuracy > current.accuracy
  if (candidate.medianRT !== current.medianRT) return candidate.medianRT < current.medianRT
  return candidate.correct > current.correct
}

export function useMentalRotationStats() {
  function getStats(difficultyKey, modeKey = 'timed') {
    return readJSON(statsKeyFor(difficultyKey, modeKey), defaultStats())
  }

  function recordStart(difficultyKey, modeKey = 'timed') {
    const stats = getStats(difficultyKey, modeKey)
    stats.started += 1
    writeJSON(statsKeyFor(difficultyKey, modeKey), stats)
  }

  // result: { mode, score, accuracy, correct, wrong, trialsCompleted, avgRT, medianRT, duration }
  function recordCompletion(difficultyKey, result) {
    const modeKey = result.mode || 'timed'
    const stats = getStats(difficultyKey, modeKey)

    stats.completed += 1
    stats.totalTrials += result.trialsCompleted
    stats.totalCorrect += result.correct
    stats.totalWrong += result.wrong

    stats.completions.push({
      score: result.score,
      accuracy: result.accuracy,
      medianRT: result.medianRT,
      avgRT: result.avgRT,
    })
    stats.completions = stats.completions.slice(-MAX_STATS_SAMPLES)

    let isNewBestScore = false
    let isNewBestAccuracy = false
    let isNewBestMedianRT = false

    const scoreCandidate = {
      score: result.score,
      accuracy: result.accuracy,
      medianRT: result.medianRT,
      correct: result.correct,
      date: new Date().toISOString(),
    }
    if (isBetterScore(scoreCandidate, stats.bestScore)) {
      stats.bestScore = scoreCandidate
      isNewBestScore = true
    }

    if (!stats.bestAccuracy || result.accuracy > stats.bestAccuracy.accuracy) {
      stats.bestAccuracy = { accuracy: result.accuracy, score: result.score, date: new Date().toISOString() }
      isNewBestAccuracy = true
    }

    if (result.accuracy >= RT_ELIGIBILITY_ACCURACY && result.medianRT > 0) {
      if (!stats.bestMedianRT || result.medianRT < stats.bestMedianRT.medianRT) {
        stats.bestMedianRT = { medianRT: result.medianRT, accuracy: result.accuracy, date: new Date().toISOString() }
        isNewBestMedianRT = true
      }
    }

    writeJSON(statsKeyFor(difficultyKey, modeKey), stats)

    const history = readJSON(historyKeyFor(modeKey), [])
    history.push({
      difficulty: difficultyKey,
      mode: modeKey,
      score: result.score,
      accuracy: result.accuracy,
      correct: result.correct,
      wrong: result.wrong,
      trialsCompleted: result.trialsCompleted,
      avgRT: result.avgRT,
      medianRT: result.medianRT,
      duration: result.duration,
      completedAt: new Date().toISOString(),
      metricVersion: METRIC_VERSIONS.mentalrotation,
      appVersion: __APP_VERSION__,
    })
    writeJSON(historyKeyFor(modeKey), history.slice(-MAX_HISTORY))

    return { isNewBestScore, isNewBestAccuracy, isNewBestMedianRT }
  }

  function getDerivedStats(difficultyKey, modeKey = 'timed') {
    const stats = getStats(difficultyKey, modeKey)
    return {
      ...stats,
      avgScore: avg(stats.completions.map((c) => c.score)),
      medianScore: median(stats.completions.map((c) => c.score)),
      avgAccuracy: avg(stats.completions.map((c) => c.accuracy)),
      avgMedianRT: avg(stats.completions.map((c) => c.medianRT).filter((v) => v > 0)),
    }
  }

  function getHistory(difficultyFilter, modeKey = 'timed') {
    const history = readJSON(historyKeyFor(modeKey), [])
    if (!difficultyFilter || difficultyFilter === 'all') return history
    return history.filter((h) => h.difficulty === difficultyFilter)
  }

  return { getStats, getDerivedStats, recordStart, recordCompletion, getHistory }
}
