// Pure scoring math — no Vue dependency (SPEC §15/§17).

// result: { baseScore, elapsedSeconds, moves, pairs, mistakes }
// SPEC §15: a mismatch is both an extra Move and a Mistake, so it carries a
// stronger effective penalty — intentionally discourages random guessing.
export function calculateMemoryScore(result) {
  const { baseScore, elapsedSeconds, moves, pairs, mistakes } = result
  const extraMoves = Math.max(0, moves - pairs)
  const score = baseScore
    - Math.floor(elapsedSeconds) * 25
    - extraMoves * 75
    - mistakes * 100
  return Math.max(0, score)
}

// SPEC §17 — theoretical minimum is one Move per pair, so this is always
// <= 100%.
export function calculateMoveEfficiency(minimumMoves, actualMoves) {
  return actualMoves > 0 ? (minimumMoves / actualMoves) * 100 : 0
}
