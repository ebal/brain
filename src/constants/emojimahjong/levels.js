// 50 deterministic, versioned levels (Level-SPEC §6/§10). Each entry's
// `layoutId` + `seed` together fully determine the starting board via
// composables/emojimahjong/generator.js's generateSolvableBoard() — the
// same level always reproduces the same puzzle. Every level was chosen by
// a one-off curation script (never hand-typed) and independently
// re-verified — see layouts.js's header comment and levels.test.js, which
// re-runs that verification against the live code on every test run.
//
// Several levels within a tier deliberately reuse the same `layoutId` with
// a different `seed` (e.g. levels 11 and 19 both use 'em-easyplanning-1') —
// a different seed produces a different emoji assignment on the same
// silhouette, which is a genuinely different puzzle to solve, not a
// repeat (Level-SPEC §10's data model separates `layoutId` from the
// level's own `id` for exactly this reason).
export const EMOJIMAHJONG_LEVELS = [
  // Levels 1-4: hand-designed tutorial levels (Level-SPEC §9)
  { level: 1, layoutId: 'em-tutorial-1', seed: 1, version: 1 },
  { level: 2, layoutId: 'em-tutorial-2', seed: 1, version: 1 },
  { level: 3, layoutId: 'em-tutorial-3', seed: 1, version: 1 },
  { level: 4, layoutId: 'em-tutorial-4', seed: 1, version: 1 },

  // Level 5 (8-20 tiles, 1 layer — last of the tutorial tier)
  { level: 5, layoutId: 'em-tutorial-end-1', seed: 5005, version: 1 },

  // Levels 6-10 (20-28 tiles, 1-2 layers — Simple)
  { level: 6, layoutId: 'em-simple-1', seed: 5006, version: 1 },
  { level: 7, layoutId: 'em-simple-2', seed: 5007, version: 1 },
  { level: 8, layoutId: 'em-simple-3', seed: 5008, version: 1 },
  { level: 9, layoutId: 'em-simple-4', seed: 5009, version: 1 },
  { level: 10, layoutId: 'em-simple-5', seed: 5010, version: 1 },

  // Levels 11-20 (28-36 tiles, 2 layers — Easy planning)
  { level: 11, layoutId: 'em-easyplanning-1', seed: 5011, version: 1 },
  { level: 12, layoutId: 'em-easyplanning-2', seed: 5012, version: 1 },
  { level: 13, layoutId: 'em-easyplanning-3', seed: 5013, version: 1 },
  { level: 14, layoutId: 'em-easyplanning-4', seed: 5014, version: 1 },
  { level: 15, layoutId: 'em-easyplanning-5', seed: 5015, version: 1 },
  { level: 16, layoutId: 'em-easyplanning-6', seed: 5016, version: 1 },
  { level: 17, layoutId: 'em-easyplanning-7', seed: 5017, version: 1 },
  { level: 18, layoutId: 'em-easyplanning-8', seed: 5018, version: 1 },
  { level: 19, layoutId: 'em-easyplanning-1', seed: 5019, version: 1 },
  { level: 20, layoutId: 'em-easyplanning-2', seed: 5020, version: 1 },

  // Levels 21-30 (36-48 tiles, 2-3 layers — Intermediate)
  { level: 21, layoutId: 'em-intermediate-1', seed: 5021, version: 1 },
  { level: 22, layoutId: 'em-intermediate-2', seed: 5022, version: 1 },
  { level: 23, layoutId: 'em-intermediate-3', seed: 5023, version: 1 },
  { level: 24, layoutId: 'em-intermediate-4', seed: 5024, version: 1 },
  { level: 25, layoutId: 'em-intermediate-5', seed: 5025, version: 1 },
  { level: 26, layoutId: 'em-intermediate-6', seed: 5026, version: 1 },
  { level: 27, layoutId: 'em-intermediate-7', seed: 5027, version: 1 },
  { level: 28, layoutId: 'em-intermediate-8', seed: 5028, version: 1 },
  { level: 29, layoutId: 'em-intermediate-1', seed: 5029, version: 1 },
  { level: 30, layoutId: 'em-intermediate-2', seed: 5030, version: 1 },

  // Levels 31-40 (48-56 tiles, 3 layers — Hard)
  { level: 31, layoutId: 'em-hard-1', seed: 5031, version: 1 },
  { level: 32, layoutId: 'em-hard-2', seed: 5032, version: 1 },
  { level: 33, layoutId: 'em-hard-3', seed: 5033, version: 1 },
  { level: 34, layoutId: 'em-hard-4', seed: 5034, version: 1 },
  { level: 35, layoutId: 'em-hard-5', seed: 5035, version: 1 },
  { level: 36, layoutId: 'em-hard-6', seed: 5036, version: 1 },
  { level: 37, layoutId: 'em-hard-7', seed: 5037, version: 1 },
  { level: 38, layoutId: 'em-hard-8', seed: 5038, version: 1 },
  { level: 39, layoutId: 'em-hard-1', seed: 5039, version: 1 },
  { level: 40, layoutId: 'em-hard-2', seed: 5040, version: 1 },

  // Levels 41-45 (56-64 tiles, 3-4 layers — Deep dependencies)
  { level: 41, layoutId: 'em-deep-1', seed: 5041, version: 1 },
  { level: 42, layoutId: 'em-deep-2', seed: 5042, version: 1 },
  { level: 43, layoutId: 'em-deep-3', seed: 5043, version: 1 },
  { level: 44, layoutId: 'em-deep-4', seed: 5044, version: 1 },
  { level: 45, layoutId: 'em-deep-5', seed: 5045, version: 1 },

  // Levels 46-50 (64-72 tiles, 4+ layers — Advanced)
  { level: 46, layoutId: 'em-advanced-1', seed: 5046, version: 1 },
  { level: 47, layoutId: 'em-advanced-2', seed: 5047, version: 1 },
  { level: 48, layoutId: 'em-advanced-3', seed: 5048, version: 1 },
  { level: 49, layoutId: 'em-advanced-4', seed: 5049, version: 1 },
  { level: 50, layoutId: 'em-advanced-5', seed: 5050, version: 1 },
]

export function getLevelConfig(level) {
  return EMOJIMAHJONG_LEVELS.find((l) => l.level === level)
}
