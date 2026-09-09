// Difficulty comes from board size, search possibilities, planning depth,
// and how few Add Numbers uses are available (SPEC §9). Expert/Extreme
// deliberately stay at 9 columns and grow vertically instead — 10+ columns
// would make cells too small on a real iPhone (SPEC §9/§24).
export const NUMBERMATCH_DIFFICULTIES = {
  easy: {
    key: 'easy',
    label: 'Easy',
    cols: 6,
    startingRows: 3,
    addNumbersUses: 4,
    baseScore: 3000,
    clearBonus: 500,
  },
  medium: {
    key: 'medium',
    label: 'Medium',
    cols: 7,
    startingRows: 4,
    addNumbersUses: 3,
    baseScore: 5000,
    clearBonus: 750,
  },
  hard: {
    key: 'hard',
    label: 'Hard',
    cols: 8,
    startingRows: 5,
    addNumbersUses: 2,
    baseScore: 7500,
    clearBonus: 1000,
  },
  veryHard: {
    key: 'very-hard',
    label: 'Very Hard',
    cols: 9,
    startingRows: 6,
    addNumbersUses: 2,
    baseScore: 10000,
    clearBonus: 1250,
  },
  expert: {
    key: 'expert',
    label: 'Expert',
    cols: 9,
    startingRows: 8,
    addNumbersUses: 2,
    baseScore: 13000,
    clearBonus: 1500,
  },
  extreme: {
    key: 'extreme',
    label: 'Extreme',
    cols: 9,
    startingRows: 10,
    addNumbersUses: 1,
    baseScore: 16000,
    clearBonus: 2000,
  },
}

export function getDifficultyConfig(difficultyKey) {
  return Object.values(NUMBERMATCH_DIFFICULTIES).find((d) => d.key === difficultyKey)
}
