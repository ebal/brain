// Persistence for Lights Out — per-level bests/history plus the suite-wide
// progression state (SPEC "Progress/history"): highest unlocked level,
// completed levels, total stars, optimal completions, total moves/hints/
// play time. Deliberately no universal cognitive score. Mirrors
// hanoi/useHanoiStats.js, minus a Mistakes concept (Lights Out has none —
// every tap is always legal, SPEC "Interaction").

import { LIGHTSOUT_LEVELS } from '../../constants/lightsout/levels.js'
import { METRIC_VERSIONS } from '../../constants/metricVersions.js'

const STATS_PREFIX = 'lightsout:stats:'
const HISTORY_PREFIX = 'lightsout:history:'
const PROGRESS_KEY = 'lightsout:progress'
const MAX_HISTORY = 30

function statsKeyFor(level) {
  return `${STATS_PREFIX}${level}`
}

function historyKeyFor(level) {
  return `${HISTORY_PREFIX}${level}`
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
    best: null, // { moves, efficiency, stars, undos, hints, duration, date } — best of any attempt
    bestClean: null, // same shape, hints === 0 completions only
    completions: [], // capped samples
  }
}

function defaultProgress() {
  return {
    highestUnlocked: 1,
    completedLevels: [],
    totalStars: 0, // sum of each level's BEST star rating, recomputed on every new best
    optimalCompletions: 0, // cumulative count of attempts that hit the exact optimal move count
    totalMoves: 0,
    totalHints: 0,
    totalPlayTime: 0, // ms
  }
}

// SPEC "Progress/history": best Moves, then (not spec-mandated, but the
// same reasonable order hanoi/useHanoiStats.js uses minus Mistakes) fewer
// Hints, fewer Undos, then lower Time for genuinely equivalent results.
function isBetter(candidate, current) {
  if (!current) return true
  if (candidate.moves !== current.moves) return candidate.moves < current.moves
  if (candidate.hints !== current.hints) return candidate.hints < current.hints
  if (candidate.undos !== current.undos) return candidate.undos < current.undos
  return candidate.duration < current.duration
}

export function useLightsOutStats() {
  function getStats(level) {
    return readJSON(statsKeyFor(level), defaultStats())
  }

  function recordStart(level) {
    const stats = getStats(level)
    stats.started += 1
    writeJSON(statsKeyFor(level), stats)
  }

  function recordAbandon() {}

  function getProgress() {
    return readJSON(PROGRESS_KEY, defaultProgress())
  }

  // result: game.results value — { level, size, moves, optimalMoves,
  // efficiency, stars, undos, hints, duration, clean }
  function recordCompletion(level, result) {
    const stats = getStats(level)
    stats.completed += 1

    const date = new Date().toISOString()
    const candidate = {
      moves: result.moves,
      efficiency: result.efficiency,
      stars: result.stars,
      undos: result.undos,
      hints: result.hints,
      duration: result.duration,
      date,
    }

    let isNewBest = false
    if (isBetter(candidate, stats.best)) {
      stats.best = candidate
      isNewBest = true
    }

    let isNewBestClean = false
    if (result.hints === 0 && isBetter(candidate, stats.bestClean)) {
      stats.bestClean = candidate
      isNewBestClean = true
    }

    stats.completions.push(candidate)
    stats.completions = stats.completions.slice(-50)
    writeJSON(statsKeyFor(level), stats)

    const history = readJSON(historyKeyFor(level), [])
    history.push({
      level,
      size: result.size,
      moves: result.moves,
      optimalMoves: result.optimalMoves,
      efficiency: result.efficiency,
      stars: result.stars,
      undos: result.undos,
      hints: result.hints,
      duration: result.duration,
      completedAt: date,
      metricVersion: METRIC_VERSIONS.lightsout,
      appVersion: __APP_VERSION__,
    })
    writeJSON(historyKeyFor(level), history.slice(-MAX_HISTORY))

    // Progression (SPEC "Progression"/"Progress/history"): completion,
    // legal or not, unlocks the next level.
    const progress = getProgress()
    const wasFirstCompletion = !progress.completedLevels.includes(level)
    if (wasFirstCompletion) progress.completedLevels.push(level)
    progress.highestUnlocked = Math.max(progress.highestUnlocked, Math.min(level + 1, LIGHTSOUT_LEVELS.length))
    if (result.moves === result.optimalMoves) progress.optimalCompletions += 1
    progress.totalMoves += result.moves
    progress.totalHints += result.hints
    progress.totalPlayTime += result.duration
    progress.totalStars = progress.completedLevels.reduce((sum, lvl) => sum + (getStats(lvl).best?.stars ?? 0), 0)
    writeJSON(PROGRESS_KEY, progress)

    return { isNewBest, isNewBestClean }
  }

  function getHistory(level) {
    return readJSON(historyKeyFor(level), [])
  }

  return { getStats, getProgress, recordStart, recordAbandon, recordCompletion, getHistory }
}
