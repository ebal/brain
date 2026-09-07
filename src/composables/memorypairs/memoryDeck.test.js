import { describe, it, expect } from 'vitest'
import { createMemoryDeck, validateMemoryDeck, selectEmojiPairs, makeRng } from './memoryDeck.js'
import { MEMORYPAIRS_DIFFICULTIES } from '../../constants/memorypairs/difficulties.js'
import { EMOJI_POOL } from '../../constants/memorypairs/emoji.js'

describe('createMemoryDeck', () => {
  it('produces the right tile/pair count for every difficulty, with exactly two of each emoji', () => {
    for (const d of Object.values(MEMORYPAIRS_DIFFICULTIES)) {
      const deck = createMemoryDeck(d.pairs, 1)
      expect(deck).toHaveLength(d.cols * d.rows)
      expect(validateMemoryDeck(deck, d.pairs)).toBe(true)
    }
  })

  it('every tile starts face down with a unique id', () => {
    const deck = createMemoryDeck(8, 1)
    expect(deck.every((t) => t.state === 'facedown')).toBe(true)
    expect(new Set(deck.map((t) => t.id)).size).toBe(deck.length)
  })

  it('a deterministic seed reproduces the exact same deck', () => {
    const a = createMemoryDeck(8, 42)
    const b = createMemoryDeck(8, 42)
    expect(a).toEqual(b)
  })

  it('different seeds produce different decks', () => {
    const a = createMemoryDeck(8, 1)
    const b = createMemoryDeck(8, 2)
    expect(a).not.toEqual(b)
  })

  it('random (unseeded) generation also produces a valid deck', () => {
    const deck = createMemoryDeck(8)
    expect(validateMemoryDeck(deck, 8)).toBe(true)
  })

  it('throws if more pairs are requested than the emoji pool can supply', () => {
    expect(() => createMemoryDeck(EMOJI_POOL.length + 1, 1)).toThrow()
  })
})

describe('selectEmojiPairs', () => {
  it('picks the requested count with no duplicates', () => {
    const rng = makeRng(1)
    const picks = selectEmojiPairs(6, EMOJI_POOL, rng)
    expect(picks).toHaveLength(6)
    expect(new Set(picks).size).toBe(6)
  })
})

describe('validateMemoryDeck', () => {
  it('rejects a deck with the wrong tile count', () => {
    const deck = createMemoryDeck(6, 1).slice(0, -1)
    expect(validateMemoryDeck(deck, 6)).toBe(false)
  })

  it('rejects a deck where an emoji appears once or three times', () => {
    const deck = createMemoryDeck(6, 1)
    const broken = [...deck.slice(0, -1), { ...deck[0], id: 'extra' }] // duplicate an existing emoji a 3rd time, drop another
    expect(validateMemoryDeck(broken, 6)).toBe(false)
  })
})
