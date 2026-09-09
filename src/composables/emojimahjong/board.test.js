import { describe, it, expect } from 'vitest'
import {
  getLayout,
  isTileFree,
  getFreeTiles,
  getAvailablePairs,
  removePair,
  undoPair,
  isBoardCleared,
  isDeadEnd,
  remainingCount,
} from './board.js'
import { EMOJIMAHJONG_LAYOUTS } from '../../constants/emojimahjong/layouts.js'
import { EMOJIMAHJONG_DIFFICULTIES } from '../../constants/emojimahjong/difficulties.js'

function emptyState(layoutId, emoji) {
  const n = getLayout(layoutId).slots.length
  return { layoutId, removed: new Array(n).fill(false), emoji: emoji || new Array(n).fill('x') }
}

describe('layout tile counts match difficulty spec (SPEC §6)', () => {
  it.each(Object.values(EMOJIMAHJONG_DIFFICULTIES))('$key has $tiles tiles per layout', (config) => {
    const layouts = EMOJIMAHJONG_LAYOUTS.filter((l) => l.difficulty === config.key)
    expect(layouts.length).toBeGreaterThan(0)
    for (const l of layouts) {
      expect(l.slots.length).toBe(config.tiles)
    }
  })
})

describe('a covered tile is blocked (SPEC §4.1)', () => {
  it('a tile directly under a stacked tile above it is not free', () => {
    // easy-2: rect(6,3,z0) + rect(3,2,z1, offset 1,1) — a z1 tile at (1,1)
    // covers z0 tiles at (0,0),(0,2),(2,0),(2,2).
    const state = emptyState('easy-2')
    const layout = getLayout('easy-2')
    const z0Idx = layout.slots.findIndex((s) => s.z === 0 && s.x === 0 && s.y === 0)
    expect(isTileFree(state, z0Idx)).toBe(false)
  })
})

describe('an uncovered tile with an open side is free (SPEC §4.2)', () => {
  it('the leftmost tile of a flat row is free even with a right neighbor present', () => {
    const state = emptyState('easy-1') // flat 6x4, no layering
    const layout = getLayout('easy-1')
    const leftmost = layout.slots.findIndex((s) => s.x === 0 && s.y === 0 && s.z === 0)
    expect(isTileFree(state, leftmost)).toBe(true)
  })

  it('an interior tile with both left and right neighbors present is blocked', () => {
    const state = emptyState('easy-1')
    const layout = getLayout('easy-1')
    const interior = layout.slots.findIndex((s) => s.x === 2 && s.y === 0 && s.z === 0)
    expect(isTileFree(state, interior)).toBe(false)
  })
})

describe('removing a neighbor exposes the next tile (SPEC §4.2)', () => {
  it('an interior tile becomes free once its left neighbor is removed', () => {
    let state = emptyState('easy-1')
    const layout = getLayout('easy-1')
    const leftmost = layout.slots.findIndex((s) => s.x === 0 && s.y === 0 && s.z === 0)
    const interior = layout.slots.findIndex((s) => s.x === 2 && s.y === 0 && s.z === 0)
    expect(isTileFree(state, interior)).toBe(false)

    // Remove leftmost paired with some other free tile (any free tile works
    // here since we only care about the resulting geometry, not emoji).
    const otherFree = getFreeTiles(state).find((i) => i !== leftmost)
    state = removePair(state, leftmost, otherFree)
    expect(isTileFree(state, interior)).toBe(true)
  })
})

describe('removing a covering tile exposes the tile below it', () => {
  it('a z0 tile under a z1 tile becomes free once the z1 tile is gone', () => {
    const layout = getLayout('easy-2')
    const z0Idx = layout.slots.findIndex((s) => s.z === 0 && s.x === 0 && s.y === 0)
    const z1Idx = layout.slots.findIndex((s) => s.z === 1 && s.x === 1 && s.y === 1)
    let state = emptyState('easy-2')
    expect(isTileFree(state, z0Idx)).toBe(false)

    const otherFree = getFreeTiles(state).find((i) => i !== z1Idx)
    state = removePair(state, z1Idx, otherFree)
    expect(isTileFree(state, z0Idx)).toBe(true)
  })
})

describe('getAvailablePairs / identical vs mismatched tiles', () => {
  it('two free tiles with the same emoji form an available pair', () => {
    const layout = getLayout('easy-1')
    const emoji = new Array(layout.slots.length).fill('a')
    const state = emptyState('easy-1', emoji)
    const pairs = getAvailablePairs(state)
    expect(pairs.length).toBeGreaterThan(0)
  })

  it('two free tiles with different emoji do not form a pair', () => {
    const layout = getLayout('easy-1')
    const emoji = layout.slots.map((_, i) => (i === 0 ? 'a' : 'b'))
    const state = emptyState('easy-1', emoji)
    const free = getFreeTiles(state)
    expect(free).toContain(0)
    const pairs = getAvailablePairs(state)
    expect(pairs.some(([a, b]) => a === 0 || b === 0)).toBe(false)
  })

  it('a blocked tile cannot appear in an available pair even with a matching free tile', () => {
    const layout = getLayout('easy-1')
    const interior = layout.slots.findIndex((s) => s.x === 2 && s.y === 0 && s.z === 0)
    const leftmost = layout.slots.findIndex((s) => s.x === 0 && s.y === 0 && s.z === 0)
    const emoji = layout.slots.map((_, i) => (i === interior || i === leftmost ? 'same' : `unique-${i}`))
    const state = emptyState('easy-1', emoji)
    const pairs = getAvailablePairs(state)
    expect(pairs.some(([a, b]) => a === interior || b === interior)).toBe(false)
  })
})

describe('removePair / undoPair', () => {
  it('removePair removes exactly two tiles and does not mutate the input', () => {
    const state = emptyState('easy-1')
    const before = remainingCount(state)
    const [a, b] = getFreeTiles(state).slice(0, 2)
    const after = removePair(state, a, b)
    expect(remainingCount(after)).toBe(before - 2)
    expect(state.removed[a]).toBe(false) // input untouched
    expect(after.removed[a]).toBe(true)
    expect(after.removed[b]).toBe(true)
  })

  it('undoPair restores the exact prior state', () => {
    const state = emptyState('easy-1')
    const [a, b] = getFreeTiles(state).slice(0, 2)
    const after = removePair(state, a, b)
    const restored = undoPair(after, { a, b })
    expect(restored.removed).toEqual(state.removed)
  })
})

describe('isBoardCleared / isDeadEnd', () => {
  it('isBoardCleared is true only when every tile is removed', () => {
    const layout = getLayout('easy-1')
    const state = emptyState('easy-1')
    expect(isBoardCleared(state)).toBe(false)
    const cleared = { ...state, removed: new Array(layout.slots.length).fill(true) }
    expect(isBoardCleared(cleared)).toBe(true)
  })

  it('isDeadEnd is true when tiles remain but no matching free pair exists', () => {
    const layout = getLayout('easy-1')
    // Every remaining free tile gets a unique emoji, so no pair can match.
    const emoji = layout.slots.map((_, i) => `unique-${i}`)
    const state = emptyState('easy-1', emoji)
    expect(isDeadEnd(state)).toBe(true)
  })

  it('isDeadEnd is false once the board is fully cleared', () => {
    const layout = getLayout('easy-1')
    const cleared = { layoutId: 'easy-1', removed: new Array(layout.slots.length).fill(true), emoji: [] }
    expect(isDeadEnd(cleared)).toBe(false)
  })
})
