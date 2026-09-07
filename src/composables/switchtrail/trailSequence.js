// Pure sequence generation — no Vue, no randomness (SPEC §4). The logical
// order (1 A 2 B 3 C ...) is fully deterministic per difficulty; only board
// placement is randomized, in trailLayout.js.

const LETTERS = 'ABCDEFGHIJKL'.split('')

// Accepts either a difficulty config object ({ targetCount }) or a raw
// target count, so pure-logic callers/tests don't need a full difficulty.
export function createTrailSequence(difficultyOrTargetCount) {
  const targetCount = typeof difficultyOrTargetCount === 'number'
    ? difficultyOrTargetCount
    : difficultyOrTargetCount.targetCount

  if (targetCount % 2 !== 0) {
    throw new Error(`createTrailSequence: targetCount must be even (got ${targetCount})`)
  }
  const pairCount = targetCount / 2
  if (pairCount > LETTERS.length) {
    throw new Error(`createTrailSequence: targetCount ${targetCount} exceeds the supported A-L letter range`)
  }

  const sequence = []
  for (let i = 0; i < pairCount; i++) {
    sequence.push(String(i + 1))
    sequence.push(LETTERS[i])
  }
  return sequence
}

export function getExpectedTarget(sequence, index) {
  return index >= 0 && index < sequence.length ? sequence[index] : null
}
