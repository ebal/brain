import { describe, it, expect } from 'vitest'
import { METRIC_VERSIONS } from './metricVersions.js'
import { BENCHMARK_CONFIGS } from './benchmark.js'

describe('METRIC_VERSIONS', () => {
  it('covers every game that participates in Benchmark, plus Sudoku (Benchmark-excluded but still a game)', () => {
    const expectedGames = [...Object.keys(BENCHMARK_CONFIGS), 'sudoku']
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
