const PREFIX = 'nback:history:'
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

  function addEntry(difficultyKey, result) {
    const entries = read(difficultyKey)
    entries.push({
      score: result.score,
      accuracy: result.accuracy,
      hits: result.hits,
      misses: result.misses,
      falseAlarms: result.falseAlarms,
      correctRejections: result.correctRejections,
      avgRT: result.avgRT,
      medianRT: result.medianRT,
      date: new Date().toISOString(),
    })
    write(difficultyKey, entries.slice(-MAX_ENTRIES))
  }

  return { getHistory, addEntry }
}
