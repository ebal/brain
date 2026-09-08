export const NUMBER_POOL = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// Consonants only (the letter set from Jaeggi et al.'s well-known dual
// n-back research) — vowels are more distinctive/memorable than consonants,
// so mixing them in would make this pool inconsistently easier to recall
// than NUMBER_POOL, undermining the point of a harder "Extreme" difficulty.
export const LETTER_POOL = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T']

// key is the literal localStorage suffix (nback:best:<key>, nback:history:<key>) — the N itself,
// except extreme's '2L' (2-back, Letters), which must stay distinct from classic's '2' so the two
// don't share a history/best-score bucket despite both being 2-back.
export const NBACK_DIFFICULTIES = {
  classic: { key: '2', label: 'Medium / Classic', n: 2, scoredTrials: 40, isClassic: true, pool: NUMBER_POOL },
  hard: { key: '3', label: 'Hard', n: 3, scoredTrials: 50, pool: NUMBER_POOL },
  veryHard: { key: '4', label: 'Very Hard', n: 4, scoredTrials: 60, pool: NUMBER_POOL },
  extreme: { key: '2L', label: 'Extreme', n: 2, scoredTrials: 70, pool: LETTER_POOL, isLetters: true },
}

export const TARGET_RATIO = 0.3
