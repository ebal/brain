// Persistence for Emoji Mahjong — per-level bests/history plus the
// suite-wide progression state (Level-SPEC §40-43): highest unlocked
// level, completed levels, total stars, 3-star levels, clean completions,
// total play time. Deliberately no universal cognitive score. Mirrors
// hanoi/useHanoiStats.js and lightsout/useLightsOutStats.js.

import { avg, median } from '../mathStats.js'
import { METRIC_VERSIONS } from '../../constants/metricVersions.js'
import { EMOJIMAHJONG_LEVELS } from '../../constants/emojimahjong/levels.js'

const STATS_PREFIX = 'emojimahjong:stats:'
const HISTORY_PREFIX = 'emojimahjong:history:'
const PROGRESS_KEY = 'emojimahjong:progress'
const MAX_HISTORY = 30 // Level-SPEC §43
const MAX_STATS_SAMPLES = 50

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
    cleanCompletions: 0, // hints === 0
    best: null, // { stars, score, time, moves, mistakes, hints, undos, date } — best of any completion
    bestClean: null, // same shape, hints === 0 completions only
    completions: [], // capped samples used for avg/median
  }
}

function defaultProgress() {
  return {
    highestUnlocked: 1,
    completedLevels: [],
    totalStars: 0, // sum of each level's BEST star rating, recomputed on every new best
    threeStarLevels: 0,
    cleanCompletions: 0, // cumulative across every attempt, any level
    totalPlayTime: 0, // ms, cumulative across every completed attempt
  }
}

// Level-SPEC §40's Best comparison order: higher Stars, then no Hints, then
// higher Score, then fewer Undos, then faster Time — mirrors
// emojimahjong's own pre-existing isBetterResult() shape (board cleared,
// hints, score, undos, time) with Stars added at the front, since Stars is
// now the primary mastery signal (Level-SPEC §36).
function isBetterResult(candidate, current) {
  if (!current) return true
  if (candidate.stars !== current.stars) return candidate.stars > current.stars
  if (candidate.score !== current.score) return candidate.score > current.score
  if (candidate.undos !== current.undos) return candidate.undos < current.undos
  return candidate.time < current.time
}

export function useEmojiMahjongStats() {
  function getStats(level) {
    return readJSON(statsKeyFor(level), defaultStats())
  }

  function recordStart(level) {
    const stats = getStats(level)
    stats.started += 1
    writeJSON(statsKeyFor(level), stats)
  }

  // Kept symmetrical with every other game's stats composable — an
  // abandoned/exited attempt does not count as a completion.
  function recordAbandon() {}

  function getProgress() {
    return readJSON(PROGRESS_KEY, defaultProgress())
  }

  // result: game.results value — { level, layoutId, seed, tileCount, moves,
  // mistakes, hints, undos, completionTime, clean, stars, score }
  function recordCompletion(level, result) {
    const stats = getStats(level)
    stats.completed += 1
    if (result.clean) stats.cleanCompletions += 1

    const date = new Date().toISOString()
    const candidate = {
      stars: result.stars,
      score: result.score,
      time: result.completionTime,
      moves: result.moves,
      mistakes: result.mistakes,
      hints: result.hints,
      undos: result.undos,
      date,
    }

    let isNewBest = false
    if (isBetterResult(candidate, stats.best)) {
      stats.best = candidate
      isNewBest = true
    }

    let isNewCleanBest = false
    if (result.clean && isBetterResult(candidate, stats.bestClean)) {
      stats.bestClean = candidate
      isNewCleanBest = true
    }

    stats.completions.push({
      stars: result.stars,
      score: result.score,
      moves: result.moves,
      mistakes: result.mistakes,
      hints: result.hints,
      undos: result.undos,
      time: result.completionTime,
      clean: result.clean,
    })
    stats.completions = stats.completions.slice(-MAX_STATS_SAMPLES)
    writeJSON(statsKeyFor(level), stats)

    const history = readJSON(historyKeyFor(level), [])
    history.push({
      level,
      layoutId: result.layoutId,
      seed: result.seed,
      stars: result.stars,
      score: result.score,
      completionTime: result.completionTime,
      moves: result.moves,
      mistakes: result.mistakes,
      hints: result.hints,
      undos: result.undos,
      clean: result.clean,
      completedAt: date,
      metricVersion: METRIC_VERSIONS.emojimahjong,
      appVersion: __APP_VERSION__,
    })
    writeJSON(historyKeyFor(level), history.slice(-MAX_HISTORY))

    // Progression (Level-SPEC §6/§42): any completion — legal, not
    // necessarily optimal/starred — unlocks the next level.
    const progress = getProgress()
    const wasFirstCompletion = !progress.completedLevels.includes(level)
    if (wasFirstCompletion) progress.completedLevels.push(level)
    progress.highestUnlocked = Math.max(progress.highestUnlocked, Math.min(level + 1, EMOJIMAHJONG_LEVELS.length))
    if (result.clean) progress.cleanCompletions += 1
    progress.totalPlayTime += result.completionTime
    progress.totalStars = progress.completedLevels.reduce((sum, lvl) => sum + (getStats(lvl).best?.stars ?? 0), 0)
    progress.threeStarLevels = progress.completedLevels.filter((lvl) => getStats(lvl).best?.stars === 3).length
    writeJSON(PROGRESS_KEY, progress)

    return { isNewBest, isNewCleanBest }
  }

  function getDerivedStats(level) {
    const stats = getStats(level)
    return {
      ...stats,
      completionRate: stats.started > 0 ? (stats.completed / stats.started) * 100 : 0,
      avgScore: avg(stats.completions.map((c) => c.score)),
      medianScore: median(stats.completions.map((c) => c.score)),
      avgTime: avg(stats.completions.map((c) => c.time)),
      avgMoves: avg(stats.completions.map((c) => c.moves)),
      avgMistakes: avg(stats.completions.map((c) => c.mistakes)),
      avgHints: avg(stats.completions.map((c) => c.hints)),
      avgUndos: avg(stats.completions.map((c) => c.undos)),
    }
  }

  // History is stored per level, not combined — Level-SPEC §40: "Do not
  // compare Level 8 directly with Level 38 as though they are equivalent
  // tasks."
  function getHistory(level) {
    return readJSON(historyKeyFor(level), [])
  }

  return { getStats, getProgress, recordStart, recordAbandon, recordCompletion, getDerivedStats, getHistory }
}
