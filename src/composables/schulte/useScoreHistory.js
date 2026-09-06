const PREFIX = 'schulte:history:'
const MAX_ENTRIES = 20

function keyFor(difficultyKey) {
  return `${PREFIX}${difficultyKey}`
}

function read(difficultyKey) {
  try {
    const raw = localStorage.getItem(keyFor(difficultyKey))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function write(difficultyKey, entries) {
  try {
    localStorage.setItem(keyFor(difficultyKey), JSON.stringify(entries))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — silently skip persistence
  }
}

export function useScoreHistory() {
  function getHistory(difficultyKey) {
    return read(difficultyKey)
  }

  // Returns the entry that was most recent before this call (or null), so the
  // caller can show "previous completion time" without a separate read.
  function addEntry(difficultyKey, result) {
    const entries = read(difficultyKey)
    const previous = entries.length ? entries[entries.length - 1] : null
    entries.push({
      completionTime: result.completionTime,
      errors: result.errors,
      accuracy: result.accuracy,
      avgSearchTime: result.avgSearchTime,
      medianSearchTime: result.medianSearchTime,
      date: new Date().toISOString(),
    })
    write(difficultyKey, entries.slice(-MAX_ENTRIES))
    return previous
  }

  return { getHistory, addEntry }
}
