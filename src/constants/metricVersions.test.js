import { describe, it, expect } from 'vitest'
import { METRIC_VERSIONS } from './metricVersions.js'
import { BENCHMARK_CONFIGS } from './benchmark.js'

describe('METRIC_VERSIONS', () => {
  it('covers every game that participates in Benchmark, plus Sudoku, Marble Jump, Mental Rotation, Emoji Mahjong and Number Match (Benchmark-excluded but still games)', () => {
    const expectedGames = [
      ...Object.keys(BENCHMARK_CONFIGS),
      'sudoku',
      'marblejump',
      'mentalrotation',
      'emojimahjong',
      'numbermatch',
    ]
    for (const game of expectedGames) {
      expect(METRIC_VERSIONS).toHaveProperty(game)
    }
    expect(Object.keys(METRIC_VERSIONS)).toHaveLength(expectedGames.length)
  })

  it('every game currently starts at version 1 — nothing has changed its measurement definition yet', () => {
    for (const version of Object.values(METRIC_VERSIONS)) {
      expect(version).toBe(1)
    }
  })
})
