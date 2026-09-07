import { METRIC_VERSIONS } from '../constants/metricVersions.js'

const PREFIX = 'stroop:history:'
const MAX_ENTRIES = 20

function keyFor(mode, difficultyKey) {
  return `${PREFIX}${mode}:${difficultyKey}`
}

function read(mode, difficultyKey) {
  try {
    const raw = localStorage.getItem(keyFor(mode, difficultyKey))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function write(mode, difficultyKey, entries) {
  try {
    localStorage.setItem(keyFor(mode, difficultyKey), JSON.stringify(entries))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — silently skip persistence
  }
}

export function useScoreHistory() {
  function getHistory(mode, difficultyKey) {
    return read(mode, difficultyKey)
  }

  function addEntry(mode, difficultyKey, result) {
    const entries = read(mode, difficultyKey)
    entries.push({
      score: result.score,
      accuracy: result.accuracy,
      avgResponseTime: result.avgResponseTime,
      date: new Date().toISOString(),
      metricVersion: METRIC_VERSIONS.stroop,
      appVersion: __APP_VERSION__,
    })
    write(mode, difficultyKey, entries.slice(-MAX_ENTRIES))
  }

  return { getHistory, addEntry }
}
