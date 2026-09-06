const PREFIX = 'nback:best:'

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

// Primary = highest score; ties broken by higher accuracy, then lower median
// correct RT (SPEC §10).
function isBetter(candidate, current) {
  if (!current) return true
  if (candidate.score !== current.score) return candidate.score > current.score
  if (candidate.accuracy !== current.accuracy) return candidate.accuracy > current.accuracy
  return candidate.medianRT < current.medianRT
}

export function useBestScores() {
  function getBest(difficultyKey) {
    return read(difficultyKey)
  }

  function submitScore(difficultyKey, result) {
    const current = read(difficultyKey)
    const candidate = {
      score: result.score,
      accuracy: result.accuracy,
      hits: result.hits,
      misses: result.misses,
      falseAlarms: result.falseAlarms,
      correctRejections: result.correctRejections,
      avgRT: result.avgRT,
      medianRT: result.medianRT,
      date: new Date().toISOString(),
    }

    if (isBetter(candidate, current)) {
      write(difficultyKey, candidate)
      return { isNewBest: true, entry: candidate }
    }
    return { isNewBest: false, entry: current }
  }

  return { getBest, submitScore }
}
