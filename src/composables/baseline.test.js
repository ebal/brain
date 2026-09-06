import { describe, it, expect } from 'vitest'
import { computeBaseline, compareToBaseline } from './baseline.js'

function entry(primaryMetric, accuracy = null, medianRT = null) {
  return { primaryMetric, accuracy, medianRT }
}

describe('computeBaseline', () => {
  it('reports not ready with fewer than 3 sessions', () => {
    expect(computeBaseline([])).toEqual({ ready: false, sampleSize: 0, sessionsNeeded: 3 })
    expect(computeBaseline([entry(1), entry(2)])).toEqual({ ready: false, sampleSize: 2, sessionsNeeded: 1 })
  })

  it('computes the median primary metric once 3+ sessions exist', () => {
    const result = computeBaseline([entry(100), entry(300), entry(200)])
    expect(result.ready).toBe(true)
    expect(result.sampleSize).toBe(3)
    expect(result.medianPrimaryMetric).toBe(200)
  })

  it('computes median accuracy and medianRT alongside the primary metric', () => {
    const result = computeBaseline([
      entry(100, 90, 400),
      entry(200, 95, 500),
      entry(300, 85, 300),
    ])
    expect(result.medianAccuracy).toBe(90)
    expect(result.medianRT).toBe(400)
  })

  it('leaves medianAccuracy/medianRT null when no session has that field (e.g. Sudoku-shaped data)', () => {
    const result = computeBaseline([entry(1), entry(2), entry(3)])
    expect(result.medianAccuracy).toBeNull()
    expect(result.medianRT).toBeNull()
  })
})

describe('compareToBaseline', () => {
  it('returns null when the baseline is not ready', () => {
    expect(compareToBaseline('schulte', { ready: false }, 100)).toBeNull()
  })

  it('returns null when the baseline median is 0 (avoids divide-by-zero)', () => {
    expect(compareToBaseline('schulte', { ready: true, medianPrimaryMetric: 0 }, 100)).toBeNull()
  })

  it('treats a LOWER value as better for a lower-is-better game (schulte, set)', () => {
    const baseline = { ready: true, medianPrimaryMetric: 2000 }
    const faster = compareToBaseline('schulte', baseline, 1500) // 25% faster
    expect(faster.percentDelta).toBeCloseTo(25, 5)
    const slower = compareToBaseline('schulte', baseline, 2500) // 25% slower
    expect(slower.percentDelta).toBeCloseTo(-25, 5)
  })

  it('treats a HIGHER value as better for a higher-is-better game (stroop, nback, sequence-memory)', () => {
    const baseline = { ready: true, medianPrimaryMetric: 800 }
    const better = compareToBaseline('stroop', baseline, 1000) // 25% higher score
    expect(better.percentDelta).toBeCloseTo(25, 5)
    const worse = compareToBaseline('stroop', baseline, 600) // 25% lower score
    expect(worse.percentDelta).toBeCloseTo(-25, 5)
  })

  it('reports 0% delta when the latest value exactly matches the baseline', () => {
    const baseline = { ready: true, medianPrimaryMetric: 500 }
    expect(compareToBaseline('set', baseline, 500).percentDelta).toBe(0)
  })
})
