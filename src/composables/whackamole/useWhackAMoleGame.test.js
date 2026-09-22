import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useWhackAMoleGame } from './useWhackAMoleGame.js'
import { getLevelConfig } from '../../constants/whackamole/levels.js'

// Same manually-driven virtual clock pattern as targettap/useTargetTapGame.test.js.
let fakeNow
function advance(ms) {
  fakeNow += ms
  vi.advanceTimersByTime(ms)
}

const COUNTDOWN_TO_PLAYING_MS = 700 * 3 + 500 + 10

function startAndReachPlaying(game, level) {
  game.begin(level)
  advance(COUNTDOWN_TO_PLAYING_MS)
}

// Advances through gaps/stimuli using the real config so tests stay valid
// even though gaps are randomized per stimulus (mocked performance.now()
// doesn't affect Math.random, so gap lengths are real but bounded by the
// level's own gapMinMs/gapMaxMs).
function advancePastGap(config) {
  advance(config.gapMaxMs)
}

function advancePastVisible(config) {
  advance(config.targetVisibleMs)
}

describe('useWhackAMoleGame', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fakeNow = 0
    vi.spyOn(performance, 'now').mockImplementation(() => fakeNow)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts in countdown, then reaches playing and presents a gap before the first stimulus', () => {
    const game = useWhackAMoleGame()
    game.begin(1)
    expect(game.status.value).toBe('countdown')
    advance(COUNTDOWN_TO_PLAYING_MS)
    expect(game.status.value).toBe('playing')
    expect(game.activeCell.value).toBeNull() // still in the initial gap
  })

  it('a tap on the active mole cell is a Hit', () => {
    const config = getLevelConfig(1)
    const game = useWhackAMoleGame()
    startAndReachPlaying(game, 1)
    advancePastGap(config)
    expect(game.activeCell.value).not.toBeNull()
    game.tapCell(game.activeCell.value)
    expect(game.hits.value).toBe(1)
  })

  it('a tap on a non-active cell while a stimulus is showing is an Empty Tap, and does not lock out a later correct tap', () => {
    const config = getLevelConfig(1) // 2x2, mole-only
    const game = useWhackAMoleGame()
    startAndReachPlaying(game, 1)
    advancePastGap(config)
    const active = game.activeCell.value
    const wrongCell = (active + 1) % 4
    game.tapCell(wrongCell)
    expect(game.emptyTaps.value).toBe(1)
    expect(game.hits.value).toBe(0)
    game.tapCell(active)
    expect(game.hits.value).toBe(1)
  })

  it('a tap during a gap (no active stimulus) is an Empty Tap', () => {
    const game = useWhackAMoleGame()
    startAndReachPlaying(game, 1)
    expect(game.activeCell.value).toBeNull()
    game.tapCell(0)
    expect(game.emptyTaps.value).toBe(1)
  })

  it('letting a mole\'s visible window expire untapped is a Miss', () => {
    const config = getLevelConfig(1)
    const game = useWhackAMoleGame()
    startAndReachPlaying(game, 1)
    advancePastGap(config)
    advancePastVisible(config)
    expect(game.misses.value).toBe(1)
  })

  it('only the first tap on the active cell counts (debounce, SPEC §10)', () => {
    const config = getLevelConfig(1)
    const game = useWhackAMoleGame()
    startAndReachPlaying(game, 1)
    advancePastGap(config)
    const active = game.activeCell.value
    game.tapCell(active)
    game.tapCell(active)
    game.tapCell(active)
    expect(game.hits.value).toBe(1)
  })

  it('a distractor tapped is a False Alarm; untapped is a Correct Rejection', () => {
    // Level 16 is the first with distractors (SPEC §9).
    const config = getLevelConfig(16)
    const game = useWhackAMoleGame()
    startAndReachPlaying(game, 16)

    let sawFalseAlarm = false
    let sawCorrectRejection = false
    for (let i = 0; i < config.targetCount + config.distractorCount && !(sawFalseAlarm && sawCorrectRejection); i++) {
      advancePastGap(config)
      if (game.activeIsDistractor.value) {
        if (!sawFalseAlarm) {
          game.tapCell(game.activeCell.value)
          sawFalseAlarm = true
        } else {
          sawCorrectRejection = true
        }
      }
      advancePastVisible(config)
    }
    expect(game.falseAlarms.value).toBeGreaterThanOrEqual(1)
  })

  it('advances through the whole level, classifying every stimulus exactly once', () => {
    const config = getLevelConfig(1)
    const game = useWhackAMoleGame()
    startAndReachPlaying(game, 1)
    const total = game.totalStimuli.value
    for (let i = 0; i < total; i++) {
      advancePastGap(config)
      advancePastVisible(config)
    }
    expect(game.status.value).toBe('finished')
    const classified = game.hits.value + game.misses.value + game.falseAlarms.value + game.correctRejections.value
    expect(classified).toBe(total)
  })

  describe('pause / resume (SPEC §19)', () => {
    it('pausing mid-stimulus discards it uncounted', () => {
      const config = getLevelConfig(1)
      const game = useWhackAMoleGame()
      startAndReachPlaying(game, 1)
      advancePastGap(config)
      game.pause()
      expect(game.status.value).toBe('paused')
      const classified = game.hits.value + game.misses.value + game.falseAlarms.value + game.correctRejections.value
      expect(classified).toBe(0)
    })

    it('the elapsed clock does not advance while paused', () => {
      const game = useWhackAMoleGame()
      startAndReachPlaying(game, 1)
      game.pause()
      const elapsedAtPause = game.elapsedTime.value
      advance(5000)
      expect(game.elapsedTime.value).toBe(elapsedAtPause)
    })

    it('resume replays the exact interrupted stimulus after a countdown and a fresh gap', () => {
      const config = getLevelConfig(1)
      const game = useWhackAMoleGame()
      startAndReachPlaying(game, 1)
      advancePastGap(config)
      const interruptedIndex = game.stimulusIndex.value
      game.pause()
      game.resumeFromPause()
      expect(game.status.value).toBe('countdown')
      advance(COUNTDOWN_TO_PLAYING_MS)
      expect(game.status.value).toBe('playing')
      expect(game.activeCell.value).toBeNull() // fresh gap, not an instant stimulus
      advance(config.gapMaxMs)
      expect(game.stimulusIndex.value).toBe(interruptedIndex)
      expect(game.activeCell.value).not.toBeNull()
    })

    it('pausing mid-countdown is also handled', () => {
      const game = useWhackAMoleGame()
      game.begin(1)
      game.pause()
      expect(game.status.value).toBe('paused')
    })
  })

  it('reset returns to idle and stops all timers', () => {
    const game = useWhackAMoleGame()
    startAndReachPlaying(game, 1)
    game.reset()
    expect(game.status.value).toBe('idle')
  })

  it('computes score/rates/stars from the classification counts', () => {
    const config = getLevelConfig(1)
    const game = useWhackAMoleGame()
    startAndReachPlaying(game, 1)
    const total = game.totalStimuli.value
    for (let i = 0; i < total; i++) {
      advancePastGap(config)
      advancePastVisible(config)
    }
    const r = game.results.value
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.hitRate).toBeGreaterThanOrEqual(0)
    expect(r.hitRate).toBeLessThanOrEqual(100)
    expect(r.hits + r.misses).toBe(r.targets)
    expect(r.stars).toBeGreaterThanOrEqual(1)
    expect(r.stars).toBeLessThanOrEqual(3)
  })
})
