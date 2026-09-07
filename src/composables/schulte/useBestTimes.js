const PREFIX = 'schulte:best:'

// 'classic' keeps the original, pre-existing key shape (`schulte:best:<difficultyKey>`)
// so nobody's already-saved plain-Schulte best times change format or go
// missing when the Random Color / Random Position variants are added. Every
// other variant gets its own segment, mirroring Stroop's `stroop:best:<mode>:<difficultyKey>`.
function keyFor(difficultyKey, variantKey = 'classic') {
  return variantKey === 'classic'
    ? `${PREFIX}${difficultyKey}`
    : `${PREFIX}${variantKey}:${difficultyKey}`
}

function read(difficultyKey, variantKey) {
  try {
    const raw = localStorage.getItem(keyFor(difficultyKey, variantKey))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(difficultyKey, variantKey, data) {
  try {
    localStorage.setItem(keyFor(difficultyKey, variantKey), JSON.stringify(data))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — silently skip persistence
  }
}

export function useBestTimes() {
  function getBest(difficultyKey, variantKey = 'classic') {
    return read(difficultyKey, variantKey)
  }

  // A best requires a zero-error round (SPEC §4) — random rapid tapping can't set a record.
  function submitTime(difficultyKey, result, variantKey = 'classic') {
    if (result.errors > 0) {
      return { isNewBest: false, entry: read(difficultyKey, variantKey) }
    }

    const current = read(difficultyKey, variantKey)
    if (!current || result.completionTime < current.completionTime) {
      const entry = {
        completionTime: result.completionTime,
        avgSearchTime: result.avgSearchTime,
        medianSearchTime: result.medianSearchTime,
        accuracy: result.accuracy,
        date: new Date().toISOString(),
      }
      write(difficultyKey, variantKey, entry)
      return { isNewBest: true, entry }
    }
    return { isNewBest: false, entry: current }
  }

  return { getBest, submitTime }
}
