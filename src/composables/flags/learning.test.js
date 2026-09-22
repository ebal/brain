import { describe, it, expect } from 'vitest'
import { updateCountryLearning, calculateMastery } from './learning.js'

describe('updateCountryLearning', () => {
  it('starts a never-seen country as new, and records a correct answer', () => {
    const next = updateCountryLearning(undefined, { correct: true, timestamp: 1000 })
    expect(next.attempts).toBe(1)
    expect(next.correct).toBe(1)
    expect(next.wrong).toBe(0)
    expect(next.currentCorrectStreak).toBe(1)
    expect(next.lastSeenAt).toBe(1000)
  })

  it('records a wrong answer, resets the streak, and tracks the confusion', () => {
    const seen = updateCountryLearning(undefined, { correct: true, timestamp: 1 })
    const next = updateCountryLearning(seen, { correct: false, wrongCode: 'td', timestamp: 2 })
    expect(next.attempts).toBe(2)
    expect(next.wrong).toBe(1)
    expect(next.currentCorrectStreak).toBe(0)
    expect(next.lastWrongAt).toBe(2)
    expect(next.confusions.td).toBe(1)
  })

  it('accumulates repeated confusions with the same wrong country', () => {
    let state
    state = updateCountryLearning(state, { correct: false, wrongCode: 'td', timestamp: 1 })
    state = updateCountryLearning(state, { correct: true, timestamp: 2 })
    state = updateCountryLearning(state, { correct: false, wrongCode: 'td', timestamp: 3 })
    expect(state.confusions.td).toBe(2)
  })

  it('does not mutate the state object passed in', () => {
    const original = updateCountryLearning(undefined, { correct: true, timestamp: 1 })
    const snapshot = { ...original, confusions: { ...original.confusions } }
    updateCountryLearning(original, { correct: false, wrongCode: 'x', timestamp: 2 })
    expect(original).toEqual(snapshot)
  })
})

describe('calculateMastery', () => {
  it('a never-seen country is new', () => {
    expect(calculateMastery(undefined)).toBe('new')
    expect(calculateMastery({ attempts: 0 })).toBe('new')
  })

  it('one lucky correct answer is not enough for mastered', () => {
    const state = updateCountryLearning(undefined, { correct: true, timestamp: 1 })
    expect(calculateMastery(state)).toBe('learning')
  })

  it('requires a sustained correct streak to become mastered', () => {
    let state
    for (let i = 0; i < 3; i++) {
      state = updateCountryLearning(state, { correct: true, timestamp: i })
    }
    expect(calculateMastery(state)).toBe('mastered')
  })

  it('a country just answered wrong is needs-practice, even after prior mastery', () => {
    let state
    for (let i = 0; i < 3; i++) {
      state = updateCountryLearning(state, { correct: true, timestamp: i })
    }
    expect(calculateMastery(state)).toBe('mastered')
    state = updateCountryLearning(state, { correct: false, wrongCode: 'x', timestamp: 4 })
    expect(calculateMastery(state)).toBe('needs-practice')
  })
})
