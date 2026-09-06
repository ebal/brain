import { describe, it, expect } from 'vitest'
import { isSet, findCompletingCard, firstFailingProperty } from './setValidator.js'
import { createDeck } from './deck.js'
import { PROPERTY_NAMES } from '../../constants/set/cardProperties.js'

const DECK = createDeck()

describe('isSet', () => {
  it('accepts a SET where every property is all the same', () => {
    const card = { number: 1, shape: 1, color: 1, shading: 1 }
    expect(isSet(card, card, card)).toBe(true)
  })

  it('accepts a SET where every property is all different', () => {
    const a = { number: 0, shape: 0, color: 0, shading: 0 }
    const b = { number: 1, shape: 1, color: 1, shading: 1 }
    const c = { number: 2, shape: 2, color: 2, shading: 2 }
    expect(isSet(a, b, c)).toBe(true)
  })

  it('accepts a mixed SET (some properties same, some all-different)', () => {
    // number: all same (1,1,1). shape: all different (0,1,2). color: all same. shading: all different.
    const a = { number: 1, shape: 0, color: 2, shading: 0 }
    const b = { number: 1, shape: 1, color: 2, shading: 1 }
    const c = { number: 1, shape: 2, color: 2, shading: 2 }
    expect(isSet(a, b, c)).toBe(true)
  })

  it('rejects a triple where exactly one property is two-same-one-different', () => {
    // number: 0,0,1 — two same, one different — invalid on its own.
    const a = { number: 0, shape: 0, color: 0, shading: 0 }
    const b = { number: 0, shape: 1, color: 1, shading: 1 }
    const c = { number: 1, shape: 2, color: 2, shading: 2 }
    expect(isSet(a, b, c)).toBe(false)
  })

  it('holds for every unique pair in the full 81-card deck: the mathematically completing card always forms a SET, and it is the only card in the deck that does', () => {
    // Exhaustive check over all C(81,2) = 3240 pairs would be slow-ish but still fast in practice.
    let checked = 0
    for (let i = 0; i < DECK.length; i++) {
      for (let j = i + 1; j < DECK.length; j++) {
        const a = DECK[i]
        const b = DECK[j]
        const completing = findCompletingCard(a, b)
        expect(isSet(a, b, completing)).toBe(true)

        // No other card in the deck (besides the mathematical completion) should also form a SET with a,b.
        const others = DECK.filter((c) => c.id !== a.id && c.id !== b.id && isSet(a, b, c))
        expect(others).toHaveLength(1)
        expect(others[0].number).toBe(completing.number)
        expect(others[0].shape).toBe(completing.shape)
        expect(others[0].color).toBe(completing.color)
        expect(others[0].shading).toBe(completing.shading)
        checked += 1
      }
    }
    expect(checked).toBe((81 * 80) / 2)
  })
})

describe('findCompletingCard', () => {
  it('is symmetric regardless of argument order', () => {
    const a = { number: 0, shape: 1, color: 2, shading: 0 }
    const b = { number: 1, shape: 1, color: 0, shading: 2 }
    expect(findCompletingCard(a, b)).toEqual(findCompletingCard(b, a))
  })

  it('returns the identical card when a and b are the same card', () => {
    const a = { number: 1, shape: 2, color: 0, shading: 1 }
    expect(findCompletingCard(a, a)).toEqual({ number: 1, shape: 2, color: 0, shading: 1 })
  })
})

describe('firstFailingProperty', () => {
  it('returns null when the three cards form a real SET', () => {
    const a = { number: 0, shape: 0, color: 0, shading: 0 }
    const b = { number: 1, shape: 1, color: 1, shading: 1 }
    const c = { number: 2, shape: 2, color: 2, shading: 2 }
    expect(firstFailingProperty(a, b, c)).toBeNull()
  })

  it('identifies the first property (in declared order) that breaks the rule', () => {
    // number is fine (all same); shape breaks first (two same, one different).
    const a = { number: 0, shape: 0, color: 0, shading: 0 }
    const b = { number: 0, shape: 0, color: 1, shading: 1 }
    const c = { number: 0, shape: 1, color: 2, shading: 2 }
    expect(firstFailingProperty(a, b, c)).toBe(PROPERTY_NAMES[1]) // 'shape'
  })
})
