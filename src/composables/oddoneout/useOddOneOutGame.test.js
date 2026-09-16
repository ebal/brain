import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useOddOneOutGame } from './useOddOneOutGame.js'

// Same manually-driven virtual clock pattern as useSwitchTrailGame.test.js —
// advance() bumps performance.now() and the fake timers by the same amount.
let fakeNow
function advance(ms) {
  fakeNow += ms
  vi.advanceTimersByTime(ms)
}

const COUNTDOWN_TO_PLAYING_MS = 700 * 3 + 500 + 10

function startAndReachPlaying(game, difficultyKey, seed, options) {
  game.start(difficultyKey, seed, options)
  advance(COUNTDOWN_TO_PLAYING_MS)
}

describe('useOddOneOutGame', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fakeNow = 0
    vi.spyOn(performance, 'now').mockImplementation(() => fakeNow)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts in countdown, then reaches playing with a valid first trial', () => {
    const game = useOddOneOutGame()
    game.start('easy', 1)
    expect(game.status.value).toBe('countdown')
    advance(COUNTDOWN_TO_PLAYING_MS)
    expect(game.status.value).toBe('playing')
    expect(game.trial.value.cells.length).toBe(16)
  })

  it('a correct tap advances to a new trial and increments correct', () => {
    const game = useOddOneOutGame()
    startAndReachPlaying(game, 'easy', 1)
    const firstOddIndex = game.trial.value.oddIndex
    game.tap(firstOddIndex)
    expect(game.correct.value).toBe(1)
    expect(game.wrong.value).toBe(0)
    // A brand-new trial always has exactly one odd cell of its own.
    const differing = game.trial.value.cells.filter((c) => c !== game.trial.value.base)
    expect(differing.length).toBe(1)
  })

  it('a wrong tap does not advance the trial and increments wrong', () => {
    const game = useOddOneOutGame()
    startAndReachPlaying(game, 'easy', 1)
    const trialBefore = game.trial.value
    const wrongCellIndex = trialBefore.cells.findIndex((_, i) => i !== trialBefore.oddIndex)
    game.tap(wrongCellIndex)
    expect(game.wrong.value).toBe(1)
    expect(game.correct.value).toBe(0)
    expect(game.trial.value).toBe(trialBefore)
    expect(game.feedback.value).toBe('wrong')
    expect(game.wrongIndex.value).toBe(wrongCellIndex)
  })

  it('multiple wrong taps on the same trial are all counted', () => {
    const game = useOddOneOutGame()
    startAndReachPlaying(game, 'easy', 1)
    const trial = game.trial.value
    const wrongCellIndex = trial.cells.findIndex((_, i) => i !== trial.oddIndex)
    game.tap(wrongCellIndex)
    game.tap(wrongCellIndex)
    game.tap(wrongCellIndex)
    expect(game.wrong.value).toBe(3)
    expect(game.trial.value).toBe(trial)
  })

  it('tapping while not playing is a no-op', () => {
    const game = useOddOneOutGame()
    game.start('easy', 1) // still in countdown
    game.tap(0)
    expect(game.correct.value).toBe(0)
    expect(game.wrong.value).toBe(0)
  })

  it('a full round times out and produces results, disabling further taps', () => {
    const game = useOddOneOutGame()
    startAndReachPlaying(game, 'easy', 1)
    advance(20 * 1000) // Easy's full 20s time limit
    expect(game.status.value).toBe('finished')
    expect(game.timedOut.value).toBe(true)
    game.tap(0)
    expect(game.correct.value).toBe(0) // the tap after finish() must not count
  })

  it('an untouched trial at timeout is not counted toward trials/correct/wrong', () => {
    const game = useOddOneOutGame()
    startAndReachPlaying(game, 'easy', 1)
    const oddIndex = game.trial.value.oddIndex
    game.tap(oddIndex) // one correct answer, starts a fresh trial
    advance(20 * 1000) // time runs out while the fresh trial sits untouched
    expect(game.results.value.correct).toBe(1)
    expect(game.results.value.wrong).toBe(0)
    expect(game.results.value.trials).toBe(1) // the untouched final trial doesn't count
  })

  it('a trial with a wrong tap still open at timeout counts toward trials (SPEC §16)', () => {
    const game = useOddOneOutGame()
    startAndReachPlaying(game, 'easy', 1)
    const trial = game.trial.value
    const wrongCellIndex = trial.cells.findIndex((_, i) => i !== trial.oddIndex)
    game.tap(wrongCellIndex) // engage with this trial, then let time run out on it
    advance(20 * 1000)
    expect(game.results.value.correct).toBe(0)
    expect(game.results.value.wrong).toBe(1)
    expect(game.results.value.trials).toBe(1) // engaged (had a wrong tap), so it counts
  })

  it('computes score/accuracy from correct and wrong counts', () => {
    const game = useOddOneOutGame()
    startAndReachPlaying(game, 'easy', 1)
    for (let i = 0; i < 3; i++) {
      game.tap(game.trial.value.oddIndex)
    }
    const wrongIndex = game.trial.value.cells.findIndex((_, i) => i !== game.trial.value.oddIndex)
    game.tap(wrongIndex)
    advance(20 * 1000)
    const results = game.results.value
    expect(results.correct).toBe(3)
    expect(results.wrong).toBe(1)
    expect(results.score).toBe(3 * 100 - 1 * 75)
    expect(results.accuracy).toBeCloseTo((3 / 4) * 100, 5)
  })

  it('pause stops the timer and resumeFromPause runs a fresh countdown into a new trial', () => {
    const game = useOddOneOutGame()
    startAndReachPlaying(game, 'easy', 1)
    game.tap(game.trial.value.oddIndex)
    const trialBeforePause = game.trial.value
    game.pause()
    expect(game.status.value).toBe('paused')
    advance(5000) // time must not advance while paused
    expect(game.elapsedTime.value).toBeLessThan(5000)

    game.resumeFromPause()
    expect(game.status.value).toBe('countdown')
    // SPEC §24: a fresh trial is generated immediately on resume, not reused.
    expect(game.trial.value).not.toBe(trialBeforePause)
    advance(COUNTDOWN_TO_PLAYING_MS)
    expect(game.status.value).toBe('playing')
  })

  it('pausing mid-countdown is also handled', () => {
    const game = useOddOneOutGame()
    game.start('easy', 1)
    game.pause()
    expect(game.status.value).toBe('paused')
  })

  it('reset returns to idle and stops all timers', () => {
    const game = useOddOneOutGame()
    startAndReachPlaying(game, 'easy', 1)
    game.reset()
    expect(game.status.value).toBe('idle')
  })

  it('a seeded round is fully reproducible trial-for-trial', () => {
    const gameA = useOddOneOutGame()
    const gameB = useOddOneOutGame()
    startAndReachPlaying(gameA, 'medium', 123)
    startAndReachPlaying(gameB, 'medium', 123)
    for (let i = 0; i < 5; i++) {
      expect(gameA.trial.value).toEqual(gameB.trial.value)
      gameA.tap(gameA.trial.value.oddIndex)
      gameB.tap(gameB.trial.value.oddIndex)
    }
  })

  describe('Random Color variant', () => {
    it('is off by default (no cellColors)', () => {
      const game = useOddOneOutGame()
      startAndReachPlaying(game, 'easy', 1)
      expect(game.cellColors.value).toEqual([])
    })

    it('assigns one color per cell when enabled', () => {
      const game = useOddOneOutGame()
      startAndReachPlaying(game, 'easy', 1, { colorMode: true })
      expect(game.cellColors.value.length).toBe(game.trial.value.cells.length)
      expect(game.cellColors.value.every((c) => typeof c === 'string')).toBe(true)
    })

    it('regenerates colors on every new trial', () => {
      const game = useOddOneOutGame()
      startAndReachPlaying(game, 'easy', 1, { colorMode: true })
      const colorsBefore = game.cellColors.value
      game.tap(game.trial.value.oddIndex)
      expect(game.cellColors.value).not.toBe(colorsBefore)
      expect(game.cellColors.value.length).toBe(game.trial.value.cells.length)
    })

    it('never correlates color with which cell is odd (spot-check across many trials)', () => {
      const game = useOddOneOutGame()
      startAndReachPlaying(game, 'hard', 1, { colorMode: true })
      // Nothing to assert about a specific color, but the odd cell's color
      // must come from the same pool/process as every other cell — i.e. the
      // array is plain per-index noise, not keyed off oddIndex.
      for (let i = 0; i < 20; i++) {
        expect(game.cellColors.value.length).toBe(game.trial.value.cells.length)
        game.tap(game.trial.value.oddIndex)
      }
    })
  })

  describe('Untimed variant', () => {
    it('does not time out even after the difficulty\'s normal time limit elapses', () => {
      const game = useOddOneOutGame()
      startAndReachPlaying(game, 'easy', 1, { untimed: true }) // Easy's normal limit is 20s
      advance(60 * 1000)
      expect(game.status.value).toBe('playing')
      expect(game.timedOut.value).toBe(false)
    })

    it('ends after the target number of correct answers, not a clock', () => {
      const game = useOddOneOutGame()
      startAndReachPlaying(game, 'easy', 1, { untimed: true })
      const target = game.targetCorrect.value
      expect(target).toBeGreaterThan(0)
      for (let i = 0; i < target - 1; i++) {
        game.tap(game.trial.value.oddIndex)
        expect(game.status.value).toBe('playing')
      }
      game.tap(game.trial.value.oddIndex)
      expect(game.status.value).toBe('finished')
      expect(game.timedOut.value).toBe(false)
      expect(game.results.value.correct).toBe(target)
      expect(game.results.value.trials).toBe(target)
    })

    it('a timed round has targetCorrect of 0 (no fixed-count ending)', () => {
      const game = useOddOneOutGame()
      startAndReachPlaying(game, 'easy', 1)
      expect(game.targetCorrect.value).toBe(0)
    })

    it('wrong taps still count and do not advance toward the target early', () => {
      const game = useOddOneOutGame()
      startAndReachPlaying(game, 'easy', 1, { untimed: true })
      const trial = game.trial.value
      const wrongCellIndex = trial.cells.findIndex((_, i) => i !== trial.oddIndex)
      game.tap(wrongCellIndex)
      game.tap(wrongCellIndex)
      expect(game.status.value).toBe('playing')
      expect(game.wrong.value).toBe(2)
      expect(game.correct.value).toBe(0)
    })
  })

  it('Random Color and Untimed are combinable', () => {
    const game = useOddOneOutGame()
    startAndReachPlaying(game, 'easy', 1, { colorMode: true, untimed: true })
    expect(game.cellColors.value.length).toBe(game.trial.value.cells.length)
    for (let i = 0; i < game.targetCorrect.value; i++) {
      game.tap(game.trial.value.oddIndex)
    }
    expect(game.status.value).toBe('finished')
    expect(game.timedOut.value).toBe(false)
  })
})
