import { describe, it, expect } from 'vitest'
import { findAllSets } from './setFinder.js'
import { isSet } from './setValidator.js'
import { createDeck } from './deck.js'

describe('findAllSets', () => {
  it('returns no sets on an empty or too-small board', () => {
    expect(findAllSets([])).toEqual([])
    expect(findAllSets([createDeck()[0], createDeck()[1]])).toEqual([])
  })

  it('finds the single SET among three cards that form one', () => {
    const a = { number: 0, shape: 0, color: 0, shading: 0 }
    const b = { number: 1, shape: 1, color: 1, shading: 1 }
    const c = { number: 2, shape: 2, color: 2, shading: 2 }
    expect(findAllSets([a, b, c])).toEqual([[0, 1, 2]])
  })

  it('finds nothing among three cards that do not form a SET', () => {
    const a = { number: 0, shape: 0, color: 0, shading: 0 }
    const b = { number: 0, shape: 1, color: 1, shading: 1 }
    const c = { number: 1, shape: 2, color: 2, shading: 2 }
    expect(findAllSets([a, b, c])).toEqual([])
  })

  it('finds every SET on a hand-built 6-card board, cross-checked by brute force against isSet', () => {
    const board = [
      { number: 0, shape: 0, color: 0, shading: 0 },
      { number: 1, shape: 1, color: 1, shading: 1 },
      { number: 2, shape: 2, color: 2, shading: 2 }, // forms a SET with the two above
      { number: 0, shape: 0, color: 0, shading: 1 },
      { number: 0, shape: 0, color: 0, shading: 2 }, // forms a SET with index 0 and 3
      { number: 1, shape: 2, color: 0, shading: 2 }, // no SET involving this one
    ]

    const expected = []
    for (let i = 0; i < board.length; i++) {
      for (let j = i + 1; j < board.length; j++) {
        for (let k = j + 1; k < board.length; k++) {
          if (isSet(board[i], board[j], board[k])) expected.push([i, j, k])
        }
      }
    }

    expect(findAllSets(board)).toEqual(expected)
    expect(expected).toEqual([[0, 1, 2], [0, 3, 4]])
  })

  it('never includes the same card index twice within one triple', () => {
    const board = createDeck().slice(0, 15)
    for (const [i, j, k] of findAllSets(board)) {
      expect(new Set([i, j, k]).size).toBe(3)
    }
  })
})
