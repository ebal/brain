// Persistence for Memory Pairs — best score/time/efficiency, rolling
// history, and derived statistics, all keyed per difficulty (SPEC §19-21).
// Follows the same combined stats+history shape as switchtrail/useSwitchTrailStats.js.

import { avg, median } from '../mathStats.js'
import { MEMORYPAIRS_DIFFICULTIES } from '../../constants/memorypairs/difficulties.js'

const STATS_PREFIX = 'memorypairs:stats:'
const HISTORY_PREFIX = 'memorypairs:history:'
const MAX_HISTORY = 30 // SPEC §20
const MAX_STATS_SAMPLES = 50 // per-difficulty sample cap for avg/median, separate from the 30-entry history

function statsKeyFor(difficultyKey) {
  return `${STATS_PREFIX}${difficultyKey}`
}

function historyKeyFor(difficultyKey) {
  return `${HISTORY_PREFIX}${difficultyKey}`
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
    totalPairsFound: 0,
    bestScore: null, // { score, moves, mistakes, completionTime, moveEfficiency, date }
    bestCompletionTime: null, // { completionTime, score, moves, mistakes, date }
    bestMoveEfficiency: null, // { moveEfficiency, score, completionTime, date }
    completions: [], // capped samples used for avg/median
  }
}

// SPEC §19 tie-breakers for equal score: fewer Moves, then fewer Mistakes,
// then faster completion.
function isBetterScore(candidate, current) {
  if (!current) return true
  if (candidate.score !== current.score) return candidate.score > current.score
  if (candidate.moves !== current.moves) return candidate.moves < current.moves
  if (candidate.mistakes !== current.mistakes) return candidate.mistakes < current.mistakes
  return candidate.completionTime < current.completionTime
}

function isBetterCompletionTime(candidate, current) {
  return !current || candidate.completionTime < current.completionTime
}

function isBetterMoveEfficiency(candidate, current) {
  return !current || candidate.moveEfficiency > current.moveEfficiency
}

export function useMemoryPairsStats() {
  function getStats(difficultyKey) {
    return readJSON(statsKeyFor(difficultyKey), defaultStats())
  }

  function recordStart(difficultyKey) {
    const stats = getStats(difficultyKey)
    stats.started += 1
    writeJSON(statsKeyFor(difficultyKey), stats)
  }

  // result: game.results value — { score, completionTime, moves, mistakes,
  // pairsFound, totalPairs, moveEfficiency }
  function recordCompletion(difficultyKey, result) {
    const stats = getStats(difficultyKey)

    stats.completed += 1
    stats.totalPairsFound += result.pairsFound

    const date = new Date().toISOString()

    let isNewBestScore = false
    const scoreCandidate = {
      score: result.score,
      moves: result.moves,
      mistakes: result.mistakes,
      completionTime: result.completionTime,
      moveEfficiency: result.moveEfficiency,
      date,
    }
    if (isBetterScore(scoreCandidate, stats.bestScore)) {
      stats.bestScore = scoreCandidate
      isNewBestScore = true
    }

    let isNewBestCompletionTime = false
    const timeCandidate = {
      completionTime: result.completionTime,
      score: result.score,
      moves: result.moves,
      mistakes: result.mistakes,
      date,
    }
    if (isBetterCompletionTime(timeCandidate, stats.bestCompletionTime)) {
      stats.bestCompletionTime = timeCandidate
      isNewBestCompletionTime = true
    }

    let isNewBestMoveEfficiency = false
    const efficiencyCandidate = {
      moveEfficiency: result.moveEfficiency,
      score: result.score,
      completionTime: result.completionTime,
      date,
    }
    if (isBetterMoveEfficiency(efficiencyCandidate, stats.bestMoveEfficiency)) {
      stats.bestMoveEfficiency = efficiencyCandidate
      isNewBestMoveEfficiency = true
    }

    stats.completions.push({
      score: result.score,
      completionTime: result.completionTime,
      moves: result.moves,
      mistakes: result.mistakes,
      moveEfficiency: result.moveEfficiency,
    })
    stats.completions = stats.completions.slice(-MAX_STATS_SAMPLES)

    writeJSON(statsKeyFor(difficultyKey), stats)

    const history = readJSON(historyKeyFor(difficultyKey), [])
    history.push({
      difficulty: difficultyKey,
      score: result.score,
      completionTime: result.completionTime,
      moves: result.moves,
      mistakes: result.mistakes,
      moveEfficiency: result.moveEfficiency,
      pairs: result.totalPairs,
      completedAt: date,
    })
    writeJSON(historyKeyFor(difficultyKey), history.slice(-MAX_HISTORY))

    return { isNewBestScore, isNewBestCompletionTime, isNewBestMoveEfficiency }
  }

  function getDerivedStats(difficultyKey) {
    const stats = getStats(difficultyKey)
    return {
      ...stats,
      completionRate: stats.started > 0 ? (stats.completed / stats.started) * 100 : 0,
      avgScore: avg(stats.completions.map((c) => c.score)),
      medianScore: median(stats.completions.map((c) => c.score)),
      avgCompletionTime: avg(stats.completions.map((c) => c.completionTime)),
      medianCompletionTime: median(stats.completions.map((c) => c.completionTime)),
      avgMoves: avg(stats.completions.map((c) => c.moves)),
      medianMoves: median(stats.completions.map((c) => c.moves)),
      avgMistakes: avg(stats.completions.map((c) => c.mistakes)),
      avgMoveEfficiency: avg(stats.completions.map((c) => c.moveEfficiency)),
    }
  }

  // SPEC §20's history filters include "All" alongside each difficulty —
  // history is stored per difficulty (own 30-entry cap each), so 'all'
  // merges those and re-sorts chronologically rather than being its own key.
  function getHistory(difficultyFilter) {
    if (!difficultyFilter || difficultyFilter === 'all') {
      const merged = []
      for (const d of Object.values(MEMORYPAIRS_DIFFICULTIES)) {
        merged.push(...readJSON(historyKeyFor(d.key), []))
      }
      return merged.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
    }
    return readJSON(historyKeyFor(difficultyFilter), [])
  }

  return { getStats, getDerivedStats, recordStart, recordCompletion, getHistory }
}
