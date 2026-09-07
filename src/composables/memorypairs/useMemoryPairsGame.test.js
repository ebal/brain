import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useMemoryPairsGame } from './useMemoryPairsGame.js'
import { MEMORYPAIRS_DIFFICULTIES } from '../../constants/memorypairs/difficulties.js'

// Same manually-driven virtual clock pattern used across the suite —
// advance() bumps performance.now() and the fake timers by the same amount.
let fakeNow
function advance(ms) {
  fakeNow += ms
  vi.advanceTimersByTime(ms)
}

const COUNTDOWN_TO_PLAYING_MS = 700 * 3 + 500 + 10

function startAndReachPlaying(game, difficultyKey, seed) {
  game.start(difficultyKey, seed)
  advance(COUNTDOWN_TO_PLAYING_MS)
}

// Finds the two tile ids that share an emoji (a real pair) other than the
// pair already used at `excludeEmoji`, so tests can drive a deterministic
// match without hardcoding ids that would shift if deck generation changes.
function findPairIds(tiles, excludeEmoji = null) {
  const byEmoji = new Map()
  for (const t of tiles) {
    if (t.emoji === excludeEmoji) continue
    if (!byEmoji.has(t.emoji)) byEmoji.set(t.emoji, [])
    byEmoji.get(t.emoji).push(t.id)
  }
  for (const ids of byEmoji.values()) {
    if (ids.length === 2) return ids
  }
  throw new Error('no pair found')
}

function findMismatchIds(tiles) {
  const emojis = [...new Set(tiles.map((t) => t.emoji))]
  const a = tiles.find((t) => t.emoji === emojis[0])
  const b = tiles.find((t) => t.emoji === emojis[1])
  return [a.id, b.id]
}

