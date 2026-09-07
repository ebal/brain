import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useStroopGame } from './useStroopGame.js'
import { DIFFICULTIES } from '../constants/colors.js'
import { avg, median } from './mathStats.js'

// A manually-driven virtual clock, decoupled from whatever fake-timer support
// Vitest has for performance.now() specifically — advance() bumps both the
// fake timers (so setTimeout/setInterval fire) and performance.now() by
// exactly the same amount, in lockstep, guaranteeing deterministic RTs.
let fakeNow
function advance(ms) {
  fakeNow += ms
  vi.advanceTimersByTime(ms)
}

const COUNTDOWN_TO_PLAYING_MS = 700 * 3 + 500 + 10
const INTER_TRIAL_GAP_MS = 250 + 10

function startAndReachPlaying(game, difficulty, mode = 'color') {
  game.start(difficulty, mode)
  advance(COUNTDOWN_TO_PLAYING_MS)
}

describe('useStroopGame', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fakeNow = 0
    vi.spyOn(performance, 'now').mockImplementation(() => fakeNow)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('reaches "playing" status with a generated trial after the countdown', () => {
    const game = useStroopGame()
    startAndReachPlaying(game, DIFFICULTIES.easy)
    expect(game.status.value).toBe('playing')
    expect(game.currentTrial.value).not.toBeNull()
  })

  it('every generated trial is internally consistent: congruent iff word === ink color', () => {
    const game = useStroopGame()
    startAndReachPlaying(game, DIFFICULTIES.easy)

    for (let i = 0; i < 40 && game.status.value === 'playing'; i++) {
      const trial = game.currentTrial.value
      expect(trial.congruent).toBe(trial.word === trial.color.name)
      game.answer(trial.color.name)
      advance(INTER_TRIAL_GAP_MS)
    }
  })

  it('never generates the same (word, ink color) pair on two consecutive trials', () => {
    const game = useStroopGame()
    startAndReachPlaying(game, DIFFICULTIES.easy)

    let prev = null
    for (let i = 0; i < 40 && game.status.value === 'playing'; i++) {
      const trial = game.currentTrial.value
      if (prev) expect(prev.word === trial.word && prev.colorName === trial.color.name).toBe(false)
      prev = { word: trial.word, colorName: trial.color.name }
      game.answer(trial.color.name)
      advance(INTER_TRIAL_GAP_MS)
    }
  })

  it('keeps the empirical congruent ratio close to the configured ratio over many trials', () => {
    const game = useStroopGame()
    startAndReachPlaying(game, DIFFICULTIES.easy) // congruentRatio: 0.5

    let congruentCount = 0
    let total = 0
    for (let i = 0; i < 100 && game.status.value === 'playing'; i++) {
      if (game.currentTrial.value.congruent) congruentCount += 1
      total += 1
      game.answer(game.currentTrial.value.color.name)
      advance(INTER_TRIAL_GAP_MS)
    }

    // Binomial std dev at p=0.5, n~100 is ~5 — a ±20 window is comfortably
    // wide (4 std devs) while still catching a badly broken ratio.
    expect(total).toBeGreaterThan(50)
    expect(congruentCount).toBeGreaterThan(total * 0.5 - 20)
    expect(congruentCount).toBeLessThan(total * 0.5 + 20)
  })

  it('interference is null before 5 correct trials exist on both sides', () => {
    const game = useStroopGame()
    startAndReachPlaying(game, DIFFICULTIES.easy)

    // Answer exactly one trial and check the gate before more trials accumulate.
    game.answer(game.currentTrial.value.color.name)
    expect(game.results.value.interference).toBeNull()
  })

  it('computes avg/median response time using the same math as mathStats, from real trial timings', () => {
    const game = useStroopGame()
    startAndReachPlaying(game, DIFFICULTIES.easy)

    const rts = [300, 500, 400, 600, 350, 450, 700, 300, 500, 400]
    for (const rt of rts) {
      if (game.status.value !== 'playing') break
      advance(rt)
      game.answer(game.currentTrial.value.color.name) // always correct (color mode)
      advance(INTER_TRIAL_GAP_MS)
    }

    const results = game.results.value
    expect(results.correct).toBe(rts.length)
    expect(results.avgResponseTime).toBeCloseTo(avg(rts), 5)
    expect(results.medianResponseTime).toBeCloseTo(median(rts), 5)
  })

  it('computes a gated interference score once both sides have >= 5 correct trials, from real timings', () => {
    const game = useStroopGame()
    startAndReachPlaying(game, DIFFICULTIES.easy)

    const congruentRTs = []
    const incongruentRTs = []
    for (let i = 0; i < 200 && (congruentRTs.length < 6 || incongruentRTs.length < 6); i++) {
      if (game.status.value !== 'playing') break
      const congruent = game.currentTrial.value.congruent
      const rt = congruent ? 400 : 700
      advance(rt)
      game.answer(game.currentTrial.value.color.name)
      if (congruent) congruentRTs.push(rt)
      else incongruentRTs.push(rt)
      advance(INTER_TRIAL_GAP_MS)
    }

    expect(congruentRTs.length).toBeGreaterThanOrEqual(5)
    expect(incongruentRTs.length).toBeGreaterThanOrEqual(5)

    const expectedInterference = avg(incongruentRTs) - avg(congruentRTs)
    expect(game.results.value.interference).toBeCloseTo(expectedInterference, 5)
  })

  it('classifies a "word" mode trial as correct when the answer matches the printed word, not the ink color', () => {
    const game = useStroopGame()
    startAndReachPlaying(game, DIFFICULTIES.easy, 'word')

    // Wait for a genuinely incongruent trial so word !== ink color is meaningful.
    let i = 0
    while (game.currentTrial.value.congruent && i < 40) {
      game.answer(game.currentTrial.value.word)
      advance(INTER_TRIAL_GAP_MS)
      i += 1
    }
    const trial = game.currentTrial.value
    expect(trial.congruent).toBe(false)
    game.answer(trial.word)
    expect(game.results.value.correct).toBeGreaterThan(0)
    expect(game.results.value.wrong).toBe(0)
  })

  describe('"underline" mode', () => {
    it('never flags underline in color or word mode', () => {
      for (const mode of ['color', 'word']) {
        const game = useStroopGame()
        startAndReachPlaying(game, DIFFICULTIES.easy, mode)
        for (let i = 0; i < 30 && game.status.value === 'playing'; i++) {
          expect(game.currentTrial.value.underline).toBe(false)
          game.answer(game.currentTrial.value.color.name)
          advance(INTER_TRIAL_GAP_MS)
        }
      }
    })

    it('keeps the empirical underline ratio close to UNDERLINE_RATIO over many trials', () => {
      const game = useStroopGame()
      startAndReachPlaying(game, DIFFICULTIES.easy, 'underline')

      let underlineCount = 0
      let total = 0
      for (let i = 0; i < 150 && game.status.value === 'playing'; i++) {
        if (game.currentTrial.value.underline) underlineCount += 1
        total += 1
        // Answer with whichever is correct for this trial so the round runs to completion.
        const trial = game.currentTrial.value
        game.answer(trial.underline ? trial.word : trial.color.name)
        advance(INTER_TRIAL_GAP_MS)
      }

      expect(total).toBeGreaterThan(80)
      // UNDERLINE_RATIO is 0.25; binomial std dev at p=0.25, n~150 is ~5.6 — a
      // generous window while still catching a badly broken ratio.
      expect(underlineCount).toBeGreaterThan(total * 0.25 - 25)
      expect(underlineCount).toBeLessThan(total * 0.25 + 25)
    })

    // Searches for a trial matching `predicate`, answering each skipped
    // trial correctly (so the round doesn't rack up unrelated wrong answers)
    // and bailing out if the round ends before one is found — a fresh Easy
    // round fits well over 80 trials, and a joint condition like "underlined
    // and incongruent" (~12.5% of trials) is overwhelmingly likely to turn
    // up well within that, but this keeps the test from throwing on a null
    // currentTrial in the unlucky tail instead of asserting something wrong.
    function findTrial(game, predicate, maxAttempts = 80) {
      for (let i = 0; i < maxAttempts && game.status.value === 'playing'; i++) {
        const trial = game.currentTrial.value
        if (predicate(trial)) return trial
        game.answer(trial.underline ? trial.word : trial.color.name)
        advance(INTER_TRIAL_GAP_MS)
      }
      return game.status.value === 'playing' ? game.currentTrial.value : null
    }

    it('a non-underlined trial is scored like Color Match: ink color is correct, the word is wrong', () => {
      const game = useStroopGame()
      startAndReachPlaying(game, DIFFICULTIES.easy, 'underline')

      // congruent === false so word !== ink color is a meaningful distinction.
      const trial = findTrial(game, (t) => !t.underline && !t.congruent)
      expect(trial).not.toBeNull()

      game.answer(trial.word) // wrong: target is the ink color, not the word
      expect(game.results.value.wrong).toBe(1)
    })

    it('an underlined trial flips the target to the word: the ink color is wrong, the word is correct', () => {
      const game = useStroopGame()
      startAndReachPlaying(game, DIFFICULTIES.easy, 'underline')

      const trial = findTrial(game, (t) => t.underline && !t.congruent)
      expect(trial).not.toBeNull()

      game.answer(trial.color.name) // wrong: target is the word on an underlined trial
      expect(game.results.value.wrong).toBe(1)
      advance(INTER_TRIAL_GAP_MS)

      if (game.status.value !== 'playing') return // round ended right on that last trial
      const nextTrial = findTrial(game, (t) => t.underline && !t.congruent)
      expect(nextTrial).not.toBeNull()

      const correctBefore = game.results.value.correct
      game.answer(nextTrial.word)
      expect(game.results.value.correct).toBe(correctBefore + 1)
    })
  })
})
