// Orchestrates full-grid generation + unique-solution carving + difficulty
// classification into a single puzzle-generation call per difficulty.
//
// Carving samples difficulty at every single-cell removal within ONE pass
// (rather than restarting from scratch per attempt) — measured to be far
// more effective at actually reaching Medium/Hard classifications than
// carving to a fixed clue count and classifying once (SPEC §3/§17 both
// warn against clue-count-only difficulty targeting; this is also just
// much faster in practice).
//
// - 'easy': keep removing for as long as the puzzle stays easy-classified,
//   and return the last (most-empty) such snapshot — maximizes empty cells
//   while still only ever requiring singles.
// - 'medium' / 'hard': return the FIRST snapshot that newly requires that
//   tier's techniques — going further risks overshooting into a harder or
//   unrated (guessing-required) puzzle and missing the window entirely.

import { generateFullGrid, countSolutions, cloneGrid, shuffled } from './sudokuSolver.js'
import { classifyDifficulty } from './difficultyRater.js'

const CARVE_FLOOR = 22 // stop attempting removals below this many clues
const MAX_OUTER_ATTEMPTS = 200

function carveForDifficulty(fullGrid, difficultyKey, rng) {
  const puzzle = cloneGrid(fullGrid)
  const positions = shuffled(Array.from({ length: 81 }, (_, i) => i), rng)
  let clues = 81
  let lastGoodEasySnapshot = null

  for (const pos of positions) {
    if (clues <= CARVE_FLOOR) break
    const r = Math.floor(pos / 9)
    const c = pos % 9
    const backup = puzzle[r][c]
    puzzle[r][c] = 0

    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[r][c] = backup
      continue
    }
    clues -= 1

    const classification = classifyDifficulty(puzzle)

    if (difficultyKey === 'easy') {
      if (classification === 'easy') {
        lastGoodEasySnapshot = { puzzle: cloneGrid(puzzle), clues }
        continue
      }
      // No longer easy — the previous snapshot (if any) is the best result
      // this pass can offer.
      break
    }

    if (classification === difficultyKey) {
      return { puzzle: cloneGrid(puzzle), clues }
    }
  }

  return difficultyKey === 'easy' ? lastGoodEasySnapshot : null
}

// Returns { puzzle, solution, difficulty, clues } or throws if no puzzle of
// the requested difficulty was found within the attempt budget (extremely
// unlikely at these tiers based on measured hit rates, but bounded rather
// than looping forever).
export function generatePuzzle(difficultyKey, seed) {
  const rng = typeof seed === 'number' ? mulberry32(seed) : Math.random

  for (let attempt = 0; attempt < MAX_OUTER_ATTEMPTS; attempt++) {
    const full = generateFullGrid(typeof seed === 'number' ? seed + attempt : undefined)
    const result = carveForDifficulty(full, difficultyKey, rng)
    if (result) {
      return { puzzle: result.puzzle, solution: full, difficulty: difficultyKey, clues: result.clues }
    }
  }

  throw new Error(`Failed to generate a '${difficultyKey}' puzzle within ${MAX_OUTER_ATTEMPTS} attempts`)
}

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
