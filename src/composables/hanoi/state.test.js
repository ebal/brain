import { describe, it, expect } from 'vitest'
import {
  createHanoiState, getTopDisk, isLegalMove, applyMove, isSolved,
  getOptimalMoveCount, getOptimalNextMove, calculateEfficiency, calculateStars,
} from './state.js'

describe('createHanoiState', () => {
  it('stacks every disk on peg A, largest at the bottom', () => {
    const state = createHanoiState(4)
    expect(state.pegs[0]).toEqual([4, 3, 2, 1])
    expect(state.pegs[1]).toEqual([])
    expect(state.pegs[2]).toEqual([])
  })
})

describe('getTopDisk', () => {
  it('returns the smallest (last) disk on a peg', () => {
    const state = createHanoiState(3)
    expect(getTopDisk(state, 0)).toBe(1)
  })

  it('returns null for an empty peg', () => {
    const state = createHanoiState(3)
    expect(getTopDisk(state, 1)).toBeNull()
  })
})

describe('isLegalMove', () => {
  it('allows moving onto an empty peg', () => {
    const state = createHanoiState(3)
    expect(isLegalMove(state, 0, 1)).toBe(true)
  })

  it('allows moving a smaller disk onto a larger one', () => {
    const state = { pegs: [[3, 2], [], [1]] }
    expect(isLegalMove(state, 0, 2)).toBe(false) // top of A is 2, top of C is 1 — larger onto smaller
    expect(isLegalMove(state, 2, 0)).toBe(true) // 1 onto 2 — smaller onto larger
  })

  it('rejects moving a larger disk onto a smaller one', () => {
    const state = { pegs: [[2], [], [3, 1]] }
    // top of A is 2, top of C is 1 — 2 onto 1 is illegal
    expect(isLegalMove(state, 0, 2)).toBe(false)
  })

  it('rejects moving from an empty peg', () => {
    const state = createHanoiState(3)
    expect(isLegalMove(state, 1, 2)).toBe(false)
  })

  it('rejects a peg moving to itself', () => {
    const state = createHanoiState(3)
    expect(isLegalMove(state, 0, 0)).toBe(false)
  })
})

describe('applyMove', () => {
  it('moves the top disk and does not mutate the original state', () => {
    const state = createHanoiState(3)
    const next = applyMove(state, 0, 2)
    expect(next.pegs[0]).toEqual([3, 2])
    expect(next.pegs[2]).toEqual([1])
    expect(state.pegs[0]).toEqual([3, 2, 1]) // original untouched
  })

  it('double-toggling (move then move back) restores the original state', () => {
    const state = createHanoiState(3)
    const moved = applyMove(state, 0, 1)
    const back = applyMove(moved, 1, 0)
    expect(back).toEqual(state)
  })
})

describe('isSolved', () => {
  it('is true only when every disk sits correctly ordered on peg C', () => {
    const solved = { pegs: [[], [], [3, 2, 1]] }
    expect(isSolved(solved, 3)).toBe(true)
  })

  it('is false when disks are on peg C but in the wrong count', () => {
    const partial = { pegs: [[3], [], [2, 1]] }
    expect(isSolved(partial, 3)).toBe(false)
  })

  it('is false for an out-of-order stack, even with the right count', () => {
    // Not reachable via legal play, but isSolved should not just count —
    // it must check actual ordering.
    const bogus = { pegs: [[], [], [1, 2, 3]] }
    expect(isSolved(bogus, 3)).toBe(false)
  })

  it('is false at the starting position', () => {
    expect(isSolved(createHanoiState(3), 3)).toBe(false)
  })
})

describe('getOptimalMoveCount', () => {
  it('matches 2^n - 1 for 3 through 8 disks', () => {
    expect(getOptimalMoveCount(3)).toBe(7)
    expect(getOptimalMoveCount(4)).toBe(15)
    expect(getOptimalMoveCount(5)).toBe(31)
    expect(getOptimalMoveCount(6)).toBe(63)
    expect(getOptimalMoveCount(7)).toBe(127)
    expect(getOptimalMoveCount(8)).toBe(255)
  })
})

