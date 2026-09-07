// Target counts and time limits per SPEC §2 — targetCount is always even
// (numbers 1..N alternating with letters A..N) so createTrailSequence() can
// split it into equal number/letter halves without a remainder.
//
// Extreme is a v2 addition on top of the original spec: same target count
// and time limit as Hard, but `dynamic: true` makes every still-pending
// target jump to a new random position after each correct tap — pure
// search/switching under constantly shifting positions, no reliance on
// remembered layout at all.
export const SWITCHTRAIL_DIFFICULTIES = {
  easy: { key: 'easy', label: 'Easy', targetCount: 12, timeLimit: 30, dynamic: false },
  medium: { key: 'medium', label: 'Medium', targetCount: 16, timeLimit: 45, dynamic: false },
  hard: { key: 'hard', label: 'Hard', targetCount: 24, timeLimit: 90, dynamic: false },
  extreme: { key: 'extreme', label: 'Extreme', targetCount: 24, timeLimit: 90, dynamic: true },
}
