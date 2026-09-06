import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSchulteGame } from './useSchulteGame.js'
import { SCHULTE_DIFFICULTIES } from '../../constants/schulte/difficulties.js'
import { avg, median } from '../mathStats.js'

// Same manually-driven virtual clock pattern as useStroopGame.test.js —
// advance() bumps performance.now() and the fake timers by the same amount.
let fakeNow
function advance(ms) {
  fakeNow += ms
  vi.advanceTimersByTime(ms)
}

const COUNTDOWN_TO_PLAYING_MS = 700 * 3 + 500 + 10

function startAndReachPlaying(game, difficulty) {
  game.start(difficulty)
  advance(COUNTDOWN_TO_PLAYING_MS)
}

function indexOfNumber(game, number) {
  return game.board.value.findIndex((cell) => cell.number === number)
}

describe('useSchulteGame', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fakeNow = 0
    vi.spyOn(performance, 'now').mockImplementation(() => fakeNow)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('builds a board containing every number from 1 to gridSize^2 exactly once', () => {
    const game = useSchulteGame()
    startAndReachPlaying(game, SCHULTE_DIFFICULTIES.medium) // gridSize 4 -> 16 cells

    const numbers = game.board.value.map((cell) => cell.number).sort((a, b) => a - b)
    const expected = Array.from({ length: 16 }, (_, i) => i + 1)
    expect(numbers).toEqual(expected)
  })

  it('never reshuffles the board after generation — cell identity at each index is stable', () => {
    const game = useSchulteGame()
    startAndReachPlaying(game, SCHULTE_DIFFICULTIES.easy)
    const before = game.board.value.map((cell) => cell.number)

    // Make one correct selection, then verify every OTHER cell's number is unchanged.
    const firstIdx = indexOfNumber(game, 1)
    advance(300)
    game.select(firstIdx)

    const after = game.board.value.map((cell) => cell.number)
    expect(after).toEqual(before)
  })

  it('a wrong tap is counted as an error, does not advance the target, and does not complete the round', () => {
    const game = useSchulteGame()
    startAndReachPlaying(game, SCHULTE_DIFFICULTIES.easy) // gridSize 3 -> target starts at 1

    const wrongIdx = indexOfNumber(game, 2) // definitely not the current target (1)
    advance(300)
    game.select(wrongIdx)

    expect(game.target.value).toBe(1) // unchanged
    expect(game.results.value.errors).toBe(1)
    expect(game.results.value.totalSelections).toBe(1)
    expect(game.status.value).toBe('playing')
  })

  it('excludes wrong-tap selections from avgSearchTime/medianSearchTime, counting only correct-pick intervals', () => {
    const game = useSchulteGame()
    startAndReachPlaying(game, SCHULTE_DIFFICULTIES.easy) // 3x3, numbers 1..9

    // Find 1 with a known interval from round start.
    advance(300)
    game.select(indexOfNumber(game, 1))

    // A wrong tap in between — must not become its own interval entry. Its
    // elapsed time isn't "subtracted out" either: only a correct pick resets
    // the clock, so this time correctly folds into the *next* correct
    // interval (1 -> 2), which is the behavior being verified here.
    advance(150)
    game.select(indexOfNumber(game, 9)) // wrong: target is still 2

    advance(500)
    game.select(indexOfNumber(game, 2))

    advance(700)
    game.select(indexOfNumber(game, 3))

    const correctIntervals = [300, 150 + 500, 700]

    const results = game.results.value
    expect(results.errors).toBe(1)
    expect(results.totalSelections).toBe(4) // 3 correct + 1 wrong
    expect(results.avgSearchTime).toBeCloseTo(avg(correctIntervals), 5)
    expect(results.medianSearchTime).toBeCloseTo(median(correctIntervals), 5)
  })

  it('finishes the round exactly when the last number is found, with the correct completion time', () => {
    const game = useSchulteGame()
    startAndReachPlaying(game, SCHULTE_DIFFICULTIES.easy) // 3x3 -> 9 cells

    let elapsed = 0
    for (let target = 1; target <= 9; target++) {
      const step = 200
      advance(step)
      elapsed += step
      game.select(indexOfNumber(game, target))
    }

    expect(game.status.value).toBe('finished')
    expect(game.results.value.completionTime).toBeCloseTo(elapsed, 5)
    expect(game.results.value.errors).toBe(0)
    expect(game.results.value.accuracy).toBe(100)
  })
})
