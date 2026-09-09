import { avg, median } from '../mathStats.js'
import { METRIC_VERSIONS } from '../../constants/metricVersions.js'

const STATS_PREFIX = 'numbermatch:stats:'
const HISTORY_KEY = 'numbermatch:history'
const MAX_HISTORY = 30 // SPEC §22
const MAX_STATS_SAMPLES = 50 // per-difficulty sample cap for avg/median, separate from the 30-entry history

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
    completed: 0, // cleared boards only
    cleanCompletions: 0,
    totalPairsRemoved: 0,
    bestScore: null, // { score, cleared, date } — best of any attempt (SPEC §21)
    bestCleanScore: null, // { score, date } — cleared AND hints === 0
    bestClearTime: null, // { completionTime, score, date } — cleared attempts only
    completions: [], // capped samples used for avg/median
  }
}

// No explicit tie-break given in SPEC §16/§21 beyond "higher score" — mirrors
// switchtrail/useSwitchTrailStats.js's shape (cleared beats not, then fewer
// undos, then faster time) since Number Match's result shape is closest to
// Switch Trail's (score + cleared/not + completion time).
function isBetterScore(candidate, current) {
  if (!current) return true
  if (candidate.score !== current.score) return candidate.score > current.score
  if (candidate.cleared !== current.cleared) return candidate.cleared
  if (candidate.undos !== current.undos) return candidate.undos < current.undos
  return candidate.completionTime < current.completionTime
}

export function useNumberMatchStats() {
  function getStats(difficultyKey) {
    return readJSON(statsKeyFor(difficultyKey), defaultStats())
  }

  function recordStart(difficultyKey) {
    const stats = getStats(difficultyKey)
    stats.started += 1
    writeJSON(statsKeyFor(difficultyKey), stats)
  }

  // Resets nothing but is kept symmetrical with every other game's stats
  // composable — an abandoned/exited attempt does not count as a completion.
  function recordAbandon() {
    // No streak or other running state to reset for Number Match currently.
  }

  // result: { difficulty, seed, cleared, startingCells, numbersRemaining,
  //           pairsRemoved, score, completionTime, moves, mistakes,
  //           addNumbersUsed, hints, undos, clean }
  function recordCompletion(difficultyKey, result) {
    const stats = getStats(difficultyKey)

    if (result.cleared) stats.completed += 1
    if (result.clean) stats.cleanCompletions += 1
    stats.totalPairsRemoved += result.pairsRemoved

    const date = new Date().toISOString()

    let isNewBestScore = false
    let isNewBestCleanScore = false
    let isNewBestClearTime = false

    const scoreCandidate = {
      score: result.score,
      cleared: result.cleared,
      undos: result.undos,
      completionTime: result.completionTime,
      date,
    }
    if (isBetterScore(scoreCandidate, stats.bestScore)) {
      stats.bestScore = scoreCandidate
      isNewBestScore = true
    }

    if (result.clean && (!stats.bestCleanScore || result.score > stats.bestCleanScore.score)) {
      stats.bestCleanScore = { score: result.score, date }
      isNewBestCleanScore = true
    }

    if (result.cleared && (!stats.bestClearTime || result.completionTime < stats.bestClearTime.completionTime)) {
      stats.bestClearTime = { completionTime: result.completionTime, score: result.score, date }
      isNewBestClearTime = true
    }

    stats.completions.push({
      score: result.score,
      cleared: result.cleared,
      numbersRemaining: result.numbersRemaining,
      moves: result.moves,
      mistakes: result.mistakes,
      addNumbersUsed: result.addNumbersUsed,
      hints: result.hints,
      undos: result.undos,
      completionTime: result.completionTime,
    })
    stats.completions = stats.completions.slice(-MAX_STATS_SAMPLES)

    writeJSON(statsKeyFor(difficultyKey), stats)

    const history = readJSON(HISTORY_KEY, [])
    history.push({
      difficulty: difficultyKey,
      seed: result.seed,
      boardCleared: result.cleared,
      startingCells: result.startingCells,
      numbersRemaining: result.numbersRemaining,
      pairsRemoved: result.pairsRemoved,
      score: result.score,
      completionTime: result.completionTime,
      moves: result.moves,
      mistakes: result.mistakes,
      addNumbersUsed: result.addNumbersUsed,
      hints: result.hints,
      undos: result.undos,
      clean: result.clean,
      completedAt: date,
      metricVersion: METRIC_VERSIONS.numbermatch,
      appVersion: __APP_VERSION__,
    })
    writeJSON(HISTORY_KEY, history.slice(-MAX_HISTORY))

    return { isNewBestScore, isNewBestCleanScore, isNewBestClearTime }
  }

  function getDerivedStats(difficultyKey) {
    const stats = getStats(difficultyKey)
    const clearedSamples = stats.completions.filter((c) => c.cleared)
    return {
      ...stats,
      clearRate: stats.started > 0 ? (stats.completed / stats.started) * 100 : 0,
      avgScore: avg(stats.completions.map((c) => c.score)),
      medianScore: median(stats.completions.map((c) => c.score)),
      avgClearTime: avg(clearedSamples.map((c) => c.completionTime)),
      medianClearTime: median(clearedSamples.map((c) => c.completionTime)),
      avgNumbersRemaining: avg(stats.completions.map((c) => c.numbersRemaining)),
      avgMoves: avg(stats.completions.map((c) => c.moves)),
      avgMistakes: avg(stats.completions.map((c) => c.mistakes)),
      avgAddNumbersUsed: avg(stats.completions.map((c) => c.addNumbersUsed)),
    }
  }

  function getHistory(difficultyFilter) {
    const history = readJSON(HISTORY_KEY, [])
    if (!difficultyFilter || difficultyFilter === 'all') return history
    return history.filter((h) => h.difficulty === difficultyFilter)
  }

  return { getStats, getDerivedStats, recordStart, recordAbandon, recordCompletion, getHistory }
}
