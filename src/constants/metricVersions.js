// Per-game metric versioning, stamped onto every newly written history entry
// (see each game's useXStats.js / useScoreHistory.js) so that if a game's
// score formula or measurement definition ever changes meaningfully, that
// game's number here can be bumped without silently mixing old- and
// new-definition sessions into the same trend/average.
//
// Keys match the `game` identifier strings already used throughout the app
// (sessionModel.js's `game:` field, GAME_LABELS) — not a separate naming
// scheme.
//
// Bumping a version here does NOT retroactively rewrite already-stored
// history — old entries simply predate this field entirely and are treated
// as version 1 wherever it's read (see sessionModel.js's `?? 1` fallback).
export const METRIC_VERSIONS = {
  stroop: 1,
  schulte: 1,
  nback: 1,
  sudoku: 1,
  set: 1,
  'sequence-memory': 1,
  switchtrail: 1,
  memorypairs: 1,
  marblejump: 1,
  mentalrotation: 1,
  // Bumped to 2: the difficulty-based game was fully replaced by a 50-level
  // campaign (Emoji-Mahjong-Level-SPEC.md) — score formula, Stars, and even
  // what a "session" identifies (level number, not a difficulty key) all
  // changed, so old difficulty-based history must never be silently mixed
  // into a level-based trend/average.
  emojimahjong: 2,
  numbermatch: 1,
  oddoneout: 1,
  targettap: 1,
  hanoi: 1,
  lightsout: 1,
  whackamole: 1,
  flagsoftheworld: 1,
}