describe('useMemoryPairsGame', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fakeNow = 0
    vi.spyOn(performance, 'now').mockImplementation(() => fakeNow)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts in countdown, then reaches playing with every tile face down', () => {
    const game = useMemoryPairsGame()
    game.start('easy', 1)
    expect(game.status.value).toBe('countdown')
    advance(COUNTDOWN_TO_PLAYING_MS)
    expect(game.status.value).toBe('playing')
    expect(game.tiles.value.every((t) => t.state === 'facedown')).toBe(true)
  })

  it('builds a deck with the correct tile/pair count for the difficulty', () => {
    const game = useMemoryPairsGame()
    startAndReachPlaying(game, 'medium', 1) // 16 tiles / 8 pairs
    expect(game.tiles.value).toHaveLength(16)
  })

  it('first tap reveals one tile without completing a Move', () => {
    const game = useMemoryPairsGame()
    startAndReachPlaying(game, 'easy', 1)
    const [firstId] = findPairIds(game.tiles.value)
    game.tap(firstId)
    expect(game.tiles.value.find((t) => t.id === firstId).state).toBe('revealed')
    expect(game.moves.value).toBe(0)
  })

  it('tapping the currently revealed first tile again does nothing (SPEC §8)', () => {
    const game = useMemoryPairsGame()
    startAndReachPlaying(game, 'easy', 1)
    const [firstId] = findPairIds(game.tiles.value)
    game.tap(firstId)
    game.tap(firstId)
    expect(game.moves.value).toBe(0)
    expect(game.tiles.value.find((t) => t.id === firstId).state).toBe('revealed')
  })

  it('a matching second tap completes one Move, finds the pair, and keeps both tiles visible', () => {
    const game = useMemoryPairsGame()
    startAndReachPlaying(game, 'easy', 1)
    const [a, b] = findPairIds(game.tiles.value)
    game.tap(a)
    game.tap(b)
    expect(game.moves.value).toBe(1)
    expect(game.mistakes.value).toBe(0)
    expect(game.pairsFound.value).toBe(1)
    expect(game.tiles.value.find((t) => t.id === a).state).toBe('matched')
    expect(game.tiles.value.find((t) => t.id === b).state).toBe('matched')
  })

  it('matched tiles cannot be selected again', () => {
    const game = useMemoryPairsGame()
    startAndReachPlaying(game, 'easy', 1)
    const [a, b] = findPairIds(game.tiles.value)
    game.tap(a)
    game.tap(b)
    game.tap(a) // matched — should be a no-op
    expect(game.moves.value).toBe(1)
  })

  it('a mismatching second tap increments Mistakes, counts as one Move, then flips back after the delay', () => {
    const game = useMemoryPairsGame()
    startAndReachPlaying(game, 'easy', 1)
    const [a, b] = findMismatchIds(game.tiles.value)
    game.tap(a)
    game.tap(b)
    expect(game.moves.value).toBe(1)
    expect(game.mistakes.value).toBe(1)
    expect(game.tiles.value.find((t) => t.id === a).state).toBe('revealed')
    expect(game.tiles.value.find((t) => t.id === b).state).toBe('revealed')

    advance(800)
    expect(game.tiles.value.find((t) => t.id === a).state).toBe('facedown')
    expect(game.tiles.value.find((t) => t.id === b).state).toBe('facedown')
  })

  it('a third tap is blocked while mismatch feedback is showing', () => {
    const game = useMemoryPairsGame()
    startAndReachPlaying(game, 'easy', 1)
    const [a, b] = findMismatchIds(game.tiles.value)
    game.tap(a)
    game.tap(b)

    const thirdCandidate = game.tiles.value.find((t) => t.id !== a && t.id !== b)
    game.tap(thirdCandidate.id)
    expect(thirdCandidate.state).toBe('facedown') // untouched
    expect(game.moves.value).toBe(1) // no additional move registered
  })

  it('finding the final pair finishes the game and stops the timer', () => {
    const game = useMemoryPairsGame()
    startAndReachPlaying(game, 'easy', 1) // 6 pairs

    const seenEmojis = new Set()
    const pairs = []
    for (const t of game.tiles.value) {
      if (!seenEmojis.has(t.emoji)) {
        seenEmojis.add(t.emoji)
        pairs.push(game.tiles.value.filter((x) => x.emoji === t.emoji).map((x) => x.id))
      }
    }
    expect(pairs).toHaveLength(6)

    for (let i = 0; i < pairs.length; i++) {
      const [a, b] = pairs[i]
      advance(200)
      game.tap(a)
      game.tap(b)
    }

    expect(game.status.value).toBe('finished')
    expect(game.pairsFound.value).toBe(6)
    expect(game.results.value.completionTime).toBeGreaterThan(0)

    const timeAtFinish = game.results.value.completionTime
    advance(1000) // time passing after finish must not change the recorded completion time
    expect(game.results.value.completionTime).toBe(timeAtFinish)
  })

  describe('pause / resume (SPEC §22)', () => {
    it('cancels a partial (one-tile) selection without penalty and hides it', () => {
      const game = useMemoryPairsGame()
      startAndReachPlaying(game, 'easy', 1)
      const [a] = findPairIds(game.tiles.value)
      game.tap(a)
      game.pause()

      expect(game.status.value).toBe('paused')
      expect(game.tiles.value.find((t) => t.id === a).state).toBe('facedown')
      expect(game.moves.value).toBe(0)
      expect(game.mistakes.value).toBe(0)
    })

    it('resolves a pending mismatch immediately on pause, without additional penalty', () => {
      const game = useMemoryPairsGame()
      startAndReachPlaying(game, 'easy', 1)
      const [a, b] = findMismatchIds(game.tiles.value)
      game.tap(a)
      game.tap(b) // mismatch — already counted as 1 move + 1 mistake
      game.pause()

      expect(game.tiles.value.find((t) => t.id === a).state).toBe('facedown')
      expect(game.tiles.value.find((t) => t.id === b).state).toBe('facedown')
      expect(game.moves.value).toBe(1)
      expect(game.mistakes.value).toBe(1)
    })

    it('stops the timer while paused', () => {
      const game = useMemoryPairsGame()
      startAndReachPlaying(game, 'easy', 1)
      advance(1000)
      game.pause()
      const elapsedAtPause = game.elapsedTime.value
      advance(5000)
      expect(game.elapsedTime.value).toBe(elapsedAtPause)
    })

    it('resume shows a fresh countdown, then restores playing with the same board/progress', () => {
      const game = useMemoryPairsGame()
      startAndReachPlaying(game, 'easy', 1)
      const [a, b] = findPairIds(game.tiles.value)
      game.tap(a)
      game.tap(b)
      game.pause()

      const elapsedAtPause = game.elapsedTime.value
      game.resumeFromPause()
      expect(game.status.value).toBe('countdown')
      advance(COUNTDOWN_TO_PLAYING_MS)
      expect(game.status.value).toBe('playing')
      expect(game.elapsedTime.value).toBe(elapsedAtPause)
      expect(game.pairsFound.value).toBe(1)
      expect(game.tiles.value.find((t) => t.id === a).state).toBe('matched')
    })
  })

  describe('scoring', () => {
    it('score/moveEfficiency in results match the pure scoring functions', () => {
      const game = useMemoryPairsGame()
      startAndReachPlaying(game, 'easy', 1)
      const [a, b] = findPairIds(game.tiles.value)
      game.tap(a)
      game.tap(b)

      const r = game.results.value
      expect(r.moves).toBe(1)
      expect(r.pairsFound).toBe(1)
      expect(r.moveEfficiency).toBeCloseTo((6 / 1) * 100, 5)
      expect(r.score).toBeGreaterThan(0)
    })
  })

  it('the difficulty pair count is respected across all five tiers', () => {
    for (const d of Object.values(MEMORYPAIRS_DIFFICULTIES)) {
      const game = useMemoryPairsGame()
      startAndReachPlaying(game, d.key, 1)
      expect(game.tiles.value).toHaveLength(d.cols * d.rows)
    }
  })
})
