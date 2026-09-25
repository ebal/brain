// Per-game domain merge rules for the sync merge engine (BRAIN-SYNC-SPEC
// §23-§27). Declarative on purpose: each rule restates, field for field,
// the comparison the game's own useXStats.js already uses when deciding
// whether a new result is a personal best — so a merged best is exactly
// the result the game itself would have kept had it seen both sessions.
// mergeEngine.test.js cross-checks every rule below against the real
// recorders, so a game changing its comparator without updating this file
// fails a test instead of silently diverging.
//
// An order is a list of [field, direction] compared lexicographically:
//   'max'  higher wins        'min'  lower wins
//   'true' true beats false (e.g. a cleared board beats an uncleared one)
// Timestamps never appear in an order (§23: "do not use timestamps to
// decide which achievement is better").
//
// `eligible` re-validates a record's provenance (§24): a record that
// couldn't legitimately have been set (e.g. a Best Median RT from a round
// under the accuracy floor) is treated as absent rather than merged.

import { RT_ELIGIBILITY_ACCURACY } from '../mentalrotation/useMentalRotationStats.js'
import { RT_BEST_MIN_ACCURACY } from '../oddoneout/useOddOneOutStats.js'
import { RT_BEST_MIN_HIT_RATE, RT_BEST_MAX_FALSE_ALARM_RATE } from '../targettap/useTargetTapStats.js'
import { HANOI_LEVELS } from '../../constants/hanoi/levels.js'
import { LIGHTSOUT_LEVELS } from '../../constants/lightsout/levels.js'
import { EMOJIMAHJONG_LEVELS } from '../../constants/emojimahjong/levels.js'
import { WHACKAMOLE_LEVELS } from '../../constants/whackamole/levels.js'
import { FLAGS_LEVELS } from '../../constants/flags/levels.js'

// Re-exported for callers that already import the rest of the rules from here.
export { isDeviceLocalKey } from '../../constants/storageKeys.js'

const clean = (record) => record.hints === 0

const CLEAN_TIME = { order: [['time', 'min'], ['mistakes', 'min']] }
const HANOI_BEST = { order: [['moves', 'min'], ['hints', 'min'], ['mistakes', 'min'], ['undos', 'min'], ['duration', 'min']] }
const LIGHTSOUT_BEST = { order: [['moves', 'min'], ['hints', 'min'], ['undos', 'min'], ['duration', 'min']] }
const MAHJONG_BEST = { order: [['stars', 'max'], ['score', 'max'], ['undos', 'min'], ['time', 'min']] }
const MARBLE_BEST = { order: [['remaining', 'min'], ['hints', 'min'], ['undos', 'min'], ['time', 'min']] }

