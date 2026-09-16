import { describe, it, expect } from 'vitest'
import {
  getLayout,
  isTileFree,
  getBlockingReason,
  getFreeTiles,
  getAvailablePairs,
  removePair,
  undoPair,
  isBoardCleared,
  isDeadEnd,
  remainingCount,
} from './board.js'

// em-tutorial-3: rect(4,1,0) + 2 z1 tiles at (2,1) and (4,1) — the z1 tile
// at (2,1) covers z0 tiles at (2,0) and (4,0) (within 1 unit in both x/y).
const COVERED_LAYOUT = 'em-tutorial-3'
// em-tutorial-2: flat 4x3 rect — a genuine left/right-blocking flat layout.
const FLAT_LAYOUT = 'em-tutorial-2'

function emptyState(layoutId, emoji) {
  const n = getLayout(layoutId).slots.length
  return { layoutId, removed: new Array(n).fill(false), emoji: emoji || new Array(n).fill('x') }
}

describe('a covered tile is blocked (Level-SPEC §4.1)', () => {
  it('a tile directly under a stacked tile above it is not free', () => {
    const state = emptyState(COVERED_LAYOUT)
    const layout = getLayout(COVERED_LAYOUT)
    const z0Idx = layout.slots.findIndex((s) => s.z === 0 && s.x === 2 && s.y === 0)
    expect(isTileFree(state, z0Idx)).toBe(false)
  })
})

describe('getBlockingReason (Level-SPEC §9/§22)', () => {
  it('reports "covered" for a tile blocked by a tile above it', () => {
    const state = emptyState(COVERED_LAYOUT)
    const layout = getLayout(COVERED_LAYOUT)
    const z0Idx = layout.slots.findIndex((s) => s.z === 0 && s.x === 2 && s.y === 0)
    expect(getBlockingReason(state, z0Idx)).toBe('covered')
  })

  it('reports "sides" for a tile blocked only by both horizontal neighbors', () => {
    const state = emptyState(FLAT_LAYOUT)
    const layout = getLayout(FLAT_LAYOUT)
    const interior = layout.slots.findIndex((s) => s.x === 2 && s.y === 0 && s.z === 0)
    expect(getBlockingReason(state, interior)).toBe('sides')
  })

  it('returns null for a free tile', () => {
    const state = emptyState(FLAT_LAYOUT)
    const layout = getLayout(FLAT_LAYOUT)
    const leftmost = layout.slots.findIndex((s) => s.x === 0 && s.y === 0 && s.z === 0)
    expect(getBlockingReason(state, leftmost)).toBeNull()
  })

  it('returns null for an already-removed tile', () => {
    const layout = getLayout(FLAT_LAYOUT)
    const leftmost = layout.slots.findIndex((s) => s.x === 0 && s.y === 0 && s.z === 0)
    let state = emptyState(FLAT_LAYOUT)
    const otherFree = getFreeTiles(state).find((i) => i !== leftmost)
    state = removePair(state, leftmost, otherFree)
    expect(getBlockingReason(state, leftmost)).toBeNull()
  })
})

describe('an uncovered tile with an open side is free (Level-SPEC §4.2)', () => {
  it('the leftmost tile of a flat row is free even with a right neighbor present', () => {
    const state = emptyState(FLAT_LAYOUT)
    const layout = getLayout(FLAT_LAYOUT)
    const leftmost = layout.slots.findIndex((s) => s.x === 0 && s.y === 0 && s.z === 0)
    expect(isTileFree(state, leftmost)).toBe(true)
  })

  it('an interior tile with both left and right neighbors present is blocked', () => {
    const state = emptyState(FLAT_LAYOUT)
    const layout = getLayout(FLAT_LAYOUT)
    const interior = layout.slots.findIndex((s) => s.x === 2 && s.y === 0 && s.z === 0)
    expect(isTileFree(state, interior)).toBe(false)
  })
})

