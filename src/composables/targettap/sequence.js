// Pure sequence-generation logic — no Vue dependency (SPEC §34).
import { TARGETTAP_LETTER_POOL, distractorPoolFor } from '../../constants/targettap/letterPool.js'

const MIN_TARGET_GAP = 3 // index distance between consecutive targets: target + 2 non-targets + target (SPEC §7)
const FIRST_TARGETABLE_INDEX = 2 // first two stimuli are always non-target (SPEC §8)

// Deterministic PRNG (mulberry32), same shape used throughout the project.
function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeRng(seed) {
  return typeof seed === 'number' ? mulberry32(seed) : Math.random
}

function pickRandom(arr, rng) {
  return arr[Math.floor(rng() * arr.length)]
}

// SPEC §6's "critical rule": never repeat the immediately previous game's
// target. previousTarget is null for the very first game ever played.
export function selectTarget(previousTarget, rng) {
  const pool = previousTarget ? TARGETTAP_LETTER_POOL.filter((l) => l !== previousTarget) : TARGETTAP_LETTER_POOL
  return pickRandom(pool, rng)
}

// SPEC §9: choosing floor() rather than round() guarantees every stimulus's
// full interval fits inside the round duration by construction — including
// the final one — so there's no separate "does the last target have a full
// response window" case to special-case later; it's true for every position.
export function calculateTotalStimuli(config) {
  return Math.floor((config.duration * 1000) / config.stimulusInterval)
}

export function calculateTargetCount(config, totalStimuli) {
  return Math.round(totalStimuli * config.targetFrequency)
}

// Places up to `desiredCount` target indices across [FIRST_TARGETABLE_INDEX,
// totalStimuli - 1], honoring SPEC §7/§8's spacing rules. Stratified
// placement: the eligible range is split into `count` roughly-equal
// segments and one random valid position is chosen per segment (clamped
// against the running minimum-gap constraint and against leaving enough
// room for every remaining target) — keeps a stable, evenly-spread target
// count per round (SPEC §10) while still randomizing exact positions.
//
// desiredCount is capped at whatever the spacing constraint can actually
// fit (SPEC §10: "distribute those targets across valid positions") — in
// practice, every configured difficulty's desired count is comfortably
// below this cap (verified in sequence.test.js), so the cap is a safety net
// against misconfiguration, not something normal play ever hits.
export function generateTargetPositions(totalStimuli, desiredCount, rng) {
  const eligibleEnd = totalStimuli - 1
  if (eligibleEnd < FIRST_TARGETABLE_INDEX) return []

  const maxPossible = Math.floor((eligibleEnd - FIRST_TARGETABLE_INDEX) / MIN_TARGET_GAP) + 1
  const count = Math.min(desiredCount, Math.max(0, maxPossible))
  if (count === 0) return []

  const span = eligibleEnd - FIRST_TARGETABLE_INDEX + 1
  const segmentSize = span / count
  const positions = []
  let minNext = FIRST_TARGETABLE_INDEX

  for (let i = 0; i < count; i++) {
    const segStart = Math.floor(FIRST_TARGETABLE_INDEX + i * segmentSize)
    const segEnd = Math.floor(FIRST_TARGETABLE_INDEX + (i + 1) * segmentSize) - 1
    const remaining = count - 1 - i
    const lower = Math.max(segStart, minNext)
    const upper = Math.min(segEnd, eligibleEnd - remaining * MIN_TARGET_GAP)

    const pos = lower <= upper ? lower + Math.floor(rng() * (upper - lower + 1)) : minNext
    positions.push(pos)
    minNext = pos + MIN_TARGET_GAP
  }

  return positions
}

// Builds the full per-position letter stream: the target letter at every
// target position, a random distractor everywhere else — excluding the
// target itself, anything flagged as confusable with it (SPEC §11), and the
// immediately preceding letter (SPEC §12's "simple recent-letter exclusion
// rule", same technique as nback/sequence.js).
export function generateDistractors(target, totalStimuli, targetPositions, rng) {
  const targetSet = new Set(targetPositions)
  const pool = distractorPoolFor(target)
  const letters = []

  for (let i = 0; i < totalStimuli; i++) {
    if (targetSet.has(i)) {
      letters.push(target)
      continue
    }
    const candidates = i > 0 && letters[i - 1] && pool.length > 1
      ? pool.filter((l) => l !== letters[i - 1])
      : pool
    letters.push(pickRandom(candidates, rng))
  }

  return letters
}

// SPEC §33: seed + difficulty + target → reproducible stream. Normal
// gameplay passes no seed (Math.random).
export function generateSequence(config, previousTarget, seed) {
  const rng = makeRng(seed)
  const target = selectTarget(previousTarget, rng)
  const totalStimuli = calculateTotalStimuli(config)
  const desiredTargetCount = calculateTargetCount(config, totalStimuli)
  const targetPositions = generateTargetPositions(totalStimuli, desiredTargetCount, rng)
  const letters = generateDistractors(target, totalStimuli, targetPositions, rng)
  const isTarget = Array.from({ length: totalStimuli }, (_, i) => targetPositions.includes(i))

  const sequence = {
    target,
    previousTarget,
    totalStimuli,
    targetCount: targetPositions.length,
    intervalMs: config.stimulusInterval,
    durationMs: config.duration * 1000,
    letters,
    isTarget,
  }
  validateSequence(sequence)
  return sequence
}

// Pre-play validation (SPEC §34) — throws on any inconsistency rather than
// silently starting a broken round.
export function validateSequence(sequence) {
  const { target, previousTarget, totalStimuli, targetCount, intervalMs, durationMs, letters, isTarget } = sequence

  if (letters.length !== totalStimuli || isTarget.length !== totalStimuli) {
    throw new Error('target-tap sequence: wrong length')
  }
  if (target === previousTarget) {
    throw new Error('target-tap sequence: target repeats the previous game\'s target')
  }
  if (totalStimuli * intervalMs > durationMs) {
    throw new Error('target-tap sequence: total stimuli exceed the round duration')
  }

  let actualTargetCount = 0
  let lastTargetIndex = -Infinity
  for (let i = 0; i < totalStimuli; i++) {
    if (isTarget[i]) {
      if (letters[i] !== target) throw new Error(`target-tap sequence: position ${i} marked target but isn't the target letter`)
      if (i < FIRST_TARGETABLE_INDEX) throw new Error(`target-tap sequence: position ${i} is a target within the first ${FIRST_TARGETABLE_INDEX} stimuli`)
      if (i - lastTargetIndex < MIN_TARGET_GAP) throw new Error(`target-tap sequence: targets at ${lastTargetIndex} and ${i} are closer than the minimum gap`)
      lastTargetIndex = i
      actualTargetCount += 1
    } else if (letters[i] === target) {
      throw new Error(`target-tap sequence: position ${i} shows the target letter but isn't marked as a target`)
    }
  }

  if (actualTargetCount !== targetCount) {
    throw new Error(`target-tap sequence: expected ${targetCount} targets, found ${actualTargetCount}`)
  }

  return true
}
