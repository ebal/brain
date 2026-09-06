import { describe, it, expect } from 'vitest'
import { createDeck, shuffleDeck, cardId, makeRng } from './deck.js'

describe('createDeck', () => {
  it('creates exactly 81 cards', () => {
    expect(createDeck()).toHaveLength(81)
  })

  it('creates every unique combination of the four properties exactly once', () => {
    const ids = createDeck().map((c) => cardId(c))
    expect(new Set(ids).size).toBe(81)
  })

  it('only uses property values 0, 1, 2', () => {
    for (const card of createDeck()) {
      for (const prop of ['number', 'shape', 'color', 'shading']) {
        expect(card[prop]).toBeGreaterThanOrEqual(0)
        expect(card[prop]).toBeLessThanOrEqual(2)
      }
    }
  })
})

describe('shuffleDeck', () => {
  it('preserves every card (same multiset, different order allowed)', () => {
    const deck = createDeck()
    const shuffled = shuffleDeck(deck, makeRng(1))
    expect(shuffled).toHaveLength(deck.length)
    expect([...shuffled].map((c) => c.id).sort()).toEqual([...deck].map((c) => c.id).sort())
  })

  it('does not mutate the original array', () => {
    const deck = createDeck()
    const before = deck.map((c) => c.id)
    shuffleDeck(deck, makeRng(1))
    expect(deck.map((c) => c.id)).toEqual(before)
  })

  it('is deterministic for a given seed', () => {
    const deck = createDeck()
    const a = shuffleDeck(deck, makeRng(42)).map((c) => c.id)
    const b = shuffleDeck(deck, makeRng(42)).map((c) => c.id)
    expect(a).toEqual(b)
  })

  it('produces a different order for a different seed (sanity, not a strict guarantee)', () => {
    const deck = createDeck()
    const a = shuffleDeck(deck, makeRng(1)).map((c) => c.id)
    const b = shuffleDeck(deck, makeRng(2)).map((c) => c.id)
    expect(a).not.toEqual(b)
  })
})

describe('makeRng', () => {
  it('returns a deterministic generator for a numeric seed', () => {
    const a = makeRng(7)
    const b = makeRng(7)
    const seqA = Array.from({ length: 5 }, () => a())
    const seqB = Array.from({ length: 5 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('produces values in [0, 1)', () => {
    const rng = makeRng(123)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})
