// Level-SPEC §36-38: score is secondary and explicitly need not be
// calibrated before release ("prefer implementing and tuning the 50 levels
// first, then calibrating score from actual play data... raw results +
// stars are sufficient for v1 if necessary"). Base score scales with the
// board's own tile count (bigger/harder boards are worth more) rather than
// a difficulty-tier lookup, since levels no longer have a difficulty key.
export function calculateEmojiMahjongScore({ tileCount, elapsedSeconds, mistakes, hints, undos }) {
  const base = tileCount * 125
  const timePenalty = Math.floor(elapsedSeconds / 5) * 5
  const score = base - timePenalty - mistakes * 50 - hints * 250 - undos * 25
  return Math.max(0, score)
}

// Level-SPEC §37: target times haven't been calibrated against real play
// data, so v1 uses the spec's own explicitly-sanctioned simpler rule
// instead of a per-level target-time threshold: ★★★ cleared + zero hints,
// ★★☆ cleared + at most 1 hint, ★☆☆ cleared. "Correctness and enjoyment
// outrank having a timer-based star system" (§37).
export function calculateStars({ hints }) {
  if (hints === 0) return 3
  if (hints <= 1) return 2
  return 1
}
