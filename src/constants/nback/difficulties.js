// key is the literal localStorage suffix (nback:best:<key>, nback:history:<key>) — the N itself.
export const NBACK_DIFFICULTIES = {
  easy: { key: '1', label: 'Easy', n: 1, scoredTrials: 30 },
  classic: { key: '2', label: 'Medium / Classic', n: 2, scoredTrials: 40, isClassic: true },
  hard: { key: '3', label: 'Hard', n: 3, scoredTrials: 50 },
  veryHard: { key: '4', label: 'Very Hard', n: 4, scoredTrials: 60 },
}

export const NUMBER_POOL = [1, 2, 3, 4, 5, 6, 7, 8, 9]
export const TARGET_RATIO = 0.3
