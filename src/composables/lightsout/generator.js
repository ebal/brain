// Level curation tool (SPEC "Level data and generation"): "generate
// candidates from the solved board by applying taps, then use the solver to
// determine the true minimum." Not called during normal play — every level
// actually shipped in constants/lightsout/levels.js was chosen from this
// function's output by a one-off curation script, the same way
// marblejump/puzzles.js's puzzles were each chosen by hand after running
// composables/marblejump/solver.js against candidates.
import { createEmptyBoard, applyMove } from './board.js'
import { minimumMoves } from './solver.js'

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

// Starts from the solved (all-off) board and applies `tapCount` random taps
// — the resulting board's TRUE minimum (found by the solver, not tapCount
// itself) is often lower, since two taps on the same cell cancel and
// different tap sequences can coincide on a smaller solution.
export function generateCandidate(size, tapCount, rng) {
  let cells = createEmptyBoard(size)
  for (let i = 0; i < tapCount; i++) {
    const r = Math.floor(rng() * size)
    const c = Math.floor(rng() * size)
    cells = applyMove(cells, size, r, c)
  }
  return cells
}

// Generates candidates until one's solver-verified minimumMoves falls
// within [minOptimal, maxOptimal] (a level tier's intended optimal depth),
// or gives up after maxAttempts.
export function generateLevel(size, tapCount, minOptimal, maxOptimal, rng, maxAttempts = 500) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const cells = generateCandidate(size, tapCount, rng)
    if (cells.every((v) => v === 0)) continue // tapped back to solved — not a puzzle
    const optimal = minimumMoves(cells, size)
    if (optimal !== null && optimal >= minOptimal && optimal <= maxOptimal) {
      return { cells, optimalMoves: optimal }
    }
  }
  return null
}