describe('getOptimalNextMove', () => {
  it('reproduces the well-known 3-disk optimal sequence move-by-move', () => {
    // The textbook A->C solution for 3 disks: 1:A-C 2:A-B 3:C-B 4:A-C 5:B-A 6:B-C 7:A-C
    const expectedSequence = [
      [0, 2], [0, 1], [2, 1], [0, 2], [1, 0], [1, 2], [0, 2],
    ]
    let state = createHanoiState(3)
    for (const [from, to] of expectedSequence) {
      const move = getOptimalNextMove(state, 3)
      expect([move.from, move.to]).toEqual([from, to])
      state = applyMove(state, move.from, move.to)
    }
    expect(isSolved(state, 3)).toBe(true)
  })

  it('returns null once every disk is already on the goal peg', () => {
    const solved = { pegs: [[], [], [3, 2, 1]] }
    expect(getOptimalNextMove(solved, 3)).toBeNull()
  })

  it('is always distance-decreasing-by-one toward the goal, from every one of the 27 legal 3-disk states (brute-force cross-check)', () => {
    const disks = 3
    const goal = { pegs: [[], [], [3, 2, 1]] }

    function stateKey(state) {
      return state.pegs.map((p) => p.join('.')).join('|')
    }

    // Every legal Hanoi move is reversible (the destination-size rule is
    // symmetric), so BFS outward from the goal over legal moves gives the
    // true shortest distance to the goal for every reachable state.
    function bfsDistancesFromGoal() {
      const dist = new Map([[stateKey(goal), 0]])
      let frontier = [goal]
      while (frontier.length) {
        const next = []
        for (const s of frontier) {
          const d = dist.get(stateKey(s))
          for (let from = 0; from < 3; from++) {
            for (let to = 0; to < 3; to++) {
              if (from === to || !isLegalMove(s, from, to)) continue
              const ns = applyMove(s, from, to)
              const k = stateKey(ns)
              if (!dist.has(k)) {
                dist.set(k, d + 1)
                next.push(ns)
              }
            }
          }
        }
        frontier = next
      }
      return dist
    }

    // All 3^disks legal configurations — every possible assignment of each
    // disk to a peg is itself a valid (uniquely stackable) Hanoi state.
    function allStates() {
      const states = []
      const total = 3 ** disks
      for (let mask = 0; mask < total; mask++) {
        let m = mask
        const assignment = []
        for (let d = 0; d < disks; d++) {
          assignment.push(m % 3)
          m = Math.floor(m / 3)
        }
        const pegs = [[], [], []]
        for (let d = disks; d >= 1; d--) pegs[assignment[d - 1]].push(d) // largest first -> correct bottom-to-top order
        states.push({ pegs })
      }
      return states
    }

    const distances = bfsDistancesFromGoal()
    expect(distances.size).toBe(3 ** disks) // every state is reachable — a known Hanoi-graph property

    for (const state of allStates()) {
      const distBefore = distances.get(stateKey(state))
      const move = getOptimalNextMove(state, disks)
      if (distBefore === 0) {
        expect(move).toBeNull()
        continue
      }
      expect(move).not.toBeNull()
      expect(isLegalMove(state, move.from, move.to)).toBe(true)
      const next = applyMove(state, move.from, move.to)
      const distAfter = distances.get(stateKey(next))
      expect(distAfter).toBe(distBefore - 1)
    }
  })
})

describe('calculateEfficiency', () => {
  it('is optimal / actual * 100', () => {
    expect(calculateEfficiency(7, 7)).toBe(100)
    expect(calculateEfficiency(7, 14)).toBe(50)
  })

  it('is capped at 100% even when actual is somehow below optimal', () => {
    expect(calculateEfficiency(7, 3)).toBe(100)
  })

  it('is 0 when no moves were made', () => {
    expect(calculateEfficiency(7, 0)).toBe(0)
  })
})

describe('calculateStars', () => {
  it('awards 3 stars for an exact optimal solution with no hints', () => {
    expect(calculateStars({ actualMoves: 7, optimalMoves: 7, hints: 0 })).toBe(3)
  })

  it('caps an optimal-but-hinted solution at 2 stars', () => {
    expect(calculateStars({ actualMoves: 7, optimalMoves: 7, hints: 1 })).toBe(2)
  })

  it('awards 2 stars within ~115% of optimum', () => {
    expect(calculateStars({ actualMoves: 8, optimalMoves: 7, hints: 0 })).toBe(2) // 8 <= round(7*1.15)=8
  })

  it('awards 1 star beyond the 2-star band', () => {
    expect(calculateStars({ actualMoves: 20, optimalMoves: 7, hints: 0 })).toBe(1)
  })
})
