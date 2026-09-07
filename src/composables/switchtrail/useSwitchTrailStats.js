// Persistence for Switch Trail — best score, best completion time, rolling
// history, and derived statistics, all keyed per difficulty (SPEC §16-18).
// Follows the same read/write shape as set/useSetStats.js and
// schulte/useBestTimes.js + useScoreHistory.js.

import { avg, median } from '../mathStats.js'

const STATS_PREFIX = 'switchtrail:stats:'
const HISTORY_PREFIX = 'switchtrail:history:'
const MAX_HISTORY = 30 // SPEC §17
const MAX_STATS_SAMPLES = 50 // per-difficulty sample cap for avg/median, separate from the 30-entry history

// 'classic' keeps the original, pre-existing key shape
// (`switchtrail:stats:<difficulty>` / `switchtrail:history:<difficulty>`) so
// nobody's already-saved plain-Switch-Trail stats/history change format when
// the Random Color variant is added. Mirrors schulte/useBestTimes.js.
function statsKeyFor(difficultyKey, variantKey = 'classic') {
  return variantKey === 'classic'
    ? `${STATS_PREFIX}${difficultyKey}`
    : `${STATS_PREFIX}${variantKey}:${difficultyKey}`
}

function historyKeyFor(difficultyKey, variantKey = 'classic') {
  return variantKey === 'classic'
    ? `${HISTORY_PREFIX}${difficultyKey}`
    : `${HISTORY_PREFIX}${variantKey}:${difficultyKey}`
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
    cleanCompletions: 0,
    totalTargetsCompleted: 0,
    bestScore: null, // { score, completed, errors, completionTime, accuracy, date }
    bestCompletionTime: null, // { completionTime, score, errors, accuracy, date } — completed rounds only
    completions: [], // capped samples used for avg/median
  }
}

// SPEC §16 tie-breakers for equal score: completed beats timed-out, then
// fewer errors, then lower completion time, then higher accuracy.
function isBetterScore(candidate, current) {
  if (!current) return true
  if (candidate.score !== current.score) return candidate.score > current.score
  if (candidate.completed !== current.completed) return candidate.completed
  if (candidate.errors !== current.errors) return candidate.errors < current.errors
  if (candidate.completionTime !== current.completionTime) return candidate.completionTime < current.completionTime
  return candidate.accuracy > current.accuracy
}

function isBetterCompletionTime(candidate, current) {
  return !current || candidate.completionTime < current.completionTime
}

export function useSwitchTrailStats() {
  function getStats(difficultyKey, variantKey = 'classic') {
    return readJSON(statsKeyFor(difficultyKey, variantKey), defaultStats())
  }

  function recordStart(difficultyKey, variantKey = 'classic') {
    const stats = getStats(difficultyKey, variantKey)
    stats.started += 1
    writeJSON(statsKeyFor(difficultyKey, variantKey), stats)
  }

  // result: game.results value — { score, completed, targetsCompleted,
  // totalTargets, completionTime, errors, accuracy, avgTransitionTime,
  // medianTransitionTime }
  function recordCompletion(difficultyKey, result, variantKey = 'classic') {
    const stats = getStats(difficultyKey, variantKey)

    if (result.completed) {
      stats.completed += 1
      if (result.errors === 0) stats.cleanCompletions += 1
    }
    stats.totalTargetsCompleted += result.targetsCompleted

    const date = new Date().toISOString()

    let isNewBestScore = false
    const scoreCandidate = {
      score: result.score,
      completed: result.completed,
      errors: result.errors,
      completionTime: result.completionTime,
      accuracy: result.accuracy,
      date,
    }
    if (isBetterScore(scoreCandidate, stats.bestScore)) {
      stats.bestScore = scoreCandidate
      isNewBestScore = true
    }

    let isNewBestCompletionTime = false
    if (result.completed) {
      const timeCandidate = {
        completionTime: result.completionTime,
        score: result.score,
        errors: result.errors,
        accuracy: result.accuracy,
        date,
      }
      if (isBetterCompletionTime(timeCandidate, stats.bestCompletionTime)) {
        stats.bestCompletionTime = timeCandidate
        isNewBestCompletionTime = true
      }
    }

    stats.completions.push({
      score: result.score,
      completed: result.completed,
      errors: result.errors,
      accuracy: result.accuracy,
      completionTime: result.completionTime,
      avgTransitionTime: result.avgTransitionTime,
      medianTransitionTime: result.medianTransitionTime,
    })
    stats.completions = stats.completions.slice(-MAX_STATS_SAMPLES)

    writeJSON(statsKeyFor(difficultyKey, variantKey), stats)

    const history = readJSON(historyKeyFor(difficultyKey, variantKey), [])
    history.push({
      difficulty: difficultyKey,
      score: result.score,
      completed: result.completed,
      targetsCompleted: result.targetsCompleted,
      totalTargets: result.totalTargets,
      completionTime: result.completionTime,
      timeLimit: result.timeLimit,
      errors: result.errors,
      accuracy: result.accuracy,
      avgTransitionTime: result.avgTransitionTime,
      medianTransitionTime: result.medianTransitionTime,
      fastestTransition: result.fastestTransition,
      slowestTransition: result.slowestTransition,
      completedAt: date,
    })
    writeJSON(historyKeyFor(difficultyKey, variantKey), history.slice(-MAX_HISTORY))

    return { isNewBestScore, isNewBestCompletionTime }
  }

  function getDerivedStats(difficultyKey, variantKey = 'classic') {
    const stats = getStats(difficultyKey, variantKey)
    const completedSamples = stats.completions.filter((c) => c.completed)
    return {
      ...stats,
      completionRate: stats.started > 0 ? (stats.completed / stats.started) * 100 : 0,
      avgScore: avg(stats.completions.map((c) => c.score)),
      medianScore: median(stats.completions.map((c) => c.score)),
      avgCompletionTime: avg(completedSamples.map((c) => c.completionTime)),
      medianCompletionTime: median(completedSamples.map((c) => c.completionTime)),
      avgErrors: avg(stats.completions.map((c) => c.errors)),
      avgAccuracy: avg(stats.completions.map((c) => c.accuracy)),
      avgTransitionTime: avg(stats.completions.map((c) => c.avgTransitionTime)),
      medianTransitionTime: avg(stats.completions.map((c) => c.medianTransitionTime)),
    }
  }

  // History is stored per difficulty (like schulte/useScoreHistory.js) rather
  // than one combined key — Switch Trail's difficulties aren't comparable on
  // the same scale (SPEC §18: "Do not combine difficulties into a universal
  // score"), so there's no meaningful "all difficulties" history view.
  function getHistory(difficultyKey, variantKey = 'classic') {
    return readJSON(historyKeyFor(difficultyKey, variantKey), [])
  }

  return { getStats, getDerivedStats, recordStart, recordCompletion, getHistory }
}
