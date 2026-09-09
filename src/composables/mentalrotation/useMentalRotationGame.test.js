import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useMentalRotationGame } from './useMentalRotationGame.js'
import { MENTALROTATION_DIFFICULTIES, MENTALROTATION_UNTIMED_TRIAL_COUNT } from '../../constants/mentalrotation/difficulties.js'

// Same manually-driven virtual clock pattern as useSwitchTrailGame.test.js.
let fakeNow
function advance(ms) {
  fakeNow += ms
  vi.advanceTimersByTime(ms)
}

const COUNTDOWN_TO_PLAYING_MS = 700 * 3 + 500 + 10
const FEEDBACK_MS = 300 + 10

function answerCorrectly(game) {
  const trial = game.currentTrial.value
  const correct = trial.candidates.find((c) => c.correct)
  game.answer(correct.id)
  advance(FEEDBACK_MS)
}

function answerWrong(game) {
  const trial = game.currentTrial.value
  const wrong = trial.candidates.find((c) => !c.correct)
  game.answer(wrong.id)
  advance(FEEDBACK_MS)
}

describe('useMentalRotationGame', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fakeNow = 0
    vi.spyOn(performance, 'now').mockImplementation(() => fakeNow)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('timed mode (default, unchanged behavior)', () => {
    it('finishes when the round timer reaches zero, not before', () => {
      const game = useMentalRotationGame()
      game.start(MENTALROTATION_DIFFICULTIES.easy, 1)
      advance(COUNTDOWN_TO_PLAYING_MS)
      expect(game.status.value).toBe('playing')
      expect(game.mode.value).toBe('timed')

      answerCorrectly(game)
      expect(game.status.value).toBe('playing')

      advance(MENTALROTATION_DIFFICULTIES.easy.duration * 1000)
      expect(game.status.value).toBe('finished')
    })
  })

  describe('untimed mode', () => {
    it('defaults mode to timed when not specified, and to untimed when passed', () => {
      const game = useMentalRotationGame()
      game.start(MENTALROTATION_DIFFICULTIES.easy, 1, 'untimed')
      advance(COUNTDOWN_TO_PLAYING_MS)
      expect(game.mode.value).toBe('untimed')
      expect(game.targetTrials.value).toBe(MENTALROTATION_UNTIMED_TRIAL_COUNT)
    })

    it('never starts a countdown timer — timeLeft stays at 0 throughout', () => {
      const game = useMentalRotationGame()
      game.start(MENTALROTATION_DIFFICULTIES.easy, 1, 'untimed')
      advance(COUNTDOWN_TO_PLAYING_MS)
      expect(game.timeLeft.value).toBe(0)
      answerCorrectly(game)
      expect(game.timeLeft.value).toBe(0)
      expect(game.status.value).toBe('playing')
    })

    it('stays in playing status before the trial target is reached', () => {
      const game = useMentalRotationGame()
      game.start(MENTALROTATION_DIFFICULTIES.easy, 1, 'untimed')
      advance(COUNTDOWN_TO_PLAYING_MS)

      for (let i = 0; i < MENTALROTATION_UNTIMED_TRIAL_COUNT - 1; i++) {
        answerCorrectly(game)
      }
      expect(game.status.value).toBe('playing')
      expect(game.results.value.trialsCompleted).toBe(MENTALROTATION_UNTIMED_TRIAL_COUNT - 1)
    })

    it('finishes automatically right after the Nth trial is answered', () => {
      const game = useMentalRotationGame()
      game.start(MENTALROTATION_DIFFICULTIES.easy, 1, 'untimed')
      advance(COUNTDOWN_TO_PLAYING_MS)

      for (let i = 0; i < MENTALROTATION_UNTIMED_TRIAL_COUNT; i++) {
        answerCorrectly(game)
      }
      expect(game.status.value).toBe('finished')
      expect(game.results.value.trialsCompleted).toBe(MENTALROTATION_UNTIMED_TRIAL_COUNT)
      expect(game.results.value.mode).toBe('untimed')
    })

    it('counts wrong answers toward the trial target too, not just correct ones', () => {
      const game = useMentalRotationGame()
      game.start(MENTALROTATION_DIFFICULTIES.easy, 1, 'untimed')
      advance(COUNTDOWN_TO_PLAYING_MS)

      for (let i = 0; i < MENTALROTATION_UNTIMED_TRIAL_COUNT; i++) {
        answerWrong(game)
      }
      expect(game.status.value).toBe('finished')
      expect(game.results.value.trialsCompleted).toBe(MENTALROTATION_UNTIMED_TRIAL_COUNT)
      expect(game.results.value.correct).toBe(0)
    })
  })
})
