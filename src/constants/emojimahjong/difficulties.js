import { EMOJIMAHJONG_LAYOUTS } from './layouts.js'

function layoutIdsFor(difficultyKey) {
  return EMOJIMAHJONG_LAYOUTS.filter((l) => l.difficulty === difficultyKey).map((l) => l.id)
}

// veryHard's `.key` is hyphenated ('very-hard'), matching the convention
// already established by memorypairs/schulte's own veryHard entries.
//
// extreme/master are a v2 addition — user feedback that Very Hard felt easy
// even at its hardest, plus a request for a couple more tiers above it. See
// layouts.js's plazaPeak() comment for the redesign that also deepened
// Hard/Very Hard's own layouts (2-4 layers -> 5), which extreme/master
// build further on (5-6 layers, and materially less simultaneously-free
// board at the start).
export const EMOJIMAHJONG_DIFFICULTIES = {
  easy: { key: 'easy', label: 'Easy', tiles: 24, pairs: 12, baseScore: 3000, layoutIds: layoutIdsFor('easy') },
  medium: { key: 'medium', label: 'Medium', tiles: 36, pairs: 18, baseScore: 5000, layoutIds: layoutIdsFor('medium') },
  hard: { key: 'hard', label: 'Hard', tiles: 48, pairs: 24, baseScore: 7500, layoutIds: layoutIdsFor('hard') },
  veryHard: {
    key: 'very-hard',
    label: 'Very Hard',
    tiles: 64,
    pairs: 32,
    baseScore: 10000,
    layoutIds: layoutIdsFor('very-hard'),
  },
  extreme: {
    key: 'extreme',
    label: 'Extreme',
    tiles: 80,
    pairs: 40,
    baseScore: 12500,
    layoutIds: layoutIdsFor('extreme'),
  },
  master: {
    key: 'master',
    label: 'Master',
    tiles: 100,
    pairs: 50,
    baseScore: 15000,
    layoutIds: layoutIdsFor('master'),
  },
}

export function getDifficultyConfig(difficultyKey) {
  return Object.values(EMOJIMAHJONG_DIFFICULTIES).find((d) => d.key === difficultyKey)
}
