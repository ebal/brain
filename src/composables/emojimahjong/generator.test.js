import { describe, it, expect } from 'vitest'
import { findClearingOrder, generateSolvableBoard, generateLevelBoard, makeRng } from './generator.js'
import { getLayout, isTileFree, getAvailablePairs, removePair, isBoardCleared } from './board.js'
import { EMOJIMAHJONG_LAYOUTS } from '../../constants/emojimahjong/layouts.js'

describe('findClearingOrder', () => {
  it.each(EMOJIMAHJONG_LAYOUTS)('finds a full clearing order for $id', (layoutDef) => {
    const order = findClearingOrder(layoutDef.id, makeRng(42))
    expect(order).not.toBeNull()
    expect(order.length).toBe(layoutDef.slots.length / 2)
  })

  it('every step in the order is legal at the moment it is applied', () => {
    const order = findClearingOrder('em-hard-3', makeRng(7))
    const n = getLayout('em-hard-3').slots.length
    let state = { layoutId: 'em-hard-3', removed: new Array(n).fill(false), emoji: new Array(n).fill(null) }
    for (const [a, b] of order) {
      expect(isTileFree(state, a)).toBe(true)
      expect(isTileFree(state, b)).toBe(true)
      state = removePair(state, a, b)
    }
    expect(state.removed.every(Boolean)).toBe(true)
  })
})

describe('generateSolvableBoard', () => {
  it('every emoji in the generated board appears exactly twice', () => {
    const board = generateSolvableBoard('em-simple-1', 123)
    const counts = new Map()
    for (const emoji of board.emoji) counts.set(emoji, (counts.get(emoji) || 0) + 1)
    for (const count of counts.values()) expect(count).toBe(2)
  })

  it('a deterministic seed reproduces the same board (Level-SPEC §10)', () => {
    const a = generateSolvableBoard('em-simple-1', 999)
    const b = generateSolvableBoard('em-simple-1', 999)
    expect(a.emoji).toEqual(b.emoji)
  })

  it('a different seed can produce a different emoji layout', () => {
    const a = generateSolvableBoard('em-simple-1', 1)
    const b = generateSolvableBoard('em-simple-1', 2)
    expect(a.emoji).not.toEqual(b.emoji)
  })

  it('the generated board is fully clearable by always removing an available matching pair', () => {
    // Proves the board is solvable using the ACTUAL emoji-matching rule,
    // not just the geometry-only virtual pairing used to build it.
    let state = generateSolvableBoard('em-hard-1', 55)
    let guard = 0
    while (!isBoardCleared(state)) {
      const pairs = getAvailablePairs(state)
      expect(pairs.length).toBeGreaterThan(0)
      const [a, b] = pairs[0]
      state = removePair(state, a, b)
      guard += 1
      expect(guard).toBeLessThan(1000)
    }
    expect(isBoardCleared(state)).toBe(true)
  })
})

describe('generateLevelBoard', () => {
  it('looks up the level\'s fixed layoutId/seed and generates its board', () => {
    const { layoutId, seed, board } = generateLevelBoard(6)
    expect(layoutId).toBe('em-simple-1')
    expect(seed).toBe(5006)
    expect(board.emoji.length).toBeGreaterThan(0)
  })

  it('the same level always reproduces the same board (Level-SPEC §6/§10)', () => {
    const a = generateLevelBoard(23)
    const b = generateLevelBoard(23)
    expect(a.board.emoji).toEqual(b.board.emoji)
  })

  it('different levels normally produce different boards', () => {
    const a = generateLevelBoard(1)
    const b = generateLevelBoard(2)
    expect(a.layoutId).not.toBe(b.layoutId)
  })

  it('throws for an unknown level number', () => {
    expect(() => generateLevelBoard(51)).toThrow()
    expect(() => generateLevelBoard(0)).toThrow()
  })
})
