// Persistence for Whack-a-Mole — per-level bests/history plus the
// suite-wide progression state (SPEC §18): highest unlocked level, stars,
// completed levels, aggregate outcome counts, and play time. Mirrors
// hanoi/useHanoiStats.js and lightsout/useLightsOutStats.js; there's no
// autosave composable here (SPEC §19 — mid-level persistence is optional
// for a game this short), so this is the only storage this game needs.

import { WHACKAMOLE_LEVELS } from '../../constants/whackamole/levels.js'
import { METRIC_VERSIONS } from '../../constants/metricVersions.js'

const STATS_PREFIX = 'whackamole:stats:'
const HISTORY_PREFIX = 'whackamole:history:'
const PROGRESS_KEY = 'whackamole:progress'
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
    best: null, // { stars, score, hitRate, falseAlarmRate, emptyTaps, medianHitRT, date } — best of any attempt
    completions: [], // capped samples
  }
}

function defaultProgress() {
  return {
    highestUnlocked: 1,
    completedLevels: [],
    totalStars: 0, // sum of each level's BEST star rating, recomputed on every new best
    totalHits: 0,
    totalMisses: 0,
    totalFalseAlarms: 0,
    totalCorrectRejections: 0,
    totalEmptyTaps: 0,
    totalPlayTime: 0, // ms
  }
}

// SPEC §18: Stars first, then Score, then (not spec-mandated, but the same
// reasonable tie-break every other game's stats composable uses) a lower
// Median Hit RT for genuinely equivalent results.
function isBetter(candidate, current) {
  if (!current) return true
  if (candidate.stars !== current.stars) return candidate.stars > current.stars
  if (candidate.score !== current.score) return candidate.score > current.score
  return candidate.medianHitRT < current.medianHitRT
}

export function useWhackAMoleStats() {
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

  // result: game.results value — { level, gridSize, score, totalStimuli,
  // targets, distractors, hits, misses, falseAlarms, correctRejections,
  // emptyTaps, hitRate, falseAlarmRate, avgHitRT, medianHitRT,
  // fastestHitRT, stars, duration }
  function recordCompletion(level, result) {
    const stats = getStats(level)
    stats.completed += 1

    const date = new Date().toISOString()
    const candidate = {
      stars: result.stars,
      score: result.score,
      hitRate: result.hitRate,
      falseAlarmRate: result.falseAlarmRate,
      emptyTaps: result.emptyTaps,
      medianHitRT: result.medianHitRT,
      date,
    }

    let isNewBest = false
    if (isBetter(candidate, stats.best)) {
      stats.best = candidate
      isNewBest = true
    }

    stats.completions.push(candidate)
    stats.completions = stats.completions.slice(-50)
    writeJSON(statsKeyFor(level), stats)

    const history = readJSON(historyKeyFor(level), [])
    history.push({
      level,
      gridSize: result.gridSize,
      score: result.score,
      hits: result.hits,
      misses: result.misses,
      falseAlarms: result.falseAlarms,
      correctRejections: result.correctRejections,
      emptyTaps: result.emptyTaps,
      hitRate: result.hitRate,
      falseAlarmRate: result.falseAlarmRate,
      medianHitRT: result.medianHitRT,
      stars: result.stars,
      duration: result.duration,
      completedAt: date,
      metricVersion: METRIC_VERSIONS.whackamole,
      appVersion: __APP_VERSION__,
    })
    writeJSON(historyKeyFor(level), history.slice(-MAX_HISTORY))

    // Progression (SPEC §16/§18): completion, mistakes or not, unlocks the
    // next level — stars measure mastery but never gate it.
    const progress = getProgress()
    const wasFirstCompletion = !progress.completedLevels.includes(level)
    if (wasFirstCompletion) progress.completedLevels.push(level)
    progress.highestUnlocked = Math.max(progress.highestUnlocked, Math.min(level + 1, WHACKAMOLE_LEVELS.length))
    progress.totalHits += result.hits
    progress.totalMisses += result.misses
    progress.totalFalseAlarms += result.falseAlarms
    progress.totalCorrectRejections += result.correctRejections
    progress.totalEmptyTaps += result.emptyTaps
    progress.totalPlayTime += result.duration
    progress.totalStars = progress.completedLevels.reduce((sum, lvl) => sum + (getStats(lvl).best?.stars ?? 0), 0)
    writeJSON(PROGRESS_KEY, progress)

    return { isNewBest }
  }

  function getHistory(level) {
    return readJSON(historyKeyFor(level), [])
  }

  return { getStats, getProgress, recordStart, recordAbandon, recordCompletion, getHistory }
}
