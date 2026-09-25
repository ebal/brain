// Level-definition versions for the campaign games (BRAIN-SYNC-SPEC §26),
// separate from schemaVersion, appVersion and each game's metricVersion.
//
// Bump a level's version only when that level changes MATERIALLY (a
// different board, disk count, target set…) so its old best time/moves are
// no longer comparable. Completion and unlocks are never affected: a level
// completed under any version stays completed. Only the personal best
// comparison respects the version (a best set on the current definition
// supersedes one set on an older one — see sync/mergeEngine.js pickBest).
//
//   emojimahjong: { default: 1, overrides: { 12: 2 } }  // level 12 was redesigned
export const LEVEL_VERSIONS = {
  hanoi: { default: 1, overrides: {} },
  lightsout: { default: 1, overrides: {} },
  emojimahjong: { default: 1, overrides: {} },
  whackamole: { default: 1, overrides: {} },
  flagsoftheworld: { default: 1, overrides: {} },
}

export function levelVersionOf(game, level) {
  const entry = LEVEL_VERSIONS[game]
  if (!entry || level == null) return undefined
  return entry.overrides[level] ?? entry.default
}
