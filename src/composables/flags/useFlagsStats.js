// Persistence for Flags of the World — per-level bests/history, suite-wide
// campaign progression (highest unlocked level, stars, completed levels),
// AND per-country learning state (SPEC §14-§16), which no other game in
// this suite tracks. Mirrors whackamole/useWhackAMoleStats.js's shape for
// the level/progress part; the learning-state part is new.

import { FLAGS_LEVELS } from '../../constants/flags/levels.js'
import { DATASET_VERSION } from '../../constants/flags/countries.js'
import { updateCountryLearning } from './learning.js'
import { METRIC_VERSIONS } from '../../constants/metricVersions.js'

const STATS_PREFIX = 'flagsoftheworld:stats:'
const HISTORY_PREFIX = 'flagsoftheworld:history:'
const PROGRESS_KEY = 'flagsoftheworld:progress'
const LEARNING_KEY = 'flagsoftheworld:learning'
const MAX_HISTORY = 30

// SPEC §16: only offer Practice Weak Flags once it's actually worth a
// dedicated round.
const PRACTICE_MIN_WEAK_COUNT = 5

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
    best: null, // { stars, correctCount, score, duration, date }
    completions: [],
  }
}

function defaultProgress() {
  return {
    highestUnlocked: 1,
    completedLevels: [],
    totalStars: 0,
    datasetVersion: DATASET_VERSION,
  }
}

// SPEC §18/§21: Stars first, then correct count, then a faster time for
// genuinely equivalent results — same tie-break shape as every other level-
// based game's stats composable in this suite.
function isBetter(candidate, current) {
  if (!current) return true
  if (candidate.stars !== current.stars) return candidate.stars > current.stars
  if (candidate.correctCount !== current.correctCount) return candidate.correctCount > current.correctCount
  return candidate.duration < current.duration
}

export function useFlagsStats() {
  function getStats(level) {
    return readJSON(statsKeyFor(level), defaultStats())
  }

  function recordStart(level) {
    if (level == null) return // Practice Weak Flags isn't level-scoped
    const stats = getStats(level)
    stats.started += 1
    writeJSON(statsKeyFor(level), stats)
  }

  function getProgress() {
    return readJSON(PROGRESS_KEY, defaultProgress())
  }

  function getLearningState() {
    return readJSON(LEARNING_KEY, {})
  }

  // answer: { correct, wrongCode, timestamp } — see learning.js's
  // updateCountryLearning for the shape it returns/persists.
  function updateLearning(code, answer) {
    const state = getLearningState()
    state[code] = updateCountryLearning(state[code], answer)
    writeJSON(LEARNING_KEY, state)
    return state[code]
  }

  function getWeakCountries() {
    const state = getLearningState()
    return Object.keys(state).filter((code) => state[code].mastery === 'needs-practice')
  }

  function canPracticeWeak() {
    return getWeakCountries().length >= PRACTICE_MIN_WEAK_COUNT
  }

  // result: game.results value — { level, correctCount, totalCount,
  // accuracy, bestStreak, score, stars, duration, perQuestionLog, missedCodes }.
  // level === null (Practice Weak Flags, SPEC §16) skips stats/history/
  // progress entirely — only learning state is touched, since practice
  // "does not affect campaign unlocking."
  function recordCompletion(level, result) {
    for (const entry of result.perQuestionLog ?? []) {
      updateLearning(entry.countryCode, { correct: entry.correct, wrongCode: entry.wrongCode, timestamp: entry.timestamp })
    }

    if (level == null) return { isNewBest: false }

    const stats = getStats(level)
    stats.completed += 1

    const date = new Date().toISOString()
    const candidate = { stars: result.stars, correctCount: result.correctCount, score: result.score, duration: result.duration, date }

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
      correctCount: result.correctCount,
      totalCount: result.totalCount,
      accuracy: result.accuracy,
      bestStreak: result.bestStreak,
      score: result.score,
      stars: result.stars,
      duration: result.duration,
      completedAt: date,
      metricVersion: METRIC_VERSIONS.flagsoftheworld,
      appVersion: __APP_VERSION__,
    })
    writeJSON(historyKeyFor(level), history.slice(-MAX_HISTORY))

    // SPEC §7/§18: completion — mistakes or not — unlocks the next level;
    // stars measure mastery but never gate progression, and never regress.
    const progress = getProgress()
    const wasFirstCompletion = !progress.completedLevels.includes(level)
    if (wasFirstCompletion) progress.completedLevels.push(level)
    progress.highestUnlocked = Math.max(progress.highestUnlocked, Math.min(level + 1, FLAGS_LEVELS.length))
    progress.datasetVersion = DATASET_VERSION
    progress.totalStars = progress.completedLevels.reduce((sum, lvl) => sum + (getStats(lvl).best?.stars ?? 0), 0)
    writeJSON(PROGRESS_KEY, progress)

    return { isNewBest }
  }

  function getHistory(level) {
    return readJSON(historyKeyFor(level), [])
  }

  return {
    getStats,
    recordStart,
    getProgress,
    recordCompletion,
    getHistory,
    getLearningState,
    getWeakCountries,
    canPracticeWeak,
  }
}
