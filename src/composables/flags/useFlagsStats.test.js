import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useFlagsStats } from './useFlagsStats.js'
import { FLAGS_LEVELS } from '../../constants/flags/levels.js'

function installFakeLocalStorage() {
  const fake = {}
  Object.defineProperties(fake, {
    getItem: { value: (k) => (k in fake ? fake[k] : null) },
    setItem: { value: (k, v) => { fake[k] = v } },
    removeItem: { value: (k) => { delete fake[k] } },
  })
  return fake
}

function result(overrides = {}) {
  return {
    correctCount: 10,
    totalCount: 10,
    accuracy: 100,
    bestStreak: 10,
    score: 1000,
    stars: 3,
    duration: 5000,
    perQuestionLog: [],
    ...overrides,
  }
}

describe('useFlagsStats', () => {
  let restore

  beforeEach(() => {
    const fake = installFakeLocalStorage()
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true, writable: true })
    restore = () => Object.defineProperty(globalThis, 'localStorage', { value: original, configurable: true, writable: true })
  })

  afterEach(() => restore())

  it('Level 1 is initially unlocked', () => {
    const { getProgress } = useFlagsStats()
    expect(getProgress().highestUnlocked).toBe(1)
  })

  it('completing a level unlocks the next one', () => {
    const { recordCompletion, getProgress } = useFlagsStats()
    recordCompletion(1, result())
    expect(getProgress().highestUnlocked).toBe(2)
  })

  it('completion unlocks the next level even on a weak (1-star) result', () => {
    const { recordCompletion, getProgress } = useFlagsStats()
    recordCompletion(1, result({ correctCount: 3, totalCount: 10, stars: 1 }))
    expect(getProgress().highestUnlocked).toBe(2)
  })

  it('never unlocks past the final level', () => {
    const { recordCompletion, getProgress } = useFlagsStats()
    recordCompletion(FLAGS_LEVELS.length, result())
    expect(getProgress().highestUnlocked).toBe(FLAGS_LEVELS.length)
  })

  it('stars never regress: a worse later attempt keeps the earlier best', () => {
    const { recordCompletion, getStats } = useFlagsStats()
    recordCompletion(1, result({ stars: 3, correctCount: 10 }))
    const { isNewBest } = recordCompletion(1, result({ stars: 1, correctCount: 4 }))
    expect(isNewBest).toBe(false)
    expect(getStats(1).best.stars).toBe(3)
  })

  it('highestUnlocked never regresses either', () => {
    const { recordCompletion, getProgress } = useFlagsStats()
    recordCompletion(3, result())
    recordCompletion(1, result())
    expect(getProgress().highestUnlocked).toBe(4)
  })

  it('best comparator tie-breaks on correctCount when stars match', () => {
    const { recordCompletion, getStats } = useFlagsStats()
    recordCompletion(1, result({ stars: 2, correctCount: 8, duration: 5000 }))
    const { isNewBest } = recordCompletion(1, result({ stars: 2, correctCount: 9, duration: 9000 }))
    expect(isNewBest).toBe(true)
    expect(getStats(1).best.correctCount).toBe(9)
  })

  it('best comparator tie-breaks on duration when stars and correctCount match', () => {
    const { recordCompletion, getStats } = useFlagsStats()
    recordCompletion(1, result({ stars: 3, correctCount: 10, duration: 9000 }))
    const { isNewBest } = recordCompletion(1, result({ stars: 3, correctCount: 10, duration: 4000 }))
    expect(isNewBest).toBe(true)
    expect(getStats(1).best.duration).toBe(4000)
  })

  it('history caps at 30 entries, most recent last', () => {
    const { recordCompletion, getHistory } = useFlagsStats()
    for (let i = 0; i < 35; i++) recordCompletion(1, result({ score: i }))
    const history = getHistory(1)
    expect(history.length).toBe(30)
    expect(history[history.length - 1].score).toBe(34)
  })

  it('learning state: a correct streak of 3 reaches mastered', () => {
    const { recordCompletion, getLearningState } = useFlagsStats()
    const log = [
      { countryCode: 'gr', correct: true, wrongCode: null, timestamp: 1 },
      { countryCode: 'gr', correct: true, wrongCode: null, timestamp: 2 },
      { countryCode: 'gr', correct: true, wrongCode: null, timestamp: 3 },
    ]
    recordCompletion(1, result({ perQuestionLog: log }))
    expect(getLearningState().gr.mastery).toBe('mastered')
  })

  it('learning state: a wrong answer marks needs-practice and records the confusion', () => {
    const { recordCompletion, getLearningState } = useFlagsStats()
    const log = [{ countryCode: 'ro', correct: false, wrongCode: 'td', timestamp: 1 }]
    recordCompletion(1, result({ perQuestionLog: log }))
    const state = getLearningState().ro
    expect(state.mastery).toBe('needs-practice')
    expect(state.confusions.td).toBe(1)
  })

  it('getWeakCountries / canPracticeWeak reflect the needs-practice threshold', () => {
    const { recordCompletion, getWeakCountries, canPracticeWeak } = useFlagsStats()
    const codes = ['ro', 'td', 'ad', 'md', 'ie']
    for (const code of codes) {
      recordCompletion(1, result({ perQuestionLog: [{ countryCode: code, correct: false, wrongCode: null, timestamp: 1 }] }))
    }
    expect(getWeakCountries().sort()).toEqual([...codes].sort())
    expect(canPracticeWeak()).toBe(true)
  })

  it('canPracticeWeak is false below the threshold', () => {
    const { recordCompletion, canPracticeWeak } = useFlagsStats()
    recordCompletion(1, result({ perQuestionLog: [{ countryCode: 'ro', correct: false, wrongCode: null, timestamp: 1 }] }))
    expect(canPracticeWeak()).toBe(false)
  })

  it('Practice Weak Flags (level=null) updates learning state but never touches progress/stats', () => {
    const { recordCompletion, getProgress, getStats, getLearningState } = useFlagsStats()
    const log = [{ countryCode: 'gr', correct: true, wrongCode: null, timestamp: 1 }]
    const { isNewBest } = recordCompletion(null, result({ perQuestionLog: log }))
    expect(isNewBest).toBe(false)
    expect(getProgress().highestUnlocked).toBe(1)
    expect(getStats(1).completed).toBe(0)
    expect(getLearningState().gr.correct).toBe(1)
  })

  it('recordStart is a no-op for Practice Weak Flags (level=null)', () => {
    const { recordStart, getStats } = useFlagsStats()
    expect(() => recordStart(null)).not.toThrow()
    expect(getStats(1).started).toBe(0)
  })
})
