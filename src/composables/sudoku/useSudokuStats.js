import { avg, median } from '../mathStats.js'
import { METRIC_VERSIONS } from '../../constants/metricVersions.js'

const STATS_PREFIX = 'sudoku:stats:'
const HISTORY_KEY = 'sudoku:history'
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
    cleanSolves: 0,
    currentStreak: 0,
    bestStreak: 0,
    bestCleanTime: null, // { time, mistakes, date }
    completions: [], // [{ time, mistakes, hints }], capped, used for avg/median
  }
}

// Clean-best tie-break (SPEC §14): lower time, then fewer mistakes.
function isBetterCleanTime(candidate, current) {
  if (!current) return true
  if (candidate.time !== current.time) return candidate.time < current.time
  return candidate.mistakes < current.mistakes
}

export function useSudokuStats() {
  function getStats(difficultyKey) {
    return readJSON(statsKeyFor(difficultyKey), defaultStats())
  }

  function recordStart(difficultyKey) {
    const stats = getStats(difficultyKey)
    stats.started += 1
    writeJSON(statsKeyFor(difficultyKey), stats)
  }

  // Resets the current streak without counting a completion — for an
  // explicitly abandoned puzzle (SPEC §14: closing the browser or
  // continuing later must NOT reset the streak, only explicit abandon).
  function recordAbandon(difficultyKey) {
    const stats = getStats(difficultyKey)
    stats.currentStreak = 0
    writeJSON(statsKeyFor(difficultyKey), stats)
  }

  // result: { completionTime, mistakes, hints }
  function recordCompletion(difficultyKey, result) {
    const stats = getStats(difficultyKey)
    const cleanSolve = result.hints === 0

    stats.completed += 1
    stats.currentStreak += 1
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak)
    if (cleanSolve) stats.cleanSolves += 1

    stats.completions.push({ time: result.completionTime, mistakes: result.mistakes, hints: result.hints })
    stats.completions = stats.completions.slice(-MAX_STATS_SAMPLES)

    let isNewCleanBest = false
    if (cleanSolve) {
      const candidate = { time: result.completionTime, mistakes: result.mistakes, date: new Date().toISOString() }
      if (isBetterCleanTime(candidate, stats.bestCleanTime)) {
        stats.bestCleanTime = candidate
        isNewCleanBest = true
      }
    }

    writeJSON(statsKeyFor(difficultyKey), stats)

    const history = readJSON(HISTORY_KEY, [])
    history.push({
      puzzleId: result.puzzleId,
      difficulty: difficultyKey,
      completionTime: result.completionTime,
      mistakes: result.mistakes,
      hints: result.hints,
      cleanSolve,
      completedAt: new Date().toISOString(),
      metricVersion: METRIC_VERSIONS.sudoku,
      appVersion: __APP_VERSION__,
    })
    writeJSON(HISTORY_KEY, history.slice(-MAX_HISTORY))

    return {
      isNewCleanBest,
      completionRate: stats.started > 0 ? (stats.completed / stats.started) * 100 : 0,
      avgTime: avg(stats.completions.map((c) => c.time)),
      medianTime: median(stats.completions.map((c) => c.time)),
      avgMistakes: avg(stats.completions.map((c) => c.mistakes)),
      avgHints: avg(stats.completions.map((c) => c.hints)),
    }
  }

  function getDerivedStats(difficultyKey) {
    const stats = getStats(difficultyKey)
    return {
      ...stats,
      completionRate: stats.started > 0 ? (stats.completed / stats.started) * 100 : 0,
      avgTime: avg(stats.completions.map((c) => c.time)),
      medianTime: median(stats.completions.map((c) => c.time)),
      avgMistakes: avg(stats.completions.map((c) => c.mistakes)),
      avgHints: avg(stats.completions.map((c) => c.hints)),
    }
  }

  function getHistory(difficultyFilter) {
    const history = readJSON(HISTORY_KEY, [])
    if (!difficultyFilter || difficultyFilter === 'all') return history
    return history.filter((h) => h.difficulty === difficultyFilter)
  }

  return { getStats, getDerivedStats, recordStart, recordAbandon, recordCompletion, getHistory }
}
