const PREFIX = 'schulte:best:'

function keyFor(difficultyKey) {
  return `${PREFIX}${difficultyKey}`
}

function read(difficultyKey) {
  try {
    const raw = localStorage.getItem(keyFor(difficultyKey))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(difficultyKey, data) {
  try {
    localStorage.setItem(keyFor(difficultyKey), JSON.stringify(data))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — silently skip persistence
  }
}

export function useBestTimes() {
  function getBest(difficultyKey) {
    return read(difficultyKey)
  }

  // A best requires a zero-error round (SPEC §4) — random rapid tapping can't set a record.
  function submitTime(difficultyKey, result) {
    if (result.errors > 0) {
      return { isNewBest: false, entry: read(difficultyKey) }
    }

    const current = read(difficultyKey)
    if (!current || result.completionTime < current.completionTime) {
      const entry = {
        completionTime: result.completionTime,
        avgSearchTime: result.avgSearchTime,
        medianSearchTime: result.medianSearchTime,
        accuracy: result.accuracy,
        date: new Date().toISOString(),
      }
      write(difficultyKey, entry)
      return { isNewBest: true, entry }
    }
    return { isNewBest: false, entry: current }
  }

  return { getBest, submitTime }
}
