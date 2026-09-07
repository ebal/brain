// Per-game metric versioning — the session-level analog of BENCHMARK_VERSION
// (constants/benchmark.js). Stamped onto every newly written history entry
// (see each game's useXStats.js / useScoreHistory.js) so that if a game's
// score formula or measurement definition ever changes meaningfully, that
// game's number here can be bumped without silently mixing old- and
// new-definition sessions into the same trend/average.
//
// Keys match the `game` identifier strings already used throughout the app
// (sessionModel.js's `game:` field, GAME_LABELS, METRIC_DIRECTION,
// BENCHMARK_CONFIGS) — not a separate naming scheme.
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
}
