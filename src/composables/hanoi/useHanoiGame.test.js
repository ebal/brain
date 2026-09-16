import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useHanoiGame } from './useHanoiGame.js'
import { getOptimalNextMove } from './state.js'

describe('useHanoiGame', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('begins with every disk on peg A and status playing', () => {
    const game = useHanoiGame()
    game.begin(1, 3)
    expect(game.status.value).toBe('playing')
    expect(game.pegs.value[0]).toEqual([3, 2, 1])
    expect(game.moves.value).toBe(0)
  })

  it('selecting a peg with disks, then a legal destination, moves the top disk', () => {
    const game = useHanoiGame()
    game.begin(1, 3)
    game.selectPeg(0)
    expect(game.selectedPeg.value).toBe(0)
    game.selectPeg(2)
    expect(game.pegs.value[0]).toEqual([3, 2])
    expect(game.pegs.value[2]).toEqual([1])
    expect(game.moves.value).toBe(1)
    expect(game.selectedPeg.value).toBeNull()
  })

  it('tapping the same peg again deselects, without counting as a mistake', () => {
    const game = useHanoiGame()
    game.begin(1, 3)
    game.selectPeg(0)
    game.selectPeg(0)
    expect(game.selectedPeg.value).toBeNull()
    expect(game.mistakes.value).toBe(0)
  })

  it('tapping an empty peg with nothing selected is a harmless no-op', () => {
    const game = useHanoiGame()
    game.begin(1, 3)
    game.selectPeg(1)
    expect(game.selectedPeg.value).toBeNull()
    expect(game.mistakes.value).toBe(0)
  })

  it('an illegal destination leaves the board unchanged, flashes feedback, and counts a mistake', () => {
    const game = useHanoiGame()
    game.begin(1, 3)
    game.selectPeg(0) // top disk 1
    game.selectPeg(0) // deselect
    game.selectPeg(0) // reselect disk 1
    game.selectPeg(2) // move disk 1 -> C (legal)
    game.selectPeg(0) // select disk 2 (now top of A)
    game.selectPeg(2) // illegal: 2 onto 1
    expect(game.mistakes.value).toBe(1)
    expect(game.feedback.value).toBe('illegal')
    expect(game.pegs.value[0]).toEqual([3, 2]) // unchanged by the illegal attempt
    expect(game.pegs.value[2]).toEqual([1])
  })

  it('the illegal-feedback flash clears itself after a short delay', () => {
    const game = useHanoiGame()
    game.begin(1, 3)
    game.selectPeg(0)
    game.selectPeg(0)
    game.selectPeg(0)
    game.selectPeg(2) // disk 1 -> C
    game.selectPeg(0) // select disk 2
    game.selectPeg(2) // illegal
    expect(game.feedback.value).toBe('illegal')
    vi.advanceTimersByTime(300)
    expect(game.feedback.value).toBeNull()
  })

  it('solves the puzzle using hint() every move and finishes, capped at 2 stars', () => {
    const game = useHanoiGame()
    game.begin(1, 3)
    for (let i = 0; i < 7; i++) {
      game.hint()
      const { from, to } = game.hintMove.value
      game.selectPeg(from)
      game.selectPeg(to)
    }
    expect(game.status.value).toBe('finished')
    expect(game.moves.value).toBe(7)
    expect(game.results.value.optimalMoves).toBe(7)
    expect(game.results.value.stars).toBe(2) // hints were used every move, so not a clean 3-star despite being optimal
  })

  it('solving optimally with zero hints earns 3 stars and a clean result', () => {
    const game = useHanoiGame()
    game.begin(1, 3)
    // Drive purely from state.js's own optimal-move function, without ever
    // calling hint() — the composable's hints counter must stay at 0.
    for (let i = 0; i < 7; i++) {
      const move = getOptimalNextMove({ pegs: game.pegs.value }, game.disks.value)
      game.selectPeg(move.from)
      game.selectPeg(move.to)
    }
    expect(game.status.value).toBe('finished')
    expect(game.hints.value).toBe(0)
    expect(game.results.value.stars).toBe(3)
    expect(game.results.value.clean).toBe(true)
    expect(game.results.value.efficiency).toBe(100)
  })

  it('undo restores the previous board and decrements Moves, while tracking Undos separately', () => {
    const game = useHanoiGame()
    game.begin(1, 3)
    game.selectPeg(0)
    game.selectPeg(2)
    expect(game.moves.value).toBe(1)
    game.undo()
    expect(game.moves.value).toBe(0)
    expect(game.undos.value).toBe(1)
    expect(game.pegs.value[0]).toEqual([3, 2, 1])
  })

  it('undo with no history is a no-op', () => {
    const game = useHanoiGame()
    game.begin(1, 3)
    game.undo()
    expect(game.undos.value).toBe(0)
    expect(game.moves.value).toBe(0)
  })

  it('restart returns to the exact initial state and zeroes every counter', () => {
    const game = useHanoiGame()
    game.begin(1, 3)
    game.selectPeg(0)
    game.selectPeg(2)
    game.hint()
    game.restart()
    expect(game.moves.value).toBe(0)
    expect(game.mistakes.value).toBe(0)
    expect(game.undos.value).toBe(0)
    expect(game.hints.value).toBe(0)
    expect(game.pegs.value[0]).toEqual([3, 2, 1])
  })

  it('hint increments the counter and sets a recommended move without applying it', () => {
    const game = useHanoiGame()
    game.begin(1, 3)
    game.hint()
    expect(game.hints.value).toBe(1)
    expect(game.hintMove.value).toEqual({ disk: 1, from: 0, to: 2 })
    expect(game.pegs.value[0]).toEqual([3, 2, 1]) // not applied automatically
  })

  it('a real move clears any pending hint', () => {
    const game = useHanoiGame()
    game.begin(1, 3)
    game.hint()
    game.selectPeg(0)
    game.selectPeg(2)
    expect(game.hintMove.value).toBeNull()
  })

  it('pause stops the timer; resume continues it without resetting board state', () => {
    const game = useHanoiGame()
    game.begin(1, 3)
    game.selectPeg(0)
    game.selectPeg(2)
    game.pause()
    expect(game.status.value).toBe('paused')
    const elapsedAtPause = game.elapsedTime.value
    vi.advanceTimersByTime(5000)
    expect(game.elapsedTime.value).toBe(elapsedAtPause)
    game.resumeFromPause()
    expect(game.status.value).toBe('playing')
    expect(game.pegs.value[2]).toEqual([1])
  })

  it('pause clears any active selection', () => {
    const game = useHanoiGame()
    game.begin(1, 3)
    game.selectPeg(0)
    game.pause()
    expect(game.selectedPeg.value).toBeNull()
  })

  it('resumeFromSave restores an exact autosaved snapshot', () => {
    const gameA = useHanoiGame()
    gameA.begin(1, 3)
    gameA.selectPeg(0)
    gameA.selectPeg(2)
    gameA.hint()
    const saved = gameA.snapshot()

    const gameB = useHanoiGame()
    gameB.resumeFromSave(saved)
    expect(gameB.status.value).toBe('playing')
    expect(gameB.level.value).toBe(1)
    expect(gameB.disks.value).toBe(3)
    expect(gameB.pegs.value).toEqual(saved.pegs)
    expect(gameB.moves.value).toBe(1)
    expect(gameB.hints.value).toBe(1)
  })

  it('reset returns to idle and stops the timer', () => {
    const game = useHanoiGame()
    game.begin(1, 3)
    game.reset()
    expect(game.status.value).toBe('idle')
  })
})
