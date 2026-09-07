// Grid is expressed landscape-first (cols × rows, matching SPEC §2's table);
// portraitCols is the mobile-first default column count SPEC §24 asks for
// (Hard/Very Hard render narrower-but-taller on phones) — tile count and
// pair count never change, only how the same flat tile array is laid out.
// veryHard's key is 'very-hard' (hyphenated), matching the convention
// established by schulte/difficulties.js's own veryHard entry.
export const MEMORYPAIRS_DIFFICULTIES = {
  easy: { key: 'easy', label: 'Easy', cols: 4, rows: 3, portraitCols: 4, pairs: 6, baseScore: 3000 },
  medium: { key: 'medium', label: 'Medium', cols: 4, rows: 4, portraitCols: 4, pairs: 8, baseScore: 5000 },
  hard: { key: 'hard', label: 'Hard', cols: 6, rows: 4, portraitCols: 4, pairs: 12, baseScore: 8000 },
  veryHard: { key: 'very-hard', label: 'Very Hard', cols: 6, rows: 5, portraitCols: 5, pairs: 15, baseScore: 11000 },
  extreme: { key: 'extreme', label: 'Extreme', cols: 6, rows: 6, portraitCols: 6, pairs: 18, baseScore: 14000 },
}

// veryHard's object property is camelCase but its `.key` (and therefore every
// localStorage key / route value / prop) is hyphenated ('very-hard') — a
// plain MEMORYPAIRS_DIFFICULTIES[key] lookup silently fails for it, so any
// code resolving a difficulty from its `.key` string must go through this.
export function getDifficultyConfig(difficultyKey) {
  return Object.values(MEMORYPAIRS_DIFFICULTIES).find((d) => d.key === difficultyKey)
}
