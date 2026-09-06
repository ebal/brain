// Shared by every game's results/stats calculation — extracted from eight
// near-identical local copies (Stroop, Schulte, N-Back, Sudoku, SET,
// Sequence Memory) so the math has exactly one implementation to test.

export function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

export function median(arr) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
