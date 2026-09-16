// Pure scoring/stats math — no Vue dependency (SPEC "Metrics"/"Stars").

// SPEC "Metrics": optimal / actual x 100, capped at 100%.
export function calculateEfficiency(optimalMoves, actualMoves) {
  if (actualMoves <= 0) return 0
  return Math.min(100, (optimalMoves / actualMoves) * 100)
}

// SPEC "Stars" (initial rule, explicitly "tune only after real
// play-testing"): ★★★ exact optimal solution, ★★☆ within optimal + 2
// moves, ★☆☆ completed. A hint caps the result below a clean 3-star result.
export function calculateStars({ actualMoves, optimalMoves, hints }) {
  const isOptimal = actualMoves === optimalMoves
  const withinTwoMoves = actualMoves <= optimalMoves + 2
  if (isOptimal && hints === 0) return 3
  if (isOptimal || withinTwoMoves) return 2
  return 1
}
