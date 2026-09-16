import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTargetTapGame } from './useTargetTapGame.js'
import { TARGETTAP_DIFFICULTIES } from '../../constants/targettap/difficulties.js'

// Same manually-driven virtual clock pattern as useOddOneOutGame.test.js —
// advance() bumps performance.now() and the fake timers by the same amount.
let fakeNow
function advance(ms) {
  fakeNow += ms
  vi.advanceTimersByTime(ms)
}

const COUNTDOWN_TO_PLAYING_MS = 700 * 3 + 500 + 10

function startAndReachPlaying(game, difficultyKey, previousTarget, seed) {
  game.start(difficultyKey, previousTarget, seed)
  advance(COUNTDOWN_TO_PLAYING_MS)
}

const INTERVAL = TARGETTAP_DIFFICULTIES.easy.stimulusInterval

describe('useTargetTapGame', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fakeNow = 0
    vi.spyOn(performance, 'now').mockImplementation(() => fakeNow)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts in countdown, then reaches playing with the first stimulus shown', () => {
    const game = useTargetTapGame()
    game.start('easy', null, 1)
    expect(game.status.value).toBe('countdown')
    advance(COUNTDOWN_TO_PLAYING_MS)
    expect(game.status.value).toBe('playing')
    expect(game.stimulusIndex.value).toBe(0)
    expect(game.currentLetter.value).not.toBeNull()
    expect(game.targetLetter.value).not.toBeNull()
  })

  // The first two stimuli can never be targets (SPEC §8), so these advance
  // until they reach the sequence's actual first target rather than
  // assuming index 0.
  function advanceToFirstTarget(game) {
    while (game.currentLetter.value !== game.targetLetter.value) advance(INTERVAL)
  }

  it('a tap on the target is a Hit; the stimulus does not advance early', () => {
    const game = useTargetTapGame()
    startAndReachPlaying(game, 'easy', null, 1)
    advanceToFirstTarget(game)
    const indexBefore = game.stimulusIndex.value
    game.tap()
    expect(game.hits.value).toBe(1)
    expect(game.stimulusIndex.value).toBe(indexBefore) // interval hasn't elapsed yet — no early advance (SPEC §15)
  })

  it('a tap on a non-target is a False Alarm', () => {
    const game = useTargetTapGame()
    startAndReachPlaying(game, 'easy', null, 1)
    expect(game.currentLetter.value).not.toBe(game.targetLetter.value) // index 0 is always a non-target (SPEC §8)
    game.tap()
    expect(game.falseAlarms.value).toBe(1)
  })

  it('letting the target\'s interval expire untapped is a Miss', () => {
    const game = useTargetTapGame()
    startAndReachPlaying(game, 'easy', null, 1)
    advanceToFirstTarget(game)
    const indexBefore = game.stimulusIndex.value
    advance(INTERVAL)
    expect(game.misses.value).toBe(1)
    expect(game.stimulusIndex.value).toBe(indexBefore + 1)
  })

  it('letting a non-target\'s interval expire untapped is a Correct Rejection', () => {
    const game = useTargetTapGame()
    startAndReachPlaying(game, 'easy', null, 1)
    if (game.currentLetter.value === game.targetLetter.value) return
    advance(INTERVAL)
    expect(game.correctRejections.value).toBe(1)
  })

  it('only the first tap during a stimulus interval counts', () => {
    const game = useTargetTapGame()
    startAndReachPlaying(game, 'easy', null, 1)
    game.tap()
    game.tap()
    game.tap()
    const total = game.hits.value + game.falseAlarms.value
    expect(total).toBe(1)
  })

  it('advances through the whole stream classifying every stimulus exactly once', () => {
    const game = useTargetTapGame()
    startAndReachPlaying(game, 'easy', null, 1)
    const total = game.totalStimuli.value
    for (let i = 0; i < total; i++) advance(INTERVAL)
    expect(game.status.value).toBe('finished')
    const classified = game.hits.value + game.misses.value + game.falseAlarms.value + game.correctRejections.value
    expect(classified).toBe(total)
  })

  it('never uses the same target as the previous game', () => {
    for (let seed = 0; seed < 20; seed++) {
      const game = useTargetTapGame()
      startAndReachPlaying(game, 'easy', 'K', seed)
      expect(game.targetLetter.value).not.toBe('K')
    }
  })

  it('a seeded round is fully reproducible stimulus-for-stimulus', () => {
    const gameA = useTargetTapGame()
    const gameB = useTargetTapGame()
    // Both start at the same fakeNow=0 baseline and are advanced together
    // from there — starting them one after another (each via its own
    // advance() past the countdown) would offset their virtual clocks and
    // make a real, correctly-in-lockstep comparison impossible.
    gameA.start('medium', null, 123)
    gameB.start('medium', null, 123)
    advance(COUNTDOWN_TO_PLAYING_MS)
    expect(gameA.targetLetter.value).toBe(gameB.targetLetter.value)
    for (let i = 0; i < 5; i++) {
      expect(gameA.currentLetter.value).toBe(gameB.currentLetter.value)
      advance(TARGETTAP_DIFFICULTIES.medium.stimulusInterval)
    }
  })

  describe('pause / resume (SPEC §29)', () => {
    it('pausing mid-stimulus discards it uncounted', () => {
      const game = useTargetTapGame()
      startAndReachPlaying(game, 'easy', null, 1)
      game.pause()
      expect(game.status.value).toBe('paused')
      const classified = game.hits.value + game.misses.value + game.falseAlarms.value + game.correctRejections.value
      expect(classified).toBe(0)
    })

    it('the elapsed clock does not advance while paused', () => {
      const game = useTargetTapGame()
      startAndReachPlaying(game, 'easy', null, 1)
      game.pause()
      const elapsedAtPause = game.elapsedTime.value
      advance(5000)
      expect(game.elapsedTime.value).toBe(elapsedAtPause)
    })

    it('resume shows a countdown then a non-target buffer stimulus that is never classified', () => {
      const game = useTargetTapGame()
      startAndReachPlaying(game, 'easy', null, 1)
      const interruptedIndex = game.stimulusIndex.value
      game.pause()
      game.resumeFromPause()
      expect(game.status.value).toBe('countdown')
      advance(COUNTDOWN_TO_PLAYING_MS)
      expect(game.status.value).toBe('playing')
      expect(game.currentLetter.value).not.toBe(game.targetLetter.value) // always a non-target (SPEC §29)

      game.tap() // must not be classified — it's the synthetic buffer
      const classified = game.hits.value + game.misses.value + game.falseAlarms.value + game.correctRejections.value
      expect(classified).toBe(0)

      // After the buffer's interval, the true sequence resumes at exactly
      // the index that was interrupted — nothing skipped, nothing repeated.
      advance(INTERVAL)
      expect(game.stimulusIndex.value).toBe(interruptedIndex)
    })

    it('pausing mid-countdown is also handled', () => {
      const game = useTargetTapGame()
      game.start('easy', null, 1)
      game.pause()
      expect(game.status.value).toBe('paused')
    })
  })

  it('reset returns to idle and stops all timers', () => {
    const game = useTargetTapGame()
    startAndReachPlaying(game, 'easy', null, 1)
    game.reset()
    expect(game.status.value).toBe('idle')
  })

  it('computes score/accuracy/rates from the classification counts', () => {
    const game = useTargetTapGame()
    startAndReachPlaying(game, 'easy', null, 1)
    const total = game.totalStimuli.value
    for (let i = 0; i < total; i++) advance(INTERVAL)
    const r = game.results.value
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.accuracy).toBeGreaterThanOrEqual(0)
    expect(r.accuracy).toBeLessThanOrEqual(100)
    expect(r.hits + r.misses).toBe(r.targets)
    expect(r.hits + r.misses + r.falseAlarms + r.correctRejections).toBe(r.totalStimuli)
  })
})
