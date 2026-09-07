import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSwitchTrailGame } from './useSwitchTrailGame.js'
import { SWITCHTRAIL_DIFFICULTIES } from '../../constants/switchtrail/difficulties.js'
import { CELL_COLOR_PALETTE } from '../../constants/cellColors.js'

// Same manually-driven virtual clock pattern as useSchulteGame.test.js —
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

describe('useSwitchTrailGame', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fakeNow = 0
    vi.spyOn(performance, 'now').mockImplementation(() => fakeNow)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts in countdown, then reaches playing with the expected target at 1', () => {
    const game = useSwitchTrailGame()
    game.start('easy', 1)
    expect(game.status.value).toBe('countdown')
    advance(COUNTDOWN_TO_PLAYING_MS)
    expect(game.status.value).toBe('playing')
    expect(game.expectedTarget.value).toBe('1')
  })

  it('a correct tap advances the expected target', () => {
    const game = useSwitchTrailGame()
    startAndReachPlaying(game, 'easy', 1)
    game.tap('1')
    expect(game.expectedTarget.value).toBe('A')
    expect(game.targetsCompleted.value).toBe(1)
  })

  it('a wrong tap does not advance the expected target and increments errors', () => {
    const game = useSwitchTrailGame()
    startAndReachPlaying(game, 'easy', 1)
    game.tap('B') // not the expected '1'
    expect(game.expectedTarget.value).toBe('1')
    expect(game.errors.value).toBe(1)
  })

  it('tapping a label not present on the board (empty space) is a no-op, not an error', () => {
    const game = useSwitchTrailGame()
    startAndReachPlaying(game, 'easy', 1)
    game.tap('Z') // never placed for Easy (only A-F exist)
    expect(game.errors.value).toBe(0)
    expect(game.expectedTarget.value).toBe('1')
  })

  it('the final correct target completes the round and stops the timer', () => {
    const game = useSwitchTrailGame()
    startAndReachPlaying(game, 'easy', 1)
    for (const label of ['1', 'A', '2', 'B', '3', 'C', '4', 'D', '5', 'E', '6']) game.tap(label)
    expect(game.status.value).toBe('playing')

    advance(500)
    game.tap('F')
    expect(game.status.value).toBe('finished')
    expect(game.results.value.completed).toBe(true)
    expect(game.results.value.targetsCompleted).toBe(12)

    const completionTimeAtFinish = game.results.value.completionTime
    advance(1000) // time passing after finish must not change the recorded completion time
    expect(game.results.value.completionTime).toBe(completionTimeAtFinish)
  })

  it('timeout ends the round when time runs out before completion', () => {
    const game = useSwitchTrailGame()
    startAndReachPlaying(game, 'easy', 1) // Easy = 30s
    game.tap('1')
    advance(30_000)
    expect(game.status.value).toBe('finished')
    expect(game.timedOut.value).toBe(true)
    expect(game.results.value.completed).toBe(false)
  })

  it('app hiding (pause) during play stops the timer, and resume shows a fresh countdown', () => {
    const game = useSwitchTrailGame()
    startAndReachPlaying(game, 'easy', 1)
    game.tap('1')
    advance(1000)
    game.pause()
    expect(game.status.value).toBe('paused')
    const remainingAtPause = game.remainingTime.value

    advance(5000) // hidden time must not count against the round
    expect(game.remainingTime.value).toBe(remainingAtPause)

    game.resumeFromPause()
    expect(game.status.value).toBe('countdown')
    advance(COUNTDOWN_TO_PLAYING_MS)
    expect(game.status.value).toBe('playing')
    expect(game.remainingTime.value).toBe(remainingAtPause)
    expect(game.expectedTarget.value).toBe('A') // progress preserved through pause/resume
  })

  describe('scoring', () => {
    it('correct target is worth +100 and wrong target is -50', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'easy', 1)
      game.tap('1') // correct: +100
      game.tap('B') // wrong (expected 'A'): -50
      expect(game.results.value.score).toBe(100 - 50)
    })

    it('an incomplete round receives no time bonus', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'easy', 1)
      game.tap('1')
      advance(30_000) // Easy timeout, only 1/12 completed
      expect(game.results.value.completed).toBe(false)
      expect(game.results.value.score).toBe(100)
    })

    it('a completed round adds floor(remainingSeconds) * 25', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'easy', 1)
      for (const label of ['1', 'A', '2', 'B', '3', 'C', '4', 'D', '5', 'E', '6', 'F']) {
        advance(200)
        game.tap(label)
      }
      const r = game.results.value
      expect(r.completed).toBe(true)
      const expectedBonus = Math.floor(r.timeLimit / 1000 - r.completionTime / 1000) * 25
      expect(r.score).toBe(12 * 100 + expectedBonus + 250) // zero errors -> clean bonus too
    })

    it('a clean (zero-error) completion adds a +250 bonus', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'easy', 1)
      for (const label of ['1', 'A', '2', 'B', '3', 'C', '4', 'D', '5', 'E', '6', 'F']) game.tap(label)
      expect(game.results.value.errors).toBe(0)
      expect(game.results.value.score).toBeGreaterThanOrEqual(12 * 100 + 250)
    })

    it('a completion with errors gets no clean bonus', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'easy', 1)
      game.tap('B') // one wrong tap before playing it out
      for (const label of ['1', 'A', '2', 'B', '3', 'C', '4', 'D', '5', 'E', '6', 'F']) game.tap(label)
      const r = game.results.value
      expect(r.errors).toBe(1)
      expect(r.score).toBe(12 * 100 - 50 + Math.floor(r.timeLimit / 1000 - r.completionTime / 1000) * 25)
    })

    it('score never displays below zero', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'easy', 1)
      for (let i = 0; i < 10; i++) game.tap('Z') // repeated wrong taps, -50 each -> would go deeply negative
      expect(game.results.value.score).toBe(0)
    })
  })

  describe('accuracy', () => {
    it('is correct taps / (correct + incorrect) * 100, ignoring empty-space taps', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'easy', 1)
      game.tap('1') // correct
      game.tap('Z') // empty space, ignored
      game.tap('B') // wrong (expected 'A')
      expect(game.results.value.accuracy).toBeCloseTo(50, 5)
    })
  })

  describe('transition timing', () => {
    it('the first transition is timed from GO! to the first correct tap', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'easy', 1)
      advance(842)
      game.tap('1')
      expect(game.results.value.fastestTransition).toBeCloseTo(842, 0)
    })

    it('an incorrect tap does not reset the transition timer', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'easy', 1)
      advance(300)
      game.tap('B') // wrong, does not reset lastCorrectTime
      advance(300)
      game.tap('1') // correct, total transition time should span both advances
      expect(game.results.value.fastestTransition).toBeCloseTo(600, 0)
    })
  })

  describe('Extreme (dynamic) difficulty', () => {
    it('has 24 targets and a 90s limit, same as Hard', () => {
      expect(SWITCHTRAIL_DIFFICULTIES.extreme.targetCount).toBe(24)
      expect(SWITCHTRAIL_DIFFICULTIES.extreme.timeLimit).toBe(90)
      expect(SWITCHTRAIL_DIFFICULTIES.extreme.dynamic).toBe(true)
    })

    it('a correct tap reshuffles every still-pending target to a new position', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'extreme', 1)
      const before = new Map(game.layout.value.map((t) => [t.label, { x: t.x, y: t.y }]))

      game.tap('1')

      for (const t of game.layout.value) {
        if (t.label === '1') continue // now 'done' — stays exactly where it was tapped
        const prev = before.get(t.label)
        expect(t.x !== prev.x || t.y !== prev.y).toBe(true)
      }
    })

    it('a completed (done) target never moves on later reshuffles', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'extreme', 1)
      game.tap('1')
      const doneEntry = game.layout.value.find((t) => t.label === '1')
      const fixedPosition = { x: doneEntry.x, y: doneEntry.y }

      game.tap('A') // another correct tap triggers another reshuffle

      const stillDone = game.layout.value.find((t) => t.label === '1')
      expect(stillDone.x).toBe(fixedPosition.x)
      expect(stillDone.y).toBe(fixedPosition.y)
      expect(stillDone.state).toBe('done')
    })

    it('a wrong tap does not trigger a reshuffle', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'extreme', 1)
      const before = new Map(game.layout.value.map((t) => [t.label, { x: t.x, y: t.y }]))

      game.tap('B') // wrong (expected '1')

      for (const t of game.layout.value) {
        const prev = before.get(t.label)
        expect(t.x).toBe(prev.x)
        expect(t.y).toBe(prev.y)
      }
    })

    it('non-dynamic difficulties never reposition targets after a correct tap', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'hard', 1)
      const before = new Map(game.layout.value.map((t) => [t.label, { x: t.x, y: t.y }]))

      game.tap('1')

      for (const t of game.layout.value) {
        const prev = before.get(t.label)
        expect(t.x).toBe(prev.x)
        expect(t.y).toBe(prev.y)
      }
    })

    it('scoring works exactly like Hard — no formula changes', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'extreme', 1)
      game.tap('1')
      expect(game.results.value.score).toBe(100)
    })
  })

  describe('Random Color variant', () => {
    it('leaves every target uncolored when colorMode is off', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'easy', 1)
      for (const t of game.layout.value) expect(t.color).toBeFalsy()
    })

    it('assigns one valid palette color per target when colorMode is on', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'medium', 1, { colorMode: true }) // 16 targets
      const validHexes = CELL_COLOR_PALETTE.map((c) => c.hex)

      expect(game.layout.value).toHaveLength(16)
      for (const t of game.layout.value) expect(validHexes).toContain(t.color)
    })

    it('a target keeps its color when Extreme reshuffles it to a new position', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'extreme', 1, { colorMode: true })
      const before = new Map(game.layout.value.map((t) => [t.label, t.color]))

      game.tap('1') // triggers a reshuffle of every other still-pending target

      for (const t of game.layout.value) {
        expect(t.color).toBe(before.get(t.label)) // same color, even though x/y moved
      }
    })

    it('the completed target also keeps its color', () => {
      const game = useSwitchTrailGame()
      startAndReachPlaying(game, 'easy', 1, { colorMode: true })
      const colorBefore = game.layout.value.find((t) => t.label === '1').color

      game.tap('1')

      const done = game.layout.value.find((t) => t.label === '1')
      expect(done.state).toBe('done')
      expect(done.color).toBe(colorBefore)
    })
  })
})
