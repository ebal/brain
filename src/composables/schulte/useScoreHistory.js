import { METRIC_VERSIONS } from '../../constants/metricVersions.js'
import { newSessionStamp } from '../persistence/device.js'
import { persistJSON } from '../persistence/durableWrite.js'

const PREFIX = 'schulte:history:'
const MAX_ENTRIES = 20

// See useBestTimes.js's keyFor comment — 'classic' keeps the original,
// pre-existing key shape so nobody's already-saved history changes format.
function keyFor(difficultyKey, variantKey = 'classic') {
  return variantKey === 'classic'
    ? `${PREFIX}${difficultyKey}`
    : `${PREFIX}${variantKey}:${difficultyKey}`
}

function read(difficultyKey, variantKey) {
  try {
    const raw = localStorage.getItem(keyFor(difficultyKey, variantKey))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function write(difficultyKey, variantKey, entries) {
  try {
    persistJSON(keyFor(difficultyKey, variantKey), entries)
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — silently skip persistence
  }
}

export function useScoreHistory() {
  function getHistory(difficultyKey, variantKey = 'classic') {
    return read(difficultyKey, variantKey)
  }

  // Returns the entry that was most recent before this call (or null), so the
  // caller can show "previous completion time" without a separate read.
  function addEntry(difficultyKey, result, variantKey = 'classic') {
    const entries = read(difficultyKey, variantKey)
    const previous = entries.length ? entries[entries.length - 1] : null
    entries.push({
      completionTime: result.completionTime,
      errors: result.errors,
      accuracy: result.accuracy,
      avgSearchTime: result.avgSearchTime,
      medianSearchTime: result.medianSearchTime,
      date: new Date().toISOString(),
      ...newSessionStamp(),
      metricVersion: METRIC_VERSIONS.schulte,
      appVersion: __APP_VERSION__,
    })
    write(difficultyKey, variantKey, entries.slice(-MAX_ENTRIES))
    return previous
  }

  return { getHistory, addEntry }
}
