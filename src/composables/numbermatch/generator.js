// Board generation (SPEC §10) — no Vue, no storage. Local seeded PRNG
// (mulberry32), duplicated rather than imported from another game's
// composables per this codebase's existing convention.
import { findLegalPairs } from './board.js'

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

const MAX_DOMINATION_RATIO = 0.35 // SPEC §10: "no extreme domination by one digit"
const MAX_GENERATION_ATTEMPTS = 200

function hasReasonableDistribution(cells) {
  const counts = new Map()
  for (const v of cells) counts.set(v, (counts.get(v) || 0) + 1)
  for (const count of counts.values()) {
    if (count / cells.length > MAX_DOMINATION_RATIO) return false
  }
  return true
}

// SPEC §10: deterministic from a seed, at least one legal opening pair,
// reasonable digit distribution, never zero legal moves at the start. A
// guaranteed full clear is explicitly NOT required here — Add Numbers is
// the release valve for that (SPEC §10/§11), unlike Emoji Mahjong's
// solver-verified-solvable generation.
export function generateBoard(difficultyConfig, seed) {
  const rng = makeRng(seed)
  const totalCells = difficultyConfig.cols * difficultyConfig.startingRows

  let cells
  let attempts = 0
  do {
    cells = Array.from({ length: totalCells }, () => 1 + Math.floor(rng() * 9))
    attempts += 1
  } while (
    attempts < MAX_GENERATION_ATTEMPTS &&
    (!hasReasonableDistribution(cells) || findLegalPairs({ cols: difficultyConfig.cols, cells }).length === 0)
  )

  return { cols: difficultyConfig.cols, cells }
}
