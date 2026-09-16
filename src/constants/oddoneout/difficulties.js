// Grid size and overall challenge duration per difficulty (SPEC §5/§38).
// gridSize scales 4x4 -> 9x9; timeLimit is the WHOLE round's duration, not a
// per-trial deadline (SPEC §6 — a trial itself never times out on its own).
//
// Unlike Schulte/N-Back, every difficulty's object-property key here is
// identical to its own `.key` (storage/URL form) — including the hyphenated
// 'very-hard' — so DIFFICULTY_ORDER and confusionPairs.js's per-pair
// minimumDifficulty/maximumDifficulty can use the exact same string
// everywhere with no separate prop-key/storage-key translation needed.
export const DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'very-hard', 'expert', 'extreme']

export const ODDONEOUT_DIFFICULTIES = {
  easy: { key: 'easy', label: 'Easy', gridSize: 4, timeLimit: 20 },
  medium: { key: 'medium', label: 'Medium', gridSize: 5, timeLimit: 20 },
  hard: { key: 'hard', label: 'Hard', gridSize: 6, timeLimit: 25 },
  'very-hard': { key: 'very-hard', label: 'Very Hard', gridSize: 7, timeLimit: 30 },
  expert: { key: 'expert', label: 'Expert', gridSize: 8, timeLimit: 30 },
  extreme: { key: 'extreme', label: 'Extreme', gridSize: 9, timeLimit: 35 },
}

export function getDifficultyConfig(difficultyKey) {
  return ODDONEOUT_DIFFICULTIES[difficultyKey]
}
