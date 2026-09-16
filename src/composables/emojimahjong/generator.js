// Board generation (Level-SPEC §11, §12) — no Vue, no storage. Local seeded
// PRNG (mulberry32), duplicated rather than imported from another game's
// composables per this codebase's existing convention (see e.g.
// mentalrotation/trialGenerator.js).
import { getFreeTiles, getLayout } from './board.js'
import { EMOJIMAHJONG_EMOJI } from '../../constants/emojimahjong/emojiPool.js'
import { getLevelConfig } from '../../constants/emojimahjong/levels.js'

function mulberry32(seed) {
  let a = seed >>> 0
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
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Finds a full clearing order for a layout's bare geometry — a sequence of
// N/2 steps, each removing two tiles that are BOTH free at that moment,
// ending with the board empty. Emoji identity plays no part here: any two
// currently-free tiles can be treated as a "virtual pair", since we choose
// the emoji assignment afterward (SPEC §8's preferred "reverse-generate a
// solvable pair-removal order" strategy). Exhaustive DFS with memoization
// on the remaining-tile bitmask (1 bit = tile still present); a node budget
// guards against a pathological/misconfigured layout hanging the caller —
// every curated layout in constants/emojimahjong/layouts.js is regular
// enough (see generator.test.js) that this resolves with little to no
// backtracking in practice.
export function findClearingOrder(layoutId, rng, { nodeBudget = 200000 } = {}) {
  const n = getLayout(layoutId).slots.length
  const fullMask = n === 64 ? (1n << 64n) - 1n : (1n << BigInt(n)) - 1n
  const unsolvable = new Set()
  const order = []
  let nodes = 0

  function stateFromMask(mask) {
    const removed = new Array(n)
    for (let i = 0; i < n; i++) removed[i] = !((mask >> BigInt(i)) & 1n)
    return { layoutId, removed, emoji: new Array(n).fill(null) }
  }

  function dfs(mask) {
    if (mask === 0n) return true
    if (unsolvable.has(mask)) return false
    nodes += 1
    if (nodes > nodeBudget) return false

    const free = getFreeTiles(stateFromMask(mask))
    if (free.length < 2) {
      unsolvable.add(mask)
      return false
    }

    const pairs = []
    for (let a = 0; a < free.length; a++) {
      for (let b = a + 1; b < free.length; b++) pairs.push([free[a], free[b]])
    }

    for (const [a, b] of shuffle(pairs, rng)) {
      const newMask = mask & ~(1n << BigInt(a)) & ~(1n << BigInt(b))
      order.push([a, b])
      if (dfs(newMask)) return true
      order.pop()
    }
    unsolvable.add(mask)
    return false
  }

  return dfs(fullMask) ? order.slice() : null
}

// SPEC §8/§9: rejects nothing — the clearing order is built first, then
// emoji are assigned onto it, so the result is solvable by construction.
export function generateSolvableBoard(layoutId, seed) {
  const layout = getLayout(layoutId)
  const n = layout.slots.length
  const pairCount = n / 2
  const rng = makeRng(seed)

  const order = findClearingOrder(layoutId, rng)
  if (!order) throw new Error(`Emoji Mahjong: no clearing order found for layout ${layoutId}`)

  if (pairCount > EMOJIMAHJONG_EMOJI.length) {
    throw new Error(`Emoji Mahjong: pairCount ${pairCount} exceeds emoji pool size ${EMOJIMAHJONG_EMOJI.length}`)
  }
  const chosenEmoji = shuffle(EMOJIMAHJONG_EMOJI, rng).slice(0, pairCount)

  const emoji = new Array(n).fill(null)
  order.forEach(([a, b], idx) => {
    emoji[a] = chosenEmoji[idx]
    emoji[b] = chosenEmoji[idx]
  })

  return { layoutId, removed: new Array(n).fill(false), emoji }
}

// Looks up the level's fixed {layoutId, seed} and generates its board — the
// single entry point useEmojiMahjongGame needs to start a level (Level-SPEC
// §10: "the level's layout + deterministic assignment must reproduce the
// same starting puzzle" — no randomness at all here, unlike the old
// difficulty-based generateGame() this replaces).
export function generateLevelBoard(level) {
  const config = getLevelConfig(level)
  if (!config) throw new Error(`Unknown Emoji Mahjong level: ${level}`)

  const board = generateSolvableBoard(config.layoutId, config.seed)
  return { layoutId: config.layoutId, seed: config.seed, version: config.version, board }
}
