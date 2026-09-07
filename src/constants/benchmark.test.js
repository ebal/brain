import { describe, it, expect } from 'vitest'
import { BENCHMARK_VERSION } from './benchmark.js'

// Locks in "Benchmark v1 unchanged" as an explicit regression check — the
// game catalog growing (Switch Trail, Memory Pairs) is not itself a reason
// to bump this. See README.md's Benchmark Mode section and the note in the
// improvement-pass summary about those two games' Benchmark membership.
describe('BENCHMARK_VERSION', () => {
  it('remains 1 — the game catalog growing is not itself a versioning event', () => {
    expect(BENCHMARK_VERSION).toBe(1)
  })
})
