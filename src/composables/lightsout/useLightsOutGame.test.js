import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useLightsOutGame } from './useLightsOutGame.js'
import { minimumMoves, getOptimalSolution } from './solver.js'

const SIZE = 3
const START = [0, 0, 1, 0, 1, 1, 0, 0, 1] // level 1's actual board — optimalMoves 1

describe('useLightsOutGame', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('begins with the exact starting board and status playing', () => {
    const game = useLightsOutGame()
    game.begin(1, SIZE, START)
    expect(game.status.value).toBe('playing')
    expect(game.cells.value).toEqual(START)
    expect(game.moves.value).toBe(0)
  })

  it('tapping a cell toggles it and its orthogonal neighbours, incrementing Moves', () => {
    const game = useLightsOutGame()
    game.begin(1, SIZE, [0, 0, 0, 0, 0, 0, 0, 0, 0])
    game.tapCell(1, 1) // center
    expect(game.cells.value.filter((v) => v === 1).length).toBe(5)
    expect(game.moves.value).toBe(1)
  })

  it('solving the level (following the known 1-move solution) finishes the round', () => {
    const game = useLightsOutGame()
    game.begin(1, SIZE, START)
    const solution = getOptimalSolution(START, SIZE)
    const index = solution.findIndex((v) => v === 1)
    game.tapCell(Math.floor(index / SIZE), index % SIZE)
    expect(game.status.value).toBe('finished')
    expect(game.moves.value).toBe(1)
    expect(game.results.value.optimalMoves).toBe(1)
    expect(game.results.value.stars).toBe(3)
    expect(game.results.value.clean).toBe(true)
  })

  it('undo restores the previous board and decrements Moves, tracking Undos separately', () => {
    const game = useLightsOutGame()
    game.begin(1, SIZE, [0, 0, 0, 0, 0, 0, 0, 0, 0])
    game.tapCell(0, 0)
    expect(game.moves.value).toBe(1)
    game.undo()
    expect(game.moves.value).toBe(0)
    expect(game.undos.value).toBe(1)
    expect(game.cells.value).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0])
  })

  it('undo with no history is a no-op', () => {
    const game = useLightsOutGame()
    game.begin(1, SIZE, START)
    game.undo()
    expect(game.undos.value).toBe(0)
  })

  it('restart returns to the exact original board and zeroes every counter', () => {
    const game = useLightsOutGame()
    game.begin(1, SIZE, START)
    game.tapCell(0, 0)
    game.hint()
    game.restart()
    expect(game.moves.value).toBe(0)
    expect(game.undos.value).toBe(0)
    expect(game.hints.value).toBe(0)
    expect(game.cells.value).toEqual(START)
  })

  it('hint increments the counter and recommends a real press cell without applying it', () => {
    const game = useLightsOutGame()
    game.begin(1, SIZE, START)
    game.hint()
    expect(game.hints.value).toBe(1)
    expect(game.hintCell.value).not.toBeNull()
    expect(game.cells.value).toEqual(START) // not applied automatically
  })

  it('hint is recomputed fresh from the current board, not the original', () => {
    const game = useLightsOutGame()
    // A board needing 2 moves — after making one of them, the hint for the
    // remaining board should differ in general (or at least stay valid for
    // the NEW state, not the old one).
    const twoMoveBoard = [1, 1, 0, 0, 1, 1, 0, 0, 0]
    game.begin(2, SIZE, twoMoveBoard)
    game.hint()
    const firstHintIndex = game.hintCell.value
    game.tapCell(Math.floor(firstHintIndex / SIZE), firstHintIndex % SIZE)
    game.hint()
    // Whatever it recommends now must be a real press toward solving
    // the board as it currently stands.
    const solutionNow = getOptimalSolution(game.cells.value, SIZE)
    expect(solutionNow[game.hintCell.value]).toBe(1)
  })

  it('a real move clears any pending hint', () => {
    const game = useLightsOutGame()
    game.begin(1, SIZE, START)
    game.hint()
    game.tapCell(0, 0)
    expect(game.hintCell.value).toBeNull()
  })

  it('pause stops the timer; resume continues without resetting the board', () => {
    const game = useLightsOutGame()
    game.begin(1, SIZE, START)
    game.tapCell(0, 0)
    game.pause()
    expect(game.status.value).toBe('paused')
    const elapsedAtPause = game.elapsedTime.value
    vi.advanceTimersByTime(5000)
    expect(game.elapsedTime.value).toBe(elapsedAtPause)
    game.resumeFromPause()
    expect(game.status.value).toBe('playing')
  })

  it('resumeFromSave restores an exact autosaved snapshot, including the ability to Restart correctly', () => {
    const gameA = useLightsOutGame()
    gameA.begin(1, SIZE, START)
    gameA.tapCell(0, 0)
    gameA.hint()
    const saved = gameA.snapshot()

    const gameB = useLightsOutGame()
    gameB.resumeFromSave(saved)
    expect(gameB.status.value).toBe('playing')
    expect(gameB.level.value).toBe(1)
    expect(gameB.cells.value).toEqual(saved.cells)
    expect(gameB.moves.value).toBe(1)
    expect(gameB.hints.value).toBe(1)

    gameB.restart()
    expect(gameB.cells.value).toEqual(START) // restart still knows the true original board
    expect(gameB.moves.value).toBe(0)
  })

  it('reset returns to idle and stops the timer', () => {
    const game = useLightsOutGame()
    game.begin(1, SIZE, START)
    game.reset()
    expect(game.status.value).toBe('idle')
  })

  it("results.optimalMoves always matches the solver's own answer for the original board", () => {
    const game = useLightsOutGame()
    game.begin(1, SIZE, START)
    expect(game.results.value.optimalMoves).toBe(minimumMoves(START, SIZE))
  })
})
