import { avg, median } from '../mathStats.js'

const STATS_PREFIX = 'sequence-memory:stats:'
const HISTORY_KEY = 'sequence-memory:history'
const MAX_HISTORY = 30
const MAX_STATS_SAMPLES = 50 // per-difficulty sample cap for avg/median (separate from the 30-entry combined history)

function statsKeyFor(difficultyKey) {
  return `${STATS_PREFIX}${difficultyKey}`
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
    currentStreak: 0,
    bestStreak: 0,
    bestResult: null, // { longestSequence, mistakes, accuracy, medianTapTime, date }
    totalCorrectTaps: 0,
    totalMistakes: 0,
    completions: [], // [{ longestSequence, highestLevel, accuracy, avgTapTime, medianTapTime }], capped
  }
}

// Personal-best comparison (SPEC §15): longest sequence, then fewer
// mistakes, then higher accuracy, then lower median correct tap time.
function isBetterResult(candidate, current) {
  if (!current) return true
  if (candidate.longestSequence !== current.longestSequence) return candidate.longestSequence > current.longestSequence
  if (candidate.mistakes !== current.mistakes) return candidate.mistakes < current.mistakes
  if (candidate.accuracy !== current.accuracy) return candidate.accuracy > current.accuracy
  return candidate.medianTapTime < current.medianTapTime
}

export function useMemoryStats() {
  function getStats(difficultyKey) {
    return readJSON(statsKeyFor(difficultyKey), defaultStats())
  }

  function recordStart(difficultyKey) {
    const stats = getStats(difficultyKey)
    stats.started += 1
    writeJSON(statsKeyFor(difficultyKey), stats)
  }

  // Resets the current streak without counting a completion — for an
  // explicitly abandoned game (closing the browser or continuing later must
  // NOT reset the streak, only explicit abandon).
  function recordAbandon(difficultyKey) {
    const stats = getStats(difficultyKey)
    stats.currentStreak = 0
    writeJSON(statsKeyFor(difficultyKey), stats)
  }

  // result: { highestLevel, longestSequence, correctTaps, mistakes, accuracy, avgTapTime, medianTapTime, duration }
  function recordCompletion(difficultyKey, result) {
    const stats = getStats(difficultyKey)

    stats.completed += 1
    stats.currentStreak += 1
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak)
    stats.totalCorrectTaps += result.correctTaps
    stats.totalMistakes += result.mistakes

    stats.completions.push({
      longestSequence: result.longestSequence,
      highestLevel: result.highestLevel,
      accuracy: result.accuracy,
      avgTapTime: result.avgTapTime,
      medianTapTime: result.medianTapTime,
    })
    stats.completions = stats.completions.slice(-MAX_STATS_SAMPLES)

    let isNewBest = false
    const candidate = {
      longestSequence: result.longestSequence,
      mistakes: result.mistakes,
      accuracy: result.accuracy,
      medianTapTime: result.medianTapTime,
      date: new Date().toISOString(),
    }
    if (isBetterResult(candidate, stats.bestResult)) {
      stats.bestResult = candidate
      isNewBest = true
    }

    writeJSON(statsKeyFor(difficultyKey), stats)

    const history = readJSON(HISTORY_KEY, [])
    history.push({
      difficulty: difficultyKey,
      highestLevel: result.highestLevel,
      longestSequence: result.longestSequence,
      correctTaps: result.correctTaps,
      mistakes: result.mistakes,
      accuracy: result.accuracy,
      avgTapTime: result.avgTapTime,
      medianTapTime: result.medianTapTime,
      duration: result.duration,
      completedAt: new Date().toISOString(),
    })
    writeJSON(HISTORY_KEY, history.slice(-MAX_HISTORY))

    return { isNewBest }
  }

  function getDerivedStats(difficultyKey) {
    const stats = getStats(difficultyKey)
    return {
      ...stats,
      avgLongestSequence: avg(stats.completions.map((c) => c.longestSequence)),
      medianLongestSequence: median(stats.completions.map((c) => c.longestSequence)),
      highestLevelEver: stats.completions.length ? Math.max(...stats.completions.map((c) => c.highestLevel)) : 0,
      avgAccuracy: avg(stats.completions.map((c) => c.accuracy)),
      avgTapTime: avg(stats.completions.map((c) => c.avgTapTime)),
      medianTapTime: median(stats.completions.map((c) => c.medianTapTime)),
    }
  }

  function getHistory(difficultyFilter) {
    const history = readJSON(HISTORY_KEY, [])
    if (!difficultyFilter || difficultyFilter === 'all') return history
    return history.filter((h) => h.difficulty === difficultyFilter)
  }

  return { getStats, getDerivedStats, recordStart, recordAbandon, recordCompletion, getHistory }
}
