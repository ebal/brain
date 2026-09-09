// Pure trial generation and scoring (SPEC §10, §11, §17, §31, §32) — no Vue.
import {
  normalizeShape,
  canonicalKey,
  rotateShape,
  mirrorShape,
  areRotationEquivalent,
  areReflectionEquivalent,
} from './geometry.js'
import { MENTALROTATION_SHAPES } from '../../constants/mentalrotation/shapes.js'

// Local seeded PRNG (mulberry32) — duplicated rather than imported from
// composables/set/deck.js, matching this codebase's existing convention:
// no game imports another game's pure logic, each keeps its own copy of
// small shared-shape helpers like this.
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

export function makeRng(seed) {
  return typeof seed === 'number' ? mulberry32(seed) : Math.random
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// SPEC §30: avoid repeating a base shape within the last few trials. Falls
// back to the full pool if recency exclusion would empty it (only possible
// with a tiny pool), rather than erroring.
function pickShape(pool, recentShapeIds, rng) {
  const eligible = pool.filter((s) => !recentShapeIds.includes(s.id))
  const from = eligible.length ? eligible : pool
  return from[Math.floor(rng() * from.length)]
}

function isConnected(cells) {
  if (cells.length === 0) return true
  const set = new Set(cells.map(([r, c]) => `${r},${c}`))
  const seen = new Set()
  const stack = [cells[0]]
  seen.add(`${cells[0][0]},${cells[0][1]}`)
  while (stack.length) {
    const [r, c] = stack.pop()
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const key = `${r + dr},${c + dc}`
      if (set.has(key) && !seen.has(key)) {
        seen.add(key)
        stack.push([r + dr, c + dc])
      }
    }
  }
  return seen.size === cells.length
}

// SPEC §11's structural distractor: move/add/remove one cell from the base
// shape, keeping it connected, and mathematically distinct (neither rotation-
// nor reflection-equivalent) from the base — otherwise it would silently be
// a second correct answer. Returns null if no such mutation exists (only
// possible for tiny shapes), so callers must have a fallback.
function structuralCandidates(baseCells) {
  const candidates = []
  const cellSet = new Set(baseCells.map(([r, c]) => `${r},${c}`))

  if (baseCells.length > 3) {
    for (let i = 0; i < baseCells.length; i++) {
      const without = baseCells.filter((_, idx) => idx !== i)
      if (isConnected(without)) candidates.push(without)
    }
  }

  for (const [r, c] of baseCells) {
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr, nc = c + dc, key = `${nr},${nc}`
      if (!cellSet.has(key)) candidates.push([...baseCells, [nr, nc]])
    }
  }

  const seen = new Set()
  return candidates
    .map(normalizeShape)
    .filter((cand) => {
      const key = canonicalKey(cand)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .filter((cand) => !areRotationEquivalent(cand, baseCells) && !areReflectionEquivalent(cand, baseCells))
}

function generateStructuralDistractor(baseCells, rng) {
  const valid = structuralCandidates(baseCells)
  if (!valid.length) return null
  return valid[Math.floor(rng() * valid.length)]
}

function generateMirrorDistractor(baseCells, rng, axis) {
  const mirrored = mirrorShape(baseCells, axis)
  const steps = Math.floor(rng() * 4)
  return rotateShape(mirrored, steps)
}

// Tries a distractor type, retrying with a fresh random rotation/mutation a
// few times if it would visually duplicate a distractor already picked for
// this trial (mathematically harmless either way, but two identical-looking
// wrong candidates is a poor trial). Falls back to a mirror variant if a
// structural mutation isn't available for this shape.
function addDistractor(type, baseCells, rng, existingCells) {
  let candidate = null
  for (let attempt = 0; attempt < 8; attempt++) {
    if (type === 'mirror') candidate = generateMirrorDistractor(baseCells, rng, 'vertical')
    else if (type === 'mirror2') candidate = generateMirrorDistractor(baseCells, rng, 'horizontal')
    else candidate = generateStructuralDistractor(baseCells, rng)

    if (!candidate) candidate = generateMirrorDistractor(baseCells, rng, attempt % 2 === 0 ? 'vertical' : 'horizontal')

    const key = canonicalKey(candidate)
    if (!existingCells.some((c) => canonicalKey(c) === key)) return candidate
  }
  return candidate
}

// SPEC §10. rng defaults to Math.random for normal play; pass a seeded one
// (via makeRng(seed)) for deterministic/reproducible sequences (SPEC §31).
export function generateTrial(difficulty, rng = Math.random, recentShapeIds = []) {
  const pool = MENTALROTATION_SHAPES.filter((s) => s.cellCount <= difficulty.maxCellCount)
  const shape = pickShape(pool, recentShapeIds, rng)
  const baseCells = shape.cells

  const referenceRotationSteps = Math.floor(rng() * 4)
  const referenceCells = rotateShape(baseCells, referenceRotationSteps)

  // The correct candidate is the reference rotated by a further nonzero
  // delta (1-3 quarter turns) so it's never shown at the same orientation
  // as the reference itself.
  const deltaSteps = 1 + Math.floor(rng() * 3)
  const correctRotationSteps = (referenceRotationSteps + deltaSteps) % 4
  const correctCells = rotateShape(baseCells, correctRotationSteps)

  const distractorCells = []
  for (const type of difficulty.distractorTypes) {
    distractorCells.push(addDistractor(type, baseCells, rng, [correctCells, ...distractorCells]))
  }

  const candidates = shuffle(
    [
      { cells: correctCells, correct: true },
      ...distractorCells.map((cells) => ({ cells, correct: false })),
    ].map((c, i) => ({ id: `c${i}`, ...c })),
    rng
  )

  return {
    shapeId: shape.id,
    referenceCells,
    referenceRotation: referenceRotationSteps * 90,
    correctRotation: correctRotationSteps * 90,
    angularDifference: deltaSteps * 90,
    candidates,
    correctCandidateId: candidates.find((c) => c.correct).id,
  }
}

const SPEED_BONUS_TIERS = [
  { underMs: 750, bonus: 30 },
  { underMs: 1250, bonus: 20 },
  { underMs: 2000, bonus: 10 },
]

function speedBonusFor(reactionTime) {
  for (const tier of SPEED_BONUS_TIERS) {
    if (reactionTime < tier.underMs) return tier.bonus
  }
  return 0
}

// SPEC §17: +100 correct (plus one speed-bonus tier), -50 incorrect, floor 0.
export function calculateMentalRotationScore(trials) {
  let score = 0
  for (const trial of trials) {
    score += trial.correct ? 100 + speedBonusFor(trial.reactionTime) : -50
  }
  return Math.max(0, score)
}
