// Pure per-country learning-state logic — no Vue dependency (Flags-of-the-
// World SPEC §14-§16). Deliberately simple/versionable thresholds (SPEC
// §14: "keep exact heuristics simple and versionable") rather than a tuned
// spaced-repetition model.

// A sustained correct streak, not one lucky answer, is required for
// Mastered (SPEC §14).
const MASTERY_STREAK_REQUIRED = 3

function defaultState() {
  return {
    attempts: 0,
    correct: 0,
    wrong: 0,
    currentCorrectStreak: 0,
    lastSeenAt: null,
    lastWrongAt: null,
    mastery: 'new',
    confusions: {},
  }
}

// state: a country's learning record (or null/undefined for never-seen).
// answer: { correct: boolean, wrongCode?: string, timestamp: number }.
// Returns the updated record; does not mutate `state`.
export function updateCountryLearning(state, answer) {
  const prev = state ?? defaultState()
  const next = {
    attempts: prev.attempts + 1,
    correct: prev.correct + (answer.correct ? 1 : 0),
    wrong: prev.wrong + (answer.correct ? 0 : 1),
    currentCorrectStreak: answer.correct ? prev.currentCorrectStreak + 1 : 0,
    lastSeenAt: answer.timestamp,
    lastWrongAt: answer.correct ? prev.lastWrongAt : answer.timestamp,
    confusions: { ...prev.confusions },
  }
  // SPEC §15: "store which wrong country was selected" for confusion learning.
  if (!answer.correct && answer.wrongCode) {
    next.confusions[answer.wrongCode] = (next.confusions[answer.wrongCode] ?? 0) + 1
  }
  next.mastery = calculateMastery(next)
  return next
}

// SPEC §14's four states. A streak reset to 0 (i.e. the most recent answer
// was wrong) marks Needs Practice; reaching MASTERY_STREAK_REQUIRED
// consecutive correct answers marks Mastered; anything in between (seen,
// not yet mastered, not currently missed) is Learning.
export function calculateMastery(countryState) {
  if (!countryState || countryState.attempts === 0) return 'new'
  if (countryState.currentCorrectStreak === 0) return 'needs-practice'
  if (countryState.currentCorrectStreak >= MASTERY_STREAK_REQUIRED) return 'mastered'
  return 'learning'
}
