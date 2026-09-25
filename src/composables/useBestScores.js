import { METRIC_VERSIONS } from '../constants/metricVersions.js'
import { persistJSON } from './persistence/durableWrite.js'

const PREFIX = 'stroop:best:'

function keyFor(mode, difficultyKey) {
  return `${PREFIX}${mode}:${difficultyKey}`
}

function read(mode, difficultyKey) {
  try {
    const raw = localStorage.getItem(keyFor(mode, difficultyKey))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(mode, difficultyKey, data) {
  try {
    persistJSON(keyFor(mode, difficultyKey), data)
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — silently skip persistence
  }
}

export function useBestScores() {
  function getBest(mode, difficultyKey) {
    return read(mode, difficultyKey)
  }

  function submitScore(mode, difficultyKey, result) {
    const current = read(mode, difficultyKey)
    if (!current || result.score > current.score) {
      const entry = {
        score: result.score,
        accuracy: result.accuracy,
        avgResponseTime: result.avgResponseTime,
        correct: result.correct,
        wrong: result.wrong,
        date: new Date().toISOString(),
        // Provenance (BRAIN-SYNC-SPEC §24). No sessionId: the history entry is
        // written by a separate call, so there's no shared session to name.
        metricVersion: METRIC_VERSIONS.stroop,
      }
      write(mode, difficultyKey, entry)
      return { isNewBest: true, entry }
    }
    return { isNewBest: false, entry: current }
  }

  return { getBest, submitScore }
}
