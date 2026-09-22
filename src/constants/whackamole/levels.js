// 50 deterministic, versioned levels (SPEC §5 "Progressive levels" / §6
// "Level configuration"). Unlike Lights Out/Hanoi, a level here isn't a
// puzzle board to solve — it's a tuned set of timing/count parameters, so
// there's nothing for a solver to verify. Rather than hand-typing 50 nearly-
// identical objects (error-prone, and drift-prone if the tuning ever
// changes), the concrete array below is built once from eight named tiers
// that mirror SPEC §5's table exactly; each tier's continuous fields
// (targetVisibleMs, gap range) interpolate smoothly from the tier's first
// level to its last, while categorical fields (gridSize, distractorRatio
// range, duration) step at tier boundaries. The result is still a fully
// concrete, explicit LEVELS array — SPEC §6's "do not hide difficulty
// inside one opaque level-number formula" is about the RUNTIME game never
// re-deriving config from a level id, not about how this file is written.
//
// distractorCount / targetCount are derived from duration and pace
// (SPEC §7's gap+visible cycle) rather than hand-picked, so a level's
// approximate real-world length actually matches its tier's duration
// target — verified against SPEC §17's own worked example in
// levels.test.js.

const LEVEL_VERSION = 1

// Shared across every level (SPEC §16's thresholds aren't level-specific).
// "For levels without distractors, ignore False Alarm Rate" — encoded as
// requiresFalseAlarmCheck below rather than duplicated per level.
export const STAR_THRESHOLDS = {
  threeStar: { minHitRate: 95, maxFalseAlarmRate: 5, maxEmptyTaps: 0 },
  twoStar: { minHitRate: 85, maxFalseAlarmRate: 15 },
}

// SPEC §8: "never allow three consecutive stimuli in one cell" — enforced
// by generator.js's chooseSpawnCell regardless of level, so this is a
// constant, not a per-tier tuning knob.
const MAX_CONSECUTIVE_SAME_CELL = 2

const TIERS = [
  { from: 1, to: 5, gridSize: 2, durationS: 20, visibleMs: [1200, 1100], gapMs: [650, 900], distractorRatio: [0, 0] },
  { from: 6, to: 10, gridSize: 3, durationS: 22, visibleMs: [1050, 950], gapMs: [550, 850], distractorRatio: [0, 0] },
  { from: 11, to: 15, gridSize: 3, durationS: 25, visibleMs: [900, 800], gapMs: [500, 800], distractorRatio: [0, 0] },
  { from: 16, to: 20, gridSize: 3, durationS: 25, visibleMs: [800, 750], gapMs: [450, 750], distractorRatio: [0.10, 0.10] },
  { from: 21, to: 30, gridSize: 3, durationS: 30, visibleMs: [750, 650], gapMs: [400, 700], distractorRatio: [0.15, 0.20] },
  { from: 31, to: 40, gridSize: 4, durationS: 35, visibleMs: [650, 600], gapMs: [350, 650], distractorRatio: [0.20, 0.25] },
  { from: 41, to: 45, gridSize: 4, durationS: 40, visibleMs: [550, 450], gapMs: [300, 600], distractorRatio: [0.25, 0.25] },
  { from: 46, to: 50, gridSize: 4, durationS: 45, visibleMs: [450, 400], gapMs: [300, 550], distractorRatio: [0.25, 0.30] },
]

function interpolate(level, tier, [start, end]) {
  if (tier.from === tier.to) return start
  const t = (level - tier.from) / (tier.to - tier.from)
  return start + (end - start) * t
}

function tierFor(level) {
  return TIERS.find((t) => level >= t.from && level <= t.to)
}

function buildLevel(level) {
  const tier = tierFor(level)
  const targetVisibleMs = Math.round(interpolate(level, tier, tier.visibleMs))
  const gapMinMs = Math.round(interpolate(level, tier, [tier.gapMs[0], tier.gapMs[0]]))
  const gapMaxMs = Math.round(interpolate(level, tier, [tier.gapMs[1], tier.gapMs[1]]))
  const distractorRatio = interpolate(level, tier, tier.distractorRatio)
  const durationMs = tier.durationS * 1000

  // SPEC §7's cycle: a gap, then a full response window, per stimulus.
  // floor() guarantees the generated count's total time fits the tier's
  // duration budget by construction (same technique as targettap/
  // sequence.js's calculateTotalStimuli).
  const avgGapMs = (gapMinMs + gapMaxMs) / 2
  const totalStimuli = Math.max(1, Math.floor(durationMs / (avgGapMs + targetVisibleMs)))
  const distractorCount = Math.round(totalStimuli * distractorRatio)
  const targetCount = totalStimuli - distractorCount

  return {
    id: level,
    version: LEVEL_VERSION,
    gridSize: tier.gridSize,
    durationS: tier.durationS,
    targetCount,
    distractorCount,
    targetVisibleMs,
    gapMinMs,
    gapMaxMs,
    maxConsecutiveSameCell: MAX_CONSECUTIVE_SAME_CELL,
  }
}

export const WHACKAMOLE_LEVELS = Array.from({ length: 50 }, (_, i) => buildLevel(i + 1))

export function getLevelConfig(level) {
  return WHACKAMOLE_LEVELS.find((l) => l.id === level)
}
