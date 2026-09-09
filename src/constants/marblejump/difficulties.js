// n = triangular board row count; holes = n*(n+1)/2, derivable but kept
// explicit here since it's what the menu displays (SPEC §5 — difficulty
// comes from board size/solution structure, not a UI-visible marble count
// alone, but the board size itself is still useful at-a-glance menu copy).
export const MARBLEJUMP_DIFFICULTIES = {
  easy: { key: 'easy', label: 'Easy', n: 4, holes: 10 },
  medium: { key: 'medium', label: 'Medium', n: 5, holes: 15 },
  hard: { key: 'hard', label: 'Hard', n: 6, holes: 21 },
  extreme: { key: 'extreme', label: 'Extreme', n: 7, holes: 28 },
}
