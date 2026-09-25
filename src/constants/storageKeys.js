// Every localStorage key prefix Brain owns, in one place — shared by
// dataPortability.js (export/import/delete) and persistence/migrations.js
// (schema upgrades), so a newly added game can't be seen by one and missed
// by the other.

export const GAME_PREFIXES = ['stroop:', 'schulte:', 'nback:', 'sudoku:', 'set:', 'sequence-memory:', 'switchtrail:', 'memorypairs:', 'marblejump:', 'mentalrotation:', 'emojimahjong:', 'numbermatch:', 'oddoneout:', 'targettap:', 'hanoi:', 'lightsout:', 'whackamole:', 'flagsoftheworld:']

// Prefixes belonging to a feature that has since been removed from the app
// entirely (Benchmark Mode, removed in 6373d5f) — never added to
// GAME_PREFIXES, so Export/Import/describeExport still only ever see
// current games' data. Kept here purely so Delete All Data and the storage-
// footprint estimate can still find and clean up old keys a returning user's
// browser may still be holding, instead of leaving them permanently
// invisible and undeletable. Add a removed feature's old prefix here at
// removal time, so this doesn't need rediscovering by hand again later.
export const DEPRECATED_PREFIXES = ['benchmark:']

// App-level (not per-game) keys. Deliberately outside GAME_PREFIXES: they
// describe this installation, not the player's progress, so they're never
// exported (an imported backup must not clone another device's identity),
// never overwritten by an import, and survive Delete All Data.
export const META_KEY = 'brain:meta' // { schemaVersion, appVersion, migratedAt }
export const DEVICE_KEY = 'brain:device' // { deviceId, createdAt }
export const MIGRATION_BACKUP_KEY = 'brain:migration-backup' // pre-image of an in-flight migration

export function isGameKey(key) {
  return GAME_PREFIXES.some((p) => key.startsWith(p))
}

// Every game's session history lives under `<game>:history` or
// `<game>:history:<...>` (see each game's useXStats.js / useScoreHistory.js)
// — including retired modes' orphaned keys (e.g. emojimahjong:history from
// the difficulty-based game, nback:history:1 from the removed 1-back).
export function isHistoryKey(key) {
  return isGameKey(key) && /^[a-z-]+:history(:|$)/.test(key)
}
