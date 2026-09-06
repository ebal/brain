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
})
