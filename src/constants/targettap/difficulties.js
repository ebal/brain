// Duration, target frequency and stimulus interval per difficulty (SPEC §5/
// §42). Difficulty increases through faster presentation, less frequent
// targets and a longer sustained-attention requirement — never through
// visually confusing letters, tiny text or poor contrast (SPEC §5).
//
// Object-property keys match their own `.key` exactly (including the
// hyphenated 'very-hard'), same convention as oddoneout/difficulties.js —
// no separate prop-key/storage-key translation needed anywhere.
export const TARGETTAP_DIFFICULTIES = {
  easy: { key: 'easy', label: 'Easy', duration: 30, targetFrequency: 0.30, stimulusInterval: 1000 },
  medium: { key: 'medium', label: 'Medium', duration: 45, targetFrequency: 0.25, stimulusInterval: 800 },
  hard: { key: 'hard', label: 'Hard', duration: 60, targetFrequency: 0.20, stimulusInterval: 650 },
  'very-hard': { key: 'very-hard', label: 'Very Hard', duration: 90, targetFrequency: 0.15, stimulusInterval: 500 },
}

export function getDifficultyConfig(difficultyKey) {
  return TARGETTAP_DIFFICULTIES[difficultyKey]
}
