import { describe, it, expect } from 'vitest'
import { METRIC_VERSIONS } from './metricVersions.js'
import { BENCHMARK_CONFIGS } from './benchmark.js'

describe('METRIC_VERSIONS', () => {
  it('covers every game that participates in Benchmark, plus Sudoku, Marble Jump, Mental Rotation, Emoji Mahjong, Number Match, Odd One Out, Target Tap, Tower of Hanoi and Lights Out (Benchmark-excluded but still games)', () => {
    const expectedGames = [
      ...Object.keys(BENCHMARK_CONFIGS),
      'sudoku',
      'marblejump',
      'mentalrotation',
      'emojimahjong',
      'numbermatch',
      'oddoneout',
      'targettap',
      'hanoi',
      'lightsout',
    ]
    for (const game of expectedGames) {
      expect(METRIC_VERSIONS).toHaveProperty(game)
    }
    expect(Object.keys(METRIC_VERSIONS)).toHaveLength(expectedGames.length)
  })

  it('every game is at version 1, except Emoji Mahjong (2) after its full level-based redesign', () => {
    for (const [game, version] of Object.entries(METRIC_VERSIONS)) {
      expect(version).toBe(game === 'emojimahjong' ? 2 : 1)
    }
  })
})
