import { describe, it, expect } from 'vitest'
import { generateTrailLayout, repositionPending, validateLayout, makeRng, DEFAULT_BOUNDS } from './trailLayout.js'
import { createTrailSequence } from './trailSequence.js'
import { SWITCHTRAIL_DIFFICULTIES } from '../../constants/switchtrail/difficulties.js'

describe('generateTrailLayout', () => {
  it('places every target exactly once for every difficulty', () => {
    for (const difficulty of Object.values(SWITCHTRAIL_DIFFICULTIES)) {
      const seq = createTrailSequence(difficulty)
      const layout = generateTrailLayout(seq, undefined, 1)
      expect(layout).toHaveLength(seq.length)
      expect(new Set(layout.map((t) => t.label)).size).toBe(seq.length)
    }
  })

  it('never overlaps and stays inside bounds (validateLayout passes) across many seeds', () => {
    const seq = createTrailSequence(SWITCHTRAIL_DIFFICULTIES.hard)
    for (let seed = 0; seed < 50; seed++) {
      const layout = generateTrailLayout(seq, undefined, seed)
      expect(validateLayout(layout, seq)).toBe(true)
    }
  })

  it('a deterministic seed reproduces the exact same layout', () => {
    const seq = createTrailSequence(SWITCHTRAIL_DIFFICULTIES.medium)
    const a = generateTrailLayout(seq, undefined, 12345)
    const b = generateTrailLayout(seq, undefined, 12345)
    expect(a).toEqual(b)
  })

  it('different seeds produce different layouts', () => {
    const seq = createTrailSequence(SWITCHTRAIL_DIFFICULTIES.medium)
    const a = generateTrailLayout(seq, undefined, 1)
    const b = generateTrailLayout(seq, undefined, 2)
    expect(a).not.toEqual(b)
  })

  it('random (unseeded) generation also produces a valid layout', () => {
    const seq = createTrailSequence(SWITCHTRAIL_DIFFICULTIES.hard)
    const layout = generateTrailLayout(seq)
    expect(validateLayout(layout, seq)).toBe(true)
  })
})

describe('validateLayout', () => {
  const seq = createTrailSequence(SWITCHTRAIL_DIFFICULTIES.easy)

  it('rejects a layout with a duplicate label', () => {
    const layout = generateTrailLayout(seq, undefined, 1)
    const broken = [...layout.slice(1), { ...layout[0], label: layout[1].label }]
    expect(validateLayout(broken, seq)).toBe(false)
  })

  it('rejects a layout with a missing label', () => {
    const layout = generateTrailLayout(seq, undefined, 1).slice(0, -1)
    expect(validateLayout(layout, seq)).toBe(false)
  })

  it('rejects two targets closer than minSpacing', () => {
    const layout = generateTrailLayout(seq, undefined, 1)
    const overlapping = layout.map((t, i) => (i === 1 ? { ...t, x: layout[0].x, y: layout[0].y } : t))
    expect(validateLayout(overlapping, seq)).toBe(false)
  })

  it('rejects a target outside the safe margin', () => {
    const layout = generateTrailLayout(seq, undefined, 1)
    const outOfBounds = layout.map((t, i) => (i === 0 ? { ...t, x: DEFAULT_BOUNDS.width } : t))
    expect(validateLayout(outOfBounds, seq)).toBe(false)
  })
})

describe('repositionPending', () => {
  it('moves every pending target and leaves done targets exactly where they were', () => {
    // Same rng instance used to build the base layout AND to reshuffle it —
    // matches how useSwitchTrailGame.js actually threads one continuous rng
    // through a round (a second, independently-seeded rng here would draw a
    // correlated sequence and isn't representative of real usage).
    const seq = createTrailSequence(SWITCHTRAIL_DIFFICULTIES.medium)
    const rng = makeRng(1)
    const blank = seq.map((label) => ({ label, x: 0, y: 0, state: 'pending' }))
    let layout = repositionPending(blank, undefined, rng).map((t, i) => ({ ...t, state: i < 4 ? 'done' : 'pending' }))
    const doneBefore = layout.filter((t) => t.state === 'done').map((t) => ({ label: t.label, x: t.x, y: t.y }))

    const reshuffled = repositionPending(layout, undefined, rng)

    for (const before of doneBefore) {
      const after = reshuffled.find((t) => t.label === before.label)
      expect(after.x).toBe(before.x)
      expect(after.y).toBe(before.y)
      expect(after.state).toBe('done')
    }

    const pendingBefore = layout.filter((t) => t.state === 'pending')
    for (const before of pendingBefore) {
      const after = reshuffled.find((t) => t.label === before.label)
      expect(after.state).toBe('pending')
      expect(after.x !== before.x || after.y !== before.y).toBe(true) // moved somewhere new
    }
  })

  it('the result is a valid, non-overlapping, in-bounds layout', () => {
    const seq = createTrailSequence(SWITCHTRAIL_DIFFICULTIES.hard)
    const rng = makeRng(7)
    let layout = generateTrailLayout(seq, undefined, 7).map((t) => ({ ...t, state: 'pending' }))
    for (let i = 0; i < 20; i++) {
      layout = repositionPending(layout, undefined, rng)
      expect(validateLayout(layout, seq)).toBe(true)
    }
  })

  it('is a no-op when nothing is pending', () => {
    const seq = createTrailSequence(SWITCHTRAIL_DIFFICULTIES.easy)
    const rng = makeRng(1)
    const layout = generateTrailLayout(seq, undefined, 1).map((t) => ({ ...t, state: 'done' }))
    expect(repositionPending(layout, undefined, rng)).toEqual(layout)
  })

  it('survives a full round (24 targets, reshuffling after each) across many seeds', () => {
    const seq = createTrailSequence(SWITCHTRAIL_DIFFICULTIES.extreme)
    for (let seed = 0; seed < 30; seed++) {
      const rng = makeRng(seed)
      let layout = seq.map((label) => ({ label, x: 0, y: 0, state: 'pending' }))
      layout = repositionPending(layout, undefined, rng)
      expect(validateLayout(layout, seq)).toBe(true)
      for (const label of seq) {
        layout = layout.map((t) => (t.label === label ? { ...t, state: 'done' } : t))
        layout = repositionPending(layout, undefined, rng)
        expect(validateLayout(layout, seq)).toBe(true)
      }
    }
  })
})
