// Pure question-generation logic — no Vue dependency (Flags-of-the-World
// SPEC §11, §25, §26). Deterministic PRNG (mulberry32), same shape used
// throughout the project (see whackamole/generator.js, targettap/sequence.js,
// nback/sequence.js, ...) — this codebase deliberately duplicates a small
// RNG per game rather than sharing one.
import { COUNTRIES } from '../../constants/flags/countries.js'
import { CONFUSION_CLUSTERS } from '../../constants/flags/confusionSets.js'
import { getCountry } from './dataset.js'

function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeRng(seed) {
  return typeof seed === 'number' ? mulberry32(seed) : Math.random
}

function shuffle(arr, rng) {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function clustersContaining(code) {
  return CONFUSION_CLUSTERS.filter((cluster) => cluster.includes(code))
}

function weightFor(country, learningState) {
  // SPEC §15: weak countries get modestly higher selection weight — applied
  // here to distractor candidates too, not just question targets, since a
  // weak country showing up as a plausible wrong answer is itself review.
  const state = learningState?.[country.code]
  return state?.mastery === 'needs-practice' ? 1.5 : 1
}

function weightedPickFrom(candidates, pickedCodes, learningState, rng) {
  const filtered = candidates.filter((c) => !pickedCodes.has(c.code))
  if (filtered.length === 0) return null
  const weights = filtered.map((c) => weightFor(c, learningState))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < filtered.length; i++) {
    r -= weights[i]
    if (r <= 0) return filtered[i]
  }
  return filtered[filtered.length - 1]
}

// SPEC §9: tier 1 = visually distinct (different pattern family AND
// region), tier 2 = regional distractors (same region), tier 3 = shares
// colors/layout features (same patternTag), tier 4 = curated confusion-set
// members first, falling back to tier-3 similarity to fill any remaining
// slots. Never includes the target itself, never duplicates.
export function selectDistractors(country, tier, learningState, rng) {
  const target = typeof country === 'string' ? getCountry(country) : country
  const pool = COUNTRIES.filter((c) => c.code !== target.code)
  const pickedCodes = new Set()
  const picked = []

  function take(country) {
    if (!country || pickedCodes.has(country.code)) return false
    pickedCodes.add(country.code)
    picked.push(country)
    return true
  }

  if (tier === 4) {
    const clusters = clustersContaining(target.code)
    if (clusters.length > 0) {
      const clusterCodes = new Set()
      for (const cluster of clusters) {
        for (const code of cluster) {
          if (code !== target.code) clusterCodes.add(code)
        }
      }
      const clusterCandidates = shuffle([...clusterCodes].map(getCountry).filter(Boolean), rng)
      for (const c of clusterCandidates) {
        if (picked.length >= 3) break
        take(c)
      }
    }
  }

  while (picked.length < 3) {
    let candidates
    if (tier === 1) {
      candidates = pool.filter((c) => c.patternTag !== target.patternTag && c.region !== target.region)
    } else if (tier === 2) {
      candidates = pool.filter((c) => c.region === target.region)
    } else {
      // tier 3, and tier 4's fallback once confusion-cluster members are exhausted
      candidates = pool.filter((c) => c.patternTag === target.patternTag)
    }

    let pick = weightedPickFrom(candidates, pickedCodes, learningState, rng)
    if (!pick) pick = weightedPickFrom(pool, pickedCodes, learningState, rng)
    if (!pick) break // pool exhausted — never happens with 195 countries and 3 distractors
    take(pick)
  }

  return picked.map((c) => c.code)
}

// SPEC §25: generateQuestion(country, config, rng). config carries
// distractorTier and (optionally) learningState.
export function generateQuestion(country, config, rng) {
  const target = typeof country === 'string' ? getCountry(country) : country
  const distractorCodes = selectDistractors(target, config.distractorTier, config.learningState, rng)
  const choices = shuffle([target.code, ...distractorCodes], rng)
  const correctIndex = choices.indexOf(target.code)
  return { country: target.code, choices, correctIndex }
}

function rotateCorrectTo(question, newPos) {
  const choices = [...question.choices]
  const correctCode = choices[question.correctIndex]
  choices.splice(question.correctIndex, 1)
  choices.splice(newPos, 0, correctCode)
  return { ...question, choices, correctIndex: newPos }
}

function pickRoundTargets(pool, count, rng, learningState) {
  const remaining = [...pool]
  const picked = []
  const n = Math.min(count, remaining.length)
  for (let i = 0; i < n; i++) {
    const weights = remaining.map((c) => {
      const state = learningState?.[c.code]
      if (state?.mastery === 'needs-practice') return 2
      if (!state || state.mastery === 'new') return 1.3
      return 1
    })
    const total = weights.reduce((a, b) => a + b, 0)
    let r = rng() * total
    let idx = remaining.length - 1
    for (let j = 0; j < remaining.length; j++) {
      r -= weights[j]
      if (r <= 0) {
        idx = j
        break
      }
    }
    picked.push(remaining[idx])
    remaining.splice(idx, 1)
  }
  return picked
}

// Builds one full level's worth of questions (SPEC §7: questionCount per
// level, 10 by default). Target countries are distinct within the round (a
// full 10-question round drawn from a pool this large never needs to repeat
// a country, which is itself what satisfies SPEC §26's "no immediate
// failed-country repetition" for a single round — repetition only becomes
// relevant across rounds/Practice Weak Flags, which is useFlagsStats.js's
// concern, not generation). Also enforces SPEC §11's "avoid long position
// streaks": never more than 2 consecutive questions with the correct answer
// in the same grid position.
export function generateRound(levelConfig, seed, learningState) {
  const rng = makeRng(seed)
  const pool = levelConfig.countryPool.map(getCountry).filter(Boolean)
  const targets = pickRoundTargets(pool, levelConfig.questionCount ?? 10, rng, learningState)

  const questions = []
  let streakPos = null
  let streakLen = 0
  for (const target of targets) {
    let question = generateQuestion(target, { distractorTier: levelConfig.distractorTier, learningState }, rng)

    if (question.correctIndex === streakPos) {
      streakLen += 1
      if (streakLen >= 2) {
        const otherPositions = [0, 1, 2, 3].filter((p) => p !== question.correctIndex)
        const newPos = otherPositions[Math.floor(rng() * otherPositions.length)]
        question = rotateCorrectTo(question, newPos)
        streakLen = 0
      }
    } else {
      streakLen = 0
    }
    streakPos = question.correctIndex
    questions.push(question)
  }

  return questions
}
