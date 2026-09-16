// Six levels, 3-8 disks (SPEC §"Natural progression"/"Final decisions" §2/§6).
// optimalMoves = 2^disks - 1 is a closed form, not curated/solver-verified
// content the way Marble Jump's puzzles.js is — Hanoi has no alternate
// "harder" or "easier" configuration at a given disk count, so there's
// nothing to generate or verify beyond the formula itself.
export const HANOI_LEVELS = [
  { level: 1, disks: 3, optimalMoves: 7 },
  { level: 2, disks: 4, optimalMoves: 15 },
  { level: 3, disks: 5, optimalMoves: 31 },
  { level: 4, disks: 6, optimalMoves: 63 },
  { level: 5, disks: 7, optimalMoves: 127 },
  { level: 6, disks: 8, optimalMoves: 255 },
]

export function getLevelConfig(level) {
  return HANOI_LEVELS.find((l) => l.level === level)
}