// `<game>:stats:<scope>` — best-record fields per game. Every other field in
// a stats object (started/completed/clean counters, running totals,
// streaks, the completions[] sample list) is merged generically: see
// mergeEngine.js's mergeGeneric.
export const STATS_BEST_RULES = {
  sudoku: { bestCleanTime: CLEAN_TIME },
  set: { bestCleanTime: CLEAN_TIME },
  'sequence-memory': {
    bestResult: { order: [['longestSequence', 'max'], ['mistakes', 'min'], ['accuracy', 'max'], ['medianTapTime', 'min']] },
  },
  switchtrail: {
    bestScore: { order: [['score', 'max'], ['completed', 'true'], ['errors', 'min'], ['completionTime', 'min'], ['accuracy', 'max']] },
    bestCompletionTime: { order: [['completionTime', 'min']] },
  },
  memorypairs: {
    bestScore: { order: [['score', 'max'], ['moves', 'min'], ['mistakes', 'min'], ['completionTime', 'min']] },
    bestCompletionTime: { order: [['completionTime', 'min']] },
    bestMoveEfficiency: { order: [['moveEfficiency', 'max']] },
  },
  marblejump: {
    bestResult: MARBLE_BEST,
    bestCleanResult: { ...MARBLE_BEST, eligible: clean },
  },
  mentalrotation: {
    bestScore: { order: [['score', 'max'], ['accuracy', 'max'], ['medianRT', 'min'], ['correct', 'max']] },
    bestAccuracy: { order: [['accuracy', 'max']] },
    bestMedianRT: { order: [['medianRT', 'min']], eligible: (r) => r.accuracy >= RT_ELIGIBILITY_ACCURACY && r.medianRT > 0 },
  },
  numbermatch: {
    bestScore: { order: [['score', 'max'], ['cleared', 'true'], ['undos', 'min'], ['completionTime', 'min']] },
    bestCleanScore: { order: [['score', 'max']] },
    bestClearTime: { order: [['completionTime', 'min']] },
  },
  oddoneout: {
    bestScore: { order: [['score', 'max'], ['accuracy', 'max'], ['correct', 'max'], ['medianCorrectRT', 'min']] },
    bestAccuracy: { order: [['accuracy', 'max']] },
    bestTrialCount: { order: [['trials', 'max']] },
    bestMedianCorrectRT: { order: [['medianCorrectRT', 'min']], eligible: (r) => r.accuracy >= RT_BEST_MIN_ACCURACY },
  },
  targettap: {
    bestScore: { order: [['score', 'max'], ['hitRate', 'max'], ['falseAlarmRate', 'min'], ['medianHitRT', 'min']] },
    bestHitRate: { order: [['hitRate', 'max']] },
    bestFalseAlarmRate: { order: [['falseAlarmRate', 'min']] },
    bestMedianHitRT: {
      order: [['medianHitRT', 'min']],
      eligible: (r) => r.hitRate >= RT_BEST_MIN_HIT_RATE && r.falseAlarmRate <= RT_BEST_MAX_FALSE_ALARM_RATE,
    },
  },
  hanoi: { best: HANOI_BEST, bestClean: { ...HANOI_BEST, eligible: clean } },
  lightsout: { best: LIGHTSOUT_BEST, bestClean: { ...LIGHTSOUT_BEST, eligible: clean } },
  emojimahjong: { best: MAHJONG_BEST, bestClean: { ...MAHJONG_BEST, eligible: clean } },
  whackamole: { best: { order: [['stars', 'max'], ['score', 'max'], ['medianHitRT', 'min']] } },
  flagsoftheworld: { best: { order: [['stars', 'max'], ['correctCount', 'max'], ['duration', 'min']] } },
}

// Emoji Mahjong's stats keys are only level-scoped (`emojimahjong:stats:<n>`)
// since the campaign replaced the difficulty game — the retired
// `emojimahjong:stats:<difficulty>` records have a different best shape and
// fall back to the generic merge instead of these rules.
export function statsRulesFor(game, scope) {
  if (game === 'emojimahjong' && !/^\d+$/.test(scope)) return null
  return STATS_BEST_RULES[game] ?? null
}

// `<game>:best:<...>` — standalone best-record keys (the three oldest games).
export const BEST_KEY_RULES = {
  stroop: { order: [['score', 'max']] },
  schulte: { order: [['completionTime', 'min']] }, // zero-error rounds only, enforced at write time (no error field stored)
  nback: { order: [['score', 'max'], ['accuracy', 'max'], ['medianRT', 'min']] },
}

// `<game>:progress` — campaign games. `derived` fields are recomputed from
// the merged state rather than merged (§25): completion is the source of
// truth, highest-unlocked and star totals follow from it.
export const LEVEL_GAMES = {
  hanoi: { levelCount: HANOI_LEVELS.length },
  lightsout: { levelCount: LIGHTSOUT_LEVELS.length },
  emojimahjong: { levelCount: EMOJIMAHJONG_LEVELS.length },
  whackamole: { levelCount: WHACKAMOLE_LEVELS.length },
  flagsoftheworld: { levelCount: FLAGS_LEVELS.length },
}
