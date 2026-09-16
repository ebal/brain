// 50 deterministic, versioned levels (SPEC "Progression"/"Level data and
// generation"). Every entry's optimalMoves was solver-verified by
// composables/lightsout/solver.js — see solver.test.js's exhaustive
// brute-force cross-check of the solver itself — not guessed or estimated.
//
// Generated (never hand-typed) by composables/lightsout/generator.js's
// generateLevel(), which starts from the solved board, applies a batch of
// random taps, and keeps the result only if the solver's true minimum falls
// within the level's target tier below. Duplicate boards within a tier were
// rejected. This mirrors marblejump/puzzles.js's curation discipline —
// nothing here is content a human invented by hand.
//
//   Levels   Grid   Intended optimal depth
//   1-5      3x3    1-3
//   6-10     3x3    3-5
//   11-20    4x4    3-7
//   21-35    5x5    4-10
//   36-45    5x5    8-14
//   46-50    6x6    8-20 (SPEC's "46-50: 6x6 if mobile-safe, otherwise
//            advanced 5x5, validated" — 6x6 chosen on the strength of
//            Schulte's/Odd One Out's already-shipped responsive up-to-9x9
//            grids using the same clamp()-based sizing technique, but this
//            specific choice has NOT been hand-verified on a real iPhone;
//            confirm before treating it as final, same caveat as every
//            other game's font/pair validation notes)
//
// `cells` is a flat, row-major 0/1 array (1 = lit/ON), length size*size —
// see composables/lightsout/board.js.
export const LIGHTSOUT_LEVELS = [
  { level: 1, size: 3, cells: [0,0,1,0,1,1,0,0,1], optimalMoves: 1, version: 1 },
  { level: 2, size: 3, cells: [0,1,0,1,1,1,0,1,0], optimalMoves: 1, version: 1 },
  { level: 3, size: 3, cells: [1,0,1,1,0,0,1,1,0], optimalMoves: 3, version: 1 },
  { level: 4, size: 3, cells: [0,0,0,1,0,1,1,1,0], optimalMoves: 3, version: 1 },
  { level: 5, size: 3, cells: [0,1,1,0,0,0,1,0,1], optimalMoves: 3, version: 1 },
  { level: 6, size: 3, cells: [1,1,0,0,1,1,1,1,0], optimalMoves: 3, version: 1 },
  { level: 7, size: 3, cells: [1,0,1,0,0,1,1,1,0], optimalMoves: 3, version: 1 },
  { level: 8, size: 3, cells: [1,0,0,1,0,1,1,1,1], optimalMoves: 5, version: 1 },
  { level: 9, size: 3, cells: [1,1,0,0,1,0,0,0,1], optimalMoves: 3, version: 1 },
  { level: 10, size: 3, cells: [1,1,0,0,1,1,1,0,0], optimalMoves: 5, version: 1 },
  { level: 11, size: 4, cells: [1,1,1,1,0,0,0,1,1,1,1,1,1,1,0,0], optimalMoves: 5, version: 1 },
  { level: 12, size: 4, cells: [0,0,0,0,0,0,0,1,1,1,1,1,0,0,1,1], optimalMoves: 3, version: 1 },
  { level: 13, size: 4, cells: [1,1,1,1,1,0,0,0,0,0,1,1,0,0,0,1], optimalMoves: 3, version: 1 },
  { level: 14, size: 4, cells: [1,1,1,1,0,0,0,1,0,1,1,0,0,0,1,1], optimalMoves: 5, version: 1 },
  { level: 15, size: 4, cells: [1,1,0,1,0,0,1,1,1,1,1,0,1,1,0,0], optimalMoves: 5, version: 1 },
  { level: 16, size: 4, cells: [1,1,0,1,0,0,0,0,1,1,1,1,0,0,1,0], optimalMoves: 5, version: 1 },
  { level: 17, size: 4, cells: [1,0,0,1,1,1,0,0,1,1,1,1,0,1,0,0], optimalMoves: 5, version: 1 },
  { level: 18, size: 4, cells: [0,0,0,1,0,0,1,0,0,0,0,0,0,1,1,0], optimalMoves: 3, version: 1 },
  { level: 19, size: 4, cells: [1,0,1,1,1,1,0,0,1,1,0,1,1,0,0,0], optimalMoves: 5, version: 1 },
  { level: 20, size: 4, cells: [0,0,1,1,1,0,0,1,1,0,0,0,0,1,1,0], optimalMoves: 3, version: 1 },
  { level: 21, size: 5, cells: [0,1,0,0,0,1,0,1,0,1,1,0,1,1,1,0,1,0,1,1,0,0,1,1,1], optimalMoves: 4, version: 1 },
  { level: 22, size: 5, cells: [0,0,0,1,0,0,0,1,1,1,0,0,1,1,0,1,0,0,1,1,0,1,1,0,1], optimalMoves: 6, version: 1 },
  { level: 23, size: 5, cells: [0,1,0,0,0,0,1,0,0,1,0,0,0,1,0,0,1,1,1,1,0,0,1,0,0], optimalMoves: 6, version: 1 },
  { level: 24, size: 5, cells: [1,1,0,0,1,0,0,0,1,0,0,1,1,0,0,1,1,0,0,0,0,0,1,0,0], optimalMoves: 8, version: 1 },
  { level: 25, size: 5, cells: [1,1,1,0,0,1,0,0,0,0,0,0,1,1,0,1,1,0,0,1,0,1,0,1,1], optimalMoves: 6, version: 1 },
  { level: 26, size: 5, cells: [1,0,0,1,0,0,1,0,1,1,0,1,0,0,0,0,0,1,1,1,0,0,0,1,0], optimalMoves: 4, version: 1 },
  { level: 27, size: 5, cells: [0,0,0,1,1,0,0,0,1,0,1,1,1,1,1,0,0,1,1,1,1,0,1,0,1], optimalMoves: 8, version: 1 },
  { level: 28, size: 5, cells: [1,0,0,1,1,1,1,0,0,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1], optimalMoves: 8, version: 1 },
  { level: 29, size: 5, cells: [1,0,1,0,1,0,0,0,1,0,1,0,0,1,0,0,0,0,0,0,0,0,0,1,1], optimalMoves: 6, version: 1 },
  { level: 30, size: 5, cells: [1,0,1,1,0,1,0,0,1,1,0,0,0,0,0,0,1,0,1,1,1,0,0,1,0], optimalMoves: 6, version: 1 },
  { level: 31, size: 5, cells: [1,0,0,0,1,1,0,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,1,0,0], optimalMoves: 8, version: 1 },
  { level: 32, size: 5, cells: [0,1,1,1,0,0,0,1,1,1,1,1,1,0,0,0,0,0,1,1,1,0,0,0,1], optimalMoves: 8, version: 1 },
  { level: 33, size: 5, cells: [1,1,1,0,1,0,1,1,1,0,0,1,0,0,0,1,0,0,1,1,1,0,1,1,0], optimalMoves: 6, version: 1 },
  { level: 34, size: 5, cells: [0,0,0,1,1,1,1,1,0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,0,1], optimalMoves: 8, version: 1 },
  { level: 35, size: 5, cells: [1,0,1,0,0,1,0,1,0,0,0,0,1,1,1,1,1,0,0,1,1,1,1,1,0], optimalMoves: 10, version: 1 },
  { level: 36, size: 5, cells: [1,1,1,0,0,1,1,0,1,1,0,0,0,1,0,0,0,1,0,0,1,0,0,0,0], optimalMoves: 8, version: 1 },
  { level: 37, size: 5, cells: [1,0,1,1,1,1,0,1,0,1,0,1,1,0,1,0,0,1,1,0,0,0,1,1,0], optimalMoves: 10, version: 1 },
  { level: 38, size: 5, cells: [0,0,1,0,0,1,0,0,1,1,1,1,1,0,0,0,1,0,1,1,1,1,0,1,1], optimalMoves: 8, version: 1 },
  { level: 39, size: 5, cells: [0,1,0,0,0,0,0,0,0,1,0,0,1,0,1,1,1,1,1,0,1,1,1,1,1], optimalMoves: 8, version: 1 },
  { level: 40, size: 5, cells: [0,1,1,0,1,1,1,0,1,0,1,0,0,0,0,0,0,1,0,0,1,0,0,1,1], optimalMoves: 10, version: 1 },
  { level: 41, size: 5, cells: [1,1,1,0,0,1,1,0,1,1,0,0,1,1,0,0,1,0,1,1,1,0,0,0,0], optimalMoves: 12, version: 1 },
  { level: 42, size: 5, cells: [1,1,0,0,1,0,1,1,0,1,0,1,0,1,1,1,1,1,1,0,0,1,1,0,1], optimalMoves: 8, version: 1 },
  { level: 43, size: 5, cells: [0,0,0,0,1,1,0,0,0,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0], optimalMoves: 8, version: 1 },
  { level: 44, size: 5, cells: [0,1,0,0,1,1,0,0,1,1,0,1,1,0,1,0,1,0,0,0,0,0,1,0,0], optimalMoves: 12, version: 1 },
  { level: 45, size: 5, cells: [1,0,0,1,0,0,1,0,1,0,0,0,0,1,1,1,0,0,1,0,0,0,0,0,0], optimalMoves: 8, version: 1 },
  { level: 46, size: 6, cells: [0,1,1,0,0,1,1,1,1,0,0,1,0,0,1,1,1,1,1,1,1,1,0,1,0,0,0,0,0,0,1,0,1,1,1,0], optimalMoves: 14, version: 1 },
  { level: 47, size: 6, cells: [1,0,1,0,0,1,1,0,1,0,0,0,0,0,0,1,0,0,0,0,1,1,0,1,0,0,0,1,0,0,0,0,0,0,1,1], optimalMoves: 8, version: 1 },
  { level: 48, size: 6, cells: [1,1,1,0,1,0,1,0,1,0,1,0,0,0,0,1,1,0,0,0,1,0,1,1,1,1,1,0,0,1,0,1,0,0,1,1], optimalMoves: 10, version: 1 },
  { level: 49, size: 6, cells: [0,0,1,1,1,1,0,0,1,1,1,1,1,0,1,1,1,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1], optimalMoves: 14, version: 1 },
  { level: 50, size: 6, cells: [1,1,0,1,1,0,1,0,0,0,0,1,0,1,1,1,0,0,1,1,1,1,1,1,0,1,1,0,1,1,0,0,0,1,0,1], optimalMoves: 12, version: 1 },
]

export function getLevelConfig(level) {
  return LIGHTSOUT_LEVELS.find((l) => l.level === level)
}
