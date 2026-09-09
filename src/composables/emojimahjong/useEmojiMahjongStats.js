import { avg, median } from '../mathStats.js'
import { METRIC_VERSIONS } from '../../constants/metricVersions.js'

const STATS_PREFIX = 'emojimahjong:stats:'
const HISTORY_KEY = 'emojimahjong:history'
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
    currentStreak: 0,
    bestStreak: 0,
    bestResult: null, // { score, time, undos, hints, date } — best of any cleared completion
    bestCleanResult: null, // same shape, hints === 0 completions only
    completions: [], // [{ score, moves, mistakes, undos, hints, time, clean }], capped, used for avg/median
  }
}

// SPEC §22's Best comparison order: board cleared (only cleared games are
// ever recorded as completions at all — see recordCompletion), then no
// hints, then higher score, then fewer undos, then faster time.
function isBetterResult(candidate, current) {
  if (!current) return true
  if (candidate.score !== current.score) return candidate.score > current.score
  if (candidate.undos !== current.undos) return candidate.undos < current.undos
  return candidate.time < current.time
}

export function useEmojiMahjongStats() {
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

  // result: { layoutId, difficulty, score, completionTime, moves, mistakes,
  //           hints, undos, clean } — only called for a cleared board
  // (SPEC §21: "Only cleared boards receive a final score/personal-best
  // eligibility").
  function recordCompletion(difficultyKey, result) {
    const stats = getStats(difficultyKey)

    stats.completed += 1
    stats.currentStreak += 1
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak)
    if (result.clean) stats.cleanGames += 1

    const sample = {
      score: result.score,
      moves: result.moves,
      mistakes: result.mistakes,
      undos: result.undos,
      hints: result.hints,
      time: result.completionTime,
      clean: result.clean,
    }
    stats.completions.push(sample)
    stats.completions = stats.completions.slice(-MAX_STATS_SAMPLES)

    let isNewBest = false
    let isNewCleanBest = false
    const candidate = {
      score: result.score,
      time: result.completionTime,
      undos: result.undos,
      hints: result.hints,
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
      layoutId: result.layoutId,
      difficulty: difficultyKey,
      seed: result.seed,
      score: result.score,
      completionTime: result.completionTime,
      moves: result.moves,
      mistakes: result.mistakes,
      hints: result.hints,
      undos: result.undos,
      clean: result.clean,
      completedAt: new Date().toISOString(),
      metricVersion: METRIC_VERSIONS.emojimahjong,
      appVersion: __APP_VERSION__,
    })
    writeJSON(HISTORY_KEY, history.slice(-MAX_HISTORY))

    return { isNewBest, isNewCleanBest }
  }

  function getDerivedStats(difficultyKey) {
    const stats = getStats(difficultyKey)
    const scores = stats.completions.map((c) => c.score)

    return {
      ...stats,
      completionRate: stats.started > 0 ? (stats.completed / stats.started) * 100 : 0,
      avgScore: avg(scores),
      medianScore: median(scores),
      avgTime: avg(stats.completions.map((c) => c.time)),
      avgMoves: avg(stats.completions.map((c) => c.moves)),
      avgMistakes: avg(stats.completions.map((c) => c.mistakes)),
      avgHints: avg(stats.completions.map((c) => c.hints)),
      avgUndos: avg(stats.completions.map((c) => c.undos)),
    }
  }

  function getHistory(difficultyFilter) {
    const history = readJSON(HISTORY_KEY, [])
    if (!difficultyFilter || difficultyFilter === 'all') return history
    return history.filter((h) => h.difficulty === difficultyFilter)
  }

  return { getStats, getDerivedStats, recordStart, recordAbandon, recordCompletion, getHistory }
}
