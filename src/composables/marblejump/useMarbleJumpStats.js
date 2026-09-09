import { avg, median } from '../mathStats.js'
import { METRIC_VERSIONS } from '../../constants/metricVersions.js'

const STATS_PREFIX = 'marblejump:stats:'
const HISTORY_KEY = 'marblejump:history'
const MAX_HISTORY = 30
const MAX_STATS_SAMPLES = 50 // per-difficulty sample cap for avg/median, separate from the 30-entry combined history

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
    cleanGames: 0,
    optimalCompletions: 0,
    currentStreak: 0,
    bestStreak: 0,
    bestResult: null, // { remaining, hints, undos, time, date } — best of any completion
    bestCleanResult: null, // same shape, hints === 0 completions only
    completions: [], // [{ remaining, moves, undos, hints, time, clean, optimal }], capped, used for avg/median
  }
}

// SPEC §17's Best comparison order: fewer marbles remaining, then fewer
// hints, then fewer undos, then faster completion.
function isBetterResult(candidate, current) {
  if (!current) return true
  if (candidate.remaining !== current.remaining) return candidate.remaining < current.remaining
  if (candidate.hints !== current.hints) return candidate.hints < current.hints
  if (candidate.undos !== current.undos) return candidate.undos < current.undos
  return candidate.time < current.time
}

export function useMarbleJumpStats() {
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

  // result: { puzzleId, startingMarbles, remainingMarbles, moves,
  //           completionTime, undos, hints, clean, optimalReached, score }
  function recordCompletion(difficultyKey, result) {
    const stats = getStats(difficultyKey)

    stats.completed += 1
    stats.currentStreak += 1
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak)
    if (result.clean) stats.cleanGames += 1
    if (result.optimalReached) stats.optimalCompletions += 1

    const sample = {
      remaining: result.remainingMarbles,
      moves: result.moves,
      undos: result.undos,
      hints: result.hints,
      time: result.completionTime,
      clean: result.clean,
      optimal: result.optimalReached,
    }
    stats.completions.push(sample)
    stats.completions = stats.completions.slice(-MAX_STATS_SAMPLES)

    let isNewBest = false
    let isNewCleanBest = false
    const candidate = {
      remaining: result.remainingMarbles,
      hints: result.hints,
      undos: result.undos,
      time: result.completionTime,
      date: new Date().toISOString(),
    }
    if (isBetterResult(candidate, stats.bestResult)) {
      stats.bestResult = candidate
      isNewBest = true
    }
    if (result.clean && isBetterResult(candidate, stats.bestCleanResult)) {
      stats.bestCleanResult = candidate
      isNewCleanBest = true
    }

    writeJSON(statsKeyFor(difficultyKey), stats)

    const history = readJSON(HISTORY_KEY, [])
    history.push({
      puzzleId: result.puzzleId,
      difficulty: difficultyKey,
      startingMarbles: result.startingMarbles,
      remainingMarbles: result.remainingMarbles,
      moves: result.moves,
      completionTime: result.completionTime,
      undos: result.undos,
      hints: result.hints,
      clean: result.clean,
      optimalReached: result.optimalReached,
      completedAt: new Date().toISOString(),
      metricVersion: METRIC_VERSIONS.marblejump,
      appVersion: __APP_VERSION__,
    })
    writeJSON(HISTORY_KEY, history.slice(-MAX_HISTORY))

    return { isNewBest, isNewCleanBest }
  }

  function getDerivedStats(difficultyKey) {
    const stats = getStats(difficultyKey)
    const remainings = stats.completions.map((c) => c.remaining)
    const bestRemaining = remainings.length ? Math.min(...remainings) : null
    const timesAtBestRemaining = stats.completions
      .filter((c) => c.remaining === bestRemaining)
      .map((c) => c.time)

    return {
      ...stats,
      completionRate: stats.started > 0 ? (stats.completed / stats.started) * 100 : 0,
      avgRemaining: avg(remainings),
      medianRemaining: median(remainings),
      avgMoves: avg(stats.completions.map((c) => c.moves)),
      avgUndos: avg(stats.completions.map((c) => c.undos)),
      bestTimeAtBestRemaining: timesAtBestRemaining.length ? Math.min(...timesAtBestRemaining) : null,
    }
  }

  function getHistory(difficultyFilter) {
    const history = readJSON(HISTORY_KEY, [])
    if (!difficultyFilter || difficultyFilter === 'all') return history
    return history.filter((h) => h.difficulty === difficultyFilter)
  }

  return { getStats, getDerivedStats, recordStart, recordAbandon, recordCompletion, getHistory }
}
