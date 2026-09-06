import { describe, it, expect } from 'vitest'
import { useBenchmarkHistory } from './benchmarkHistory.js'
import { BENCHMARK_VERSION } from '../constants/benchmark.js'

describe('recordBenchmarkSession', () => {
  it('stamps sessionType and benchmarkVersion onto whatever session it is given', () => {
    const { recordBenchmarkSession } = useBenchmarkHistory()
    const input = { id: 'x', game: 'stroop', difficulty: 'medium', sessionType: 'play', primaryMetric: 900 }
    const stamped = recordBenchmarkSession(input)
    expect(stamped.sessionType).toBe('benchmark')
    expect(stamped.benchmarkVersion).toBe(BENCHMARK_VERSION)
    expect(stamped.id).toBe('x')
    expect(stamped.primaryMetric).toBe(900)
  })

  it('never throws even with no localStorage available', () => {
    const { recordBenchmarkSession, getHistory, getAllHistory } = useBenchmarkHistory()
    expect(() => recordBenchmarkSession({ game: 'schulte', id: 'y' })).not.toThrow()
    expect(getHistory('schulte')).toEqual([])
    expect(getAllHistory()).toEqual([])
  })
})
