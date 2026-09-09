import { describe, it, expect } from 'vitest'
import {
  buildBoard,
  createBoard,
  getLegalMoves,
  isLegalMove,
  applyMove,
  undoMove,
  hasLegalMoves,
  remainingCount,
  calculateScore,
} from './board.js'

describe('buildBoard', () => {
  it('produces the right cell count per triangular size (n*(n+1)/2)', () => {
    expect(buildBoard(4).total).toBe(10)
    expect(buildBoard(5).total).toBe(15)
    expect(buildBoard(6).total).toBe(21)
    expect(buildBoard(7).total).toBe(28)
  })

  it('gives a fully-interior cell all 6 directions', () => {
    // (row=4, col=2) on a 7-row board: idx = 4*5/2+2 = 12. Every one of its
    // 6 jump+land pairs stays within a 7-row triangle.
    const { moves } = buildBoard(7)
    const fromIdx12 = moves.filter((m) => m.start === 12)
    expect(fromIdx12.map((m) => m.direction).sort()).toEqual(['E', 'NE', 'NW', 'SE', 'SW', 'W'].sort())
  })
})

describe('legal move geometry and occupancy rules', () => {
  it('rejects a move when START has no marble', () => {
    const state = createBoard({ n: 5, emptyHoles: [[0, 0]] }) // idx 0 empty
    const illegal = { start: 0, jumped: 2, landing: 5 }
    expect(isLegalMove(state, illegal)).toBe(false)
  })

  it('rejects a move when JUMPED has no marble', () => {
    const state = createBoard({ n: 5, emptyHoles: [[1, 0]] }) // idx 1 empty
    // start=0 (0,0), jumped=1 (1,0) is empty, landing=3 (2,0)
    const illegal = { start: 0, jumped: 1, landing: 3 }
    expect(isLegalMove(state, illegal)).toBe(false)
  })

  it('rejects a move when LANDING is occupied', () => {
    const state = createBoard({ n: 5, emptyHoles: [[4, 4]] }) // far corner empty, not on this path
    const illegal = { start: 0, jumped: 1, landing: 3 } // landing idx 3 is occupied
    expect(isLegalMove(state, illegal)).toBe(false)
  })

  it('accepts the one legal opening move on a minimal apex-start puzzle', () => {
    const state = createBoard({ n: 5, emptyHoles: [[0, 0]] })
    const legal = { start: 3, jumped: 1, landing: 0 } // (2,0)->(1,0)->(0,0)
    expect(isLegalMove(state, legal)).toBe(true)
  })

  it('getLegalMoves matches isLegalMove for every candidate on a real board', () => {
    const state = createBoard({ n: 5, emptyHoles: [[0, 0]] })
    const { moves } = buildBoard(5)
    const legal = getLegalMoves(state)
    for (const m of moves) {
      const expected = legal.some((l) => l.start === m.start && l.jumped === m.jumped && l.landing === m.landing)
      expect(isLegalMove(state, m)).toBe(expected)
    }
  })
})

describe('the n=4 (row 2, col 1) center start has zero legal opening moves', () => {
  it('hasLegalMoves is false and remainingCount is unchanged (10 - 1 = 9)', () => {
    const state = createBoard({ n: 4, emptyHoles: [[2, 1]] })
    expect(hasLegalMoves(state)).toBe(false)
    expect(remainingCount(state)).toBe(9)
  })
})

describe('applyMove / undoMove', () => {
  const puzzle = { n: 5, emptyHoles: [[0, 0]] }

  it('applyMove removes exactly one marble (net -1 occupied)', () => {
    const state = createBoard(puzzle)
    const before = remainingCount(state)
    const move = { start: 3, jumped: 1, landing: 0 }
    const after = applyMove(state, move)
    expect(remainingCount(after)).toBe(before - 1)
    expect(after.occupied[move.start]).toBe(0)
    expect(after.occupied[move.jumped]).toBe(0)
    expect(after.occupied[move.landing]).toBe(1)
  })

  it('does not mutate the state it was given (pure)', () => {
    const state = createBoard(puzzle)
    const snapshot = state.occupied.slice()
    applyMove(state, { start: 3, jumped: 1, landing: 0 })
    expect(state.occupied).toEqual(snapshot)
  })

  it('undoMove restores the exact prior state', () => {
    const state = createBoard(puzzle)
    const move = { start: 3, jumped: 1, landing: 0 }
    const after = applyMove(state, move)
    const restored = undoMove(after, move)
    expect(restored.occupied).toEqual(state.occupied)
  })
})

describe('hasLegalMoves', () => {
  it('is true for a fresh puzzle with an available opening move', () => {
    const state = createBoard({ n: 5, emptyHoles: [[0, 0]] })
    expect(hasLegalMoves(state)).toBe(true)
  })

  it('is false once every marble but one remains and no jumps remain', () => {
    // A fully isolated single marble: everything else empty.
    const { total } = buildBoard(4)
    const state = { n: 4, occupied: new Array(total).fill(0) }
    state.occupied[0] = 1
    expect(hasLegalMoves(state)).toBe(false)
  })
})

describe('calculateScore', () => {
  it('applies the SPEC §13 formula and floors at 0', () => {
    const score = calculateScore({
      startingMarbles: 15,
      remainingMarbles: 2,
      undos: 1,
      elapsedSeconds: 151, // floor(151/5)*5 = 150
      optimalReached: false,
    })
    // base 1500 - remaining 500 - undo 25 - time 150 = 825
    expect(score).toBe(825)
  })

  it('adds the verified-optimum bonus', () => {
    const score = calculateScore({
      startingMarbles: 10,
      remainingMarbles: 1,
      undos: 0,
      elapsedSeconds: 0,
      optimalReached: true,
    })
    expect(score).toBe(10 * 100 - 1 * 250 + 500)
  })

  it('never goes negative', () => {
    const score = calculateScore({
      startingMarbles: 4,
      remainingMarbles: 4,
      undos: 50,
      elapsedSeconds: 10000,
      optimalReached: false,
    })
    expect(score).toBe(0)
  })
})
