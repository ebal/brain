// Board generation (SPEC §8, §10) — no Vue, no storage. Local seeded PRNG
// (mulberry32), duplicated rather than imported from another game's
// composables per this codebase's existing convention (see e.g.
// mentalrotation/trialGenerator.js).
import { getFreeTiles, getLayout } from './board.js'
import { EMOJIMAHJONG_EMOJI } from '../../constants/emojimahjong/emojiPool.js'
import { EMOJIMAHJONG_DIFFICULTIES } from '../../constants/emojimahjong/difficulties.js'

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

// Picks a random curated layout for the difficulty, then generates a
// solvable board for it — the single entry point useEmojiMahjongGame needs
// to start a new round (SPEC §6's "seed + difficulty → same board").
export function generateGame(difficultyKey, seed) {
  const pickRng = makeRng(seed)
  const config = Object.values(EMOJIMAHJONG_DIFFICULTIES).find((d) => d.key === difficultyKey)
  if (!config) throw new Error(`Unknown Emoji Mahjong difficulty: ${difficultyKey}`)

  const layoutId = config.layoutIds[Math.floor(pickRng() * config.layoutIds.length)]
  const boardSeed = Math.floor(pickRng() * 2 ** 31)
  const board = generateSolvableBoard(layoutId, boardSeed)
  return { layoutId, board }
}
