import { NUMBER_POOL, TARGET_RATIO } from '../../constants/nback/difficulties.js'

// Deterministic PRNG (mulberry32) so a seed + difficulty always produces the
// same sequence (SPEC §17) — used for testing, not exposed in the normal UI.
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeRng(seed) {
  return typeof seed === 'number' ? mulberry32(seed) : Math.random
}

function pickRandom(arr, rng) {
  return arr[Math.floor(rng() * arr.length)]
}

function shuffle(arr, rng) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Generates a sequence of `n + scoredTrials` stimuli drawn from `pool`
// (numbers by default; a letters difficulty passes LETTER_POOL instead —
// the generation/validation logic itself doesn't care what the symbols are,
// only that they can be compared for equality). The first `n` are unscored
// setup stimuli (no valid n-back comparison exists yet). Among the scored
// positions, exactly round(scoredTrials * TARGET_RATIO) are real n-back
// matches (targets); every other scored position is deliberately NOT a
// match, and setup positions avoid an immediate back-to-back repeat where
// practical (SPEC §4).
export function generateSequence(n, scoredTrials, seed, pool = NUMBER_POOL) {
  const rng = makeRng(seed)
  const total = n + scoredTrials
  const targetCount = Math.round(scoredTrials * TARGET_RATIO)

  const scoredPositions = Array.from({ length: scoredTrials }, (_, i) => i)
  const targetSet = new Set(shuffle(scoredPositions, rng).slice(0, targetCount))

  const numbers = []
  const isTarget = new Array(total).fill(false)

  for (let i = 0; i < total; i++) {
    if (i < n) {
      let num
      let attempts = 0
      do {
        num = pickRandom(pool, rng)
        attempts += 1
      } while (attempts < 20 && i > 0 && num === numbers[i - 1])
      numbers.push(num)
      continue
    }

    const scoredIndex = i - n
    if (targetSet.has(scoredIndex)) {
      numbers.push(numbers[i - n])
      isTarget[i] = true
    } else {
      let num
      let attempts = 0
      do {
        num = pickRandom(pool, rng)
        attempts += 1
      } while (attempts < 20 && (num === numbers[i - n] || num === numbers[i - 1]))
      numbers.push(num)
    }
  }

  return { numbers, isTarget, n, scoredTrials, targetCount }
}

// Pre-play validation (SPEC §17) — throws on any inconsistency rather than
// silently starting a broken round.
export function validateSequence({ numbers, isTarget, n, scoredTrials, targetCount }) {
  const total = n + scoredTrials
  if (numbers.length !== total || isTarget.length !== total) {
    throw new Error('n-back sequence: wrong length')
  }

  let actualTargetCount = 0
  for (let i = 0; i < total; i++) {
    if (i < n) {
      if (isTarget[i]) throw new Error(`n-back sequence: setup position ${i} marked as target`)
      continue
    }
    const isRealMatch = numbers[i] === numbers[i - n]
    if (isTarget[i]) {
      actualTargetCount += 1
      if (!isRealMatch) throw new Error(`n-back sequence: position ${i} marked target but isn't a real match`)
    } else if (isRealMatch) {
      throw new Error(`n-back sequence: position ${i} is an accidental match but wasn't designated a target`)
    }
  }

  if (actualTargetCount !== targetCount) {
    throw new Error(`n-back sequence: expected ${targetCount} targets, found ${actualTargetCount}`)
  }

  return true
}
