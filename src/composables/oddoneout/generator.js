// Pure trial-generation logic — no Vue dependency (SPEC §32).
import { CONFUSION_PAIRS } from '../../constants/oddoneout/confusionPairs.js'
import { DIFFICULTY_ORDER } from '../../constants/oddoneout/difficulties.js'

function difficultyRank(key) {
  return DIFFICULTY_ORDER.indexOf(key)
}

// Every pair whose [minimumDifficulty, maximumDifficulty] range covers the
// requested difficulty (SPEC §9's per-pair ranges, e.g. the spec's own
// example: minimumDifficulty 'hard', maximumDifficulty 'extreme').
export function eligiblePairs(difficultyKey) {
  const rank = difficultyRank(difficultyKey)
  if (rank === -1) return []
  return CONFUSION_PAIRS.filter((pair) => {
    const min = difficultyRank(pair.minimumDifficulty)
    const max = difficultyRank(pair.maximumDifficulty)
    return rank >= min && rank <= max
  })
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)]
}

// SPEC §8's seven steps: pick a family/pair, generate the grid, choose one
// random odd position, and return a trial that's already been validated to
// have exactly one differing cell (SPEC §32: "the engine should guarantee
// exactly one odd item for every scored trial").
export function generateTrial(difficultyKey, gridSize, rng = Math.random) {
  const pairs = eligiblePairs(difficultyKey)
  if (pairs.length === 0) {
    throw new Error(`No confusion pairs eligible for difficulty "${difficultyKey}"`)
  }
  const pair = pick(pairs, rng)

  // Which of the two characters is the repeated "base" vs. the lone "odd"
  // is randomized independently of the pair's own base/odd labeling — SPEC
  // §11 requires the odd POSITION to be unpredictable; randomizing which
  // character plays which role adds variety on top of that, not a
  // requirement, but keeps a base/odd pair from always looking the same way.
  const flip = rng() < 0.5
  const base = flip ? pair.odd : pair.base
  const odd = flip ? pair.base : pair.odd

  const totalCells = gridSize * gridSize
  const oddIndex = Math.floor(rng() * totalCells)
  const cells = Array.from({ length: totalCells }, (_, i) => (i === oddIndex ? odd : base))

  const trial = { pairId: pair.id, family: pair.family, gridSize, base, odd, oddIndex, cells }
  if (!validateTrial(trial)) {
    // Should be unreachable given the construction above — kept as a hard
    // guarantee per SPEC §32 rather than trusting the construction silently.
    throw new Error('Generated trial does not have exactly one odd cell')
  }
  return trial
}

// SPEC §8 step 6 / §32: exactly one cell may differ from `base`, and it must
// be the declared oddIndex.
export function validateTrial(trial) {
  const differing = trial.cells.reduce((count, cell) => count + (cell !== trial.base ? 1 : 0), 0)
  return differing === 1 && trial.cells[trial.oddIndex] !== trial.base
}

export function findOddIndex(trial) {
  return trial.cells.findIndex((cell) => cell !== trial.base)
}

// Deterministic PRNG (SPEC §31) — same mulberry32 shape used throughout the
// project (e.g. switchtrail/trailLayout.js, numbermatch/generator.js); kept
// as a local copy rather than a shared util, matching that existing
// per-game convention.
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
