// Deck generation — pure, no Vue dependency (SPEC §5/§6). Same mulberry32
// seeded-PRNG shape used by set/deck.js, sudoku/sudokuGenerator.js, and
// switchtrail/trailLayout.js.
import { EMOJI_POOL } from '../../constants/memorypairs/emoji.js'

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

export function selectEmojiPairs(pairCount, pool = EMOJI_POOL, rng = Math.random) {
  if (pairCount > pool.length) {
    throw new Error(`selectEmojiPairs: pairCount ${pairCount} exceeds pool size ${pool.length}`)
  }
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, pairCount)
}

export function shuffleMemoryDeck(tiles, rng = Math.random) {
  const a = [...tiles]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Returns 2N face-down tiles ({ id, emoji, state }), shuffled — one deck
// generation call, no further randomization once a round starts (SPEC §5:
// "Tile positions never change after the game starts").
export function createMemoryDeck(pairCount, seed) {
  const rng = makeRng(seed)
  const emojis = selectEmojiPairs(pairCount, EMOJI_POOL, rng)
  const tiles = emojis.flatMap((emoji, pairIndex) => [
    { id: `${pairIndex}-a`, emoji, state: 'facedown' },
    { id: `${pairIndex}-b`, emoji, state: 'facedown' },
  ])
  return shuffleMemoryDeck(tiles, rng)
}

export function validateMemoryDeck(deck, pairCount) {
  if (deck.length !== pairCount * 2) return false
  const counts = new Map()
  for (const tile of deck) {
    counts.set(tile.emoji, (counts.get(tile.emoji) || 0) + 1)
  }
  if (counts.size !== pairCount) return false
  for (const count of counts.values()) {
    if (count !== 2) return false
  }
  return true
}