describe('removing a neighbor exposes the next tile (Level-SPEC §4.2)', () => {
  it('an interior tile becomes free once its left neighbor is removed', () => {
    let state = emptyState(FLAT_LAYOUT)
    const layout = getLayout(FLAT_LAYOUT)
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
    const layout = getLayout(COVERED_LAYOUT)
    const z0Idx = layout.slots.findIndex((s) => s.z === 0 && s.x === 2 && s.y === 0)
    const z1Idx = layout.slots.findIndex((s) => s.z === 1 && s.x === 2 && s.y === 1)
    let state = emptyState(COVERED_LAYOUT)
    expect(isTileFree(state, z0Idx)).toBe(false)

    const otherFree = getFreeTiles(state).find((i) => i !== z1Idx)
    state = removePair(state, z1Idx, otherFree)
    expect(isTileFree(state, z0Idx)).toBe(true)
  })
})

describe('getAvailablePairs / identical vs mismatched tiles', () => {
  it('two free tiles with the same emoji form an available pair', () => {
    const layout = getLayout(FLAT_LAYOUT)
    const emoji = new Array(layout.slots.length).fill('a')
    const state = emptyState(FLAT_LAYOUT, emoji)
    const pairs = getAvailablePairs(state)
    expect(pairs.length).toBeGreaterThan(0)
  })

  it('two free tiles with different emoji do not form a pair', () => {
    const layout = getLayout(FLAT_LAYOUT)
    const emoji = layout.slots.map((_, i) => (i === 0 ? 'a' : 'b'))
    const state = emptyState(FLAT_LAYOUT, emoji)
    const free = getFreeTiles(state)
    expect(free).toContain(0)
    const pairs = getAvailablePairs(state)
    expect(pairs.some(([a, b]) => a === 0 || b === 0)).toBe(false)
  })

  it('a blocked tile cannot appear in an available pair even with a matching free tile', () => {
    const layout = getLayout(FLAT_LAYOUT)
    const interior = layout.slots.findIndex((s) => s.x === 2 && s.y === 0 && s.z === 0)
    const leftmost = layout.slots.findIndex((s) => s.x === 0 && s.y === 0 && s.z === 0)
    const emoji = layout.slots.map((_, i) => (i === interior || i === leftmost ? 'same' : `unique-${i}`))
    const state = emptyState(FLAT_LAYOUT, emoji)
    const pairs = getAvailablePairs(state)
    expect(pairs.some(([a, b]) => a === interior || b === interior)).toBe(false)
  })
})

describe('removePair / undoPair', () => {
  it('removePair removes exactly two tiles and does not mutate the input', () => {
    const state = emptyState(FLAT_LAYOUT)
    const before = remainingCount(state)
    const [a, b] = getFreeTiles(state).slice(0, 2)
    const after = removePair(state, a, b)
    expect(remainingCount(after)).toBe(before - 2)
    expect(state.removed[a]).toBe(false) // input untouched
    expect(after.removed[a]).toBe(true)
    expect(after.removed[b]).toBe(true)
  })

  it('undoPair restores the exact prior state', () => {
    const state = emptyState(FLAT_LAYOUT)
    const [a, b] = getFreeTiles(state).slice(0, 2)
    const after = removePair(state, a, b)
    const restored = undoPair(after, { a, b })
    expect(restored.removed).toEqual(state.removed)
  })
})

describe('isBoardCleared / isDeadEnd', () => {
  it('isBoardCleared is true only when every tile is removed', () => {
    const layout = getLayout(FLAT_LAYOUT)
    const state = emptyState(FLAT_LAYOUT)
    expect(isBoardCleared(state)).toBe(false)
    const cleared = { ...state, removed: new Array(layout.slots.length).fill(true) }
    expect(isBoardCleared(cleared)).toBe(true)
  })

  it('isDeadEnd is true when tiles remain but no matching free pair exists', () => {
    const layout = getLayout(FLAT_LAYOUT)
    // Every remaining free tile gets a unique emoji, so no pair can match.
    const emoji = layout.slots.map((_, i) => `unique-${i}`)
    const state = emptyState(FLAT_LAYOUT, emoji)
    expect(isDeadEnd(state)).toBe(true)
  })

  it('isDeadEnd is false once the board is fully cleared', () => {
    const layout = getLayout(FLAT_LAYOUT)
    const cleared = { layoutId: FLAT_LAYOUT, removed: new Array(layout.slots.length).fill(true), emoji: [] }
    expect(isDeadEnd(cleared)).toBe(false)
  })
})
