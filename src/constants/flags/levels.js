// 50 deterministic, versioned levels (Flags-of-the-World SPEC §7). A level
// here isn't tuned timing (cf. whackamole/levels.js) — it's a concrete,
// cumulative country pool plus a distractor tier. Pools are cumulative
// (each tier's pool = itself + every prior tier's) so previously-introduced
// countries keep reappearing for reinforcement, per SPEC §7's own
// instruction, rather than being dropped once a later tier starts.
//
// "Do not hide difficulty inside an opaque level-number formula" (SPEC §7)
// is satisfied the same way whackamole/levels.js satisfies it: the TIERS
// table below is the one place tuning lives, and FLAGS_LEVELS is the fully
// concrete, inspectable result — nothing downstream re-derives a level's
// pool from its id.
import { COUNTRIES } from './countries.js'

export const LEVEL_VERSION = 1

// SPEC §18: accuracy dominates, no speed component. Expressed as
// correct-count thresholds (out of a 10-question level, SPEC §7) rather
// than whackamole's hit-rate/false-alarm shape, since this game has no
// distractor stimuli to false-alarm on.
export const STAR_THRESHOLDS = {
  threeStar: { minCorrect: 10 }, // 10/10
  twoStar: { minCorrect: 8 }, // 8-9/10
  // Anything else that completes the level (0-7/10) is one star.
}

// SPEC §7 §9: tier 1 hand-picks ~15 maximally-recognizable flags spanning
// every region (not itself a "region" — this is the one pool that isn't
// built by region name), tiers 2-6 each add one real-world region, and by
// tier 6 the cumulative pool already equals the full dataset (Europe +
// Americas + Asia + Africa + Oceania = every shipped country) — tiers 7-9
// keep the full pool and escalate only distractorTier, matching SPEC §7's
// table where 31-50 are "whole-world mixed" / "confusing" / "mastery", not
// pool changes.
const ICONIC_CODES = ['us', 'gb', 'fr', 'jp', 'ca', 'br', 'de', 'it', 'cn', 'za', 'au', 'ch', 'in', 'mx', 'gr']

const TIERS = [
  { from: 1, to: 5, addRegions: [], addCodes: ICONIC_CODES, distractorTier: 1 },
  { from: 6, to: 10, addRegions: ['Europe'], distractorTier: 2 },
  { from: 11, to: 15, addRegions: ['Americas'], distractorTier: 2 },
  { from: 16, to: 20, addRegions: ['Asia'], distractorTier: 2 },
  { from: 21, to: 25, addRegions: ['Africa'], distractorTier: 3 },
  { from: 26, to: 30, addRegions: ['Oceania'], distractorTier: 3 },
  { from: 31, to: 40, addRegions: [], distractorTier: 3 }, // full pool already, mixed world review
  { from: 41, to: 45, addRegions: [], distractorTier: 4 }, // confusion-heavy
  { from: 46, to: 50, addRegions: [], distractorTier: 4 }, // hardest confusion sets, mastery
]

function tierFor(level) {
  return TIERS.find((t) => level >= t.from && level <= t.to)
}

// Cumulative pool as of (and including) a given tier — every region/code
// added by this tier or any earlier one.
function poolThroughTier(tierIndex) {
  const codes = new Set()
  for (let i = 0; i <= tierIndex; i++) {
    const tier = TIERS[i]
    for (const code of tier.addCodes ?? []) codes.add(code)
    for (const region of tier.addRegions) {
      for (const c of COUNTRIES) {
        if (c.region === region) codes.add(c.code)
      }
    }
  }
  return [...codes]
}

function buildLevel(level) {
  const tierIndex = TIERS.findIndex((t) => level >= t.from && level <= t.to)
  const tier = TIERS[tierIndex]
  return {
    id: level,
    version: LEVEL_VERSION,
    countryPool: poolThroughTier(tierIndex),
    distractorTier: tier.distractorTier,
    questionCount: 10,
  }
}

export const FLAGS_LEVELS = Array.from({ length: 50 }, (_, i) => buildLevel(i + 1))

export function getLevelConfig(level) {
  return FLAGS_LEVELS.find((l) => l.id === level)
}
