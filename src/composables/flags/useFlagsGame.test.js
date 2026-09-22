import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useFlagsGame } from './useFlagsGame.js'

describe('useFlagsGame', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('begin(level) starts a 10-question round with 4 choices per question', () => {
    const game = useFlagsGame()
    game.begin(1)
    expect(game.status.value).toBe('playing')
    expect(game.totalQuestions.value).toBe(10)
    expect(game.currentQuestion.value.choices.length).toBe(4)
    expect(game.currentQuestion.value.correctIndex).toBeGreaterThanOrEqual(0)
    expect(game.currentQuestion.value.correctIndex).toBeLessThan(4)
  })

  it('selecting the correct choice counts as correct and shows feedback', () => {
    const game = useFlagsGame()
    game.begin(1)
    const q = game.currentQuestion.value
    game.selectAnswer(q.correctIndex)
    expect(game.status.value).toBe('feedback')
    expect(game.lastAnswer.value.correct).toBe(true)
    expect(game.correctCount.value).toBe(1)
  })

  it('selecting a wrong choice records the wrong country and does not count as correct', () => {
    const game = useFlagsGame()
    game.begin(1)
    const q = game.currentQuestion.value
    const wrongIndex = (q.correctIndex + 1) % 4
    game.selectAnswer(wrongIndex)
    expect(game.lastAnswer.value.correct).toBe(false)
    expect(game.lastAnswer.value.selectedCode).toBe(q.choices[wrongIndex])
    expect(game.correctCount.value).toBe(0)
  })

  it('a second tap during feedback is ignored (input stays locked)', () => {
    const game = useFlagsGame()
    game.begin(1)
    const q = game.currentQuestion.value
    game.selectAnswer(q.correctIndex)
    const answerAfterFirstTap = game.lastAnswer.value
    game.selectAnswer((q.correctIndex + 1) % 4)
    expect(game.lastAnswer.value).toBe(answerAfterFirstTap)
    expect(game.correctCount.value).toBe(1)
  })

  it('advances through all 10 questions to finished, tallying correctCount', () => {
    const game = useFlagsGame()
    game.begin(1)
    for (let i = 0; i < 10; i++) {
      const q = game.currentQuestion.value
      game.selectAnswer(q.correctIndex) // answer every question correctly
      vi.advanceTimersByTime(1300)
    }
    expect(game.status.value).toBe('finished')
    expect(game.results.value.correctCount).toBe(10)
    expect(game.results.value.totalCount).toBe(10)
    expect(game.results.value.stars).toBe(3)
  })

  it('pausing mid-question (unanswered) does not score it, and resume restores the same question', () => {
    const game = useFlagsGame()
    game.begin(1)
    const q = game.currentQuestion.value
    game.pause()
    expect(game.status.value).toBe('paused')
    game.resumeFromPause()
    expect(game.status.value).toBe('playing')
    expect(game.currentQuestion.value).toBe(q)
    expect(game.correctCount.value).toBe(0)
    expect(game.results.value.perQuestionLog.length).toBe(0)
  })

  it('pausing during feedback replays that feedback in full on resume, then advances', () => {
    const game = useFlagsGame()
    game.begin(1)
    const q = game.currentQuestion.value
    game.selectAnswer(q.correctIndex)
    game.pause()
    expect(game.status.value).toBe('paused')
    game.resumeFromPause()
    expect(game.status.value).toBe('feedback')
    vi.advanceTimersByTime(1300)
    expect(game.questionIndex.value).toBe(1)
  })

  it('snapshot/resumeFromSave round-trips mid-round progress', () => {
    const game = useFlagsGame()
    game.begin(5)
    game.selectAnswer(game.currentQuestion.value.correctIndex)
    vi.advanceTimersByTime(1300)
    const snap = game.snapshot()

    const restored = useFlagsGame()
    restored.resumeFromSave(snap)
    expect(restored.level.value).toBe(5)
    expect(restored.questionIndex.value).toBe(snap.questionIndex)
    expect(restored.correctCount.value).toBe(1)
    expect(restored.totalQuestions.value).toBe(10)
  })

  it('beginPractice builds a round from the given pool, is not level-scoped, and never affects hasNextLevel logic', () => {
    const game = useFlagsGame()
    game.beginPractice(['gr', 'fr', 'de', 'it', 'es'], {})
    expect(game.level.value).toBeNull()
    expect(game.isPractice.value).toBe(true)
    expect(game.totalQuestions.value).toBe(5)
    expect(game.results.value.level).toBeNull()
  })
})
