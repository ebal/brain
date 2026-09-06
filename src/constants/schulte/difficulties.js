// key is the literal localStorage suffix (schulte:best:<key>, schulte:history:<key>) —
// note veryHard's key is 'very-hard' (hyphenated), not camelCase, per SPEC.
export const SCHULTE_DIFFICULTIES = {
  easy: { key: 'easy', label: 'Easy', gridSize: 3 },
  medium: { key: 'medium', label: 'Medium', gridSize: 4 },
  classic: { key: 'classic', label: 'Classic', gridSize: 5, isClassic: true },
  hard: { key: 'hard', label: 'Hard', gridSize: 6 },
  veryHard: { key: 'very-hard', label: 'Very Hard', gridSize: 7 },
}
