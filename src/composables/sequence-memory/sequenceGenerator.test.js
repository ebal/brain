import { describe, it, expect } from 'vitest'
import { generateInitialSequence, extendSequence, makeRng } from './sequenceGenerator.js'
import { GRID_SIZE, STARTING_SEQUENCE_LENGTH } from '../../constants/sequence-memory/difficulties.js'

describe('makeRng', () => {
  it('is deterministic for the same seed', () => {
    const seqA = generateInitialSequence(makeRng(99))
    const seqB = generateInitialSequence(makeRng(99))
    expect(seqA).toEqual(seqB)
  })
})

describe('generateInitialSequence', () => {
  it('defaults to STARTING_SEQUENCE_LENGTH steps', () => {
    expect(generateInitialSequence(makeRng(1))).toHaveLength(STARTING_SEQUENCE_LENGTH)
  })

  it('respects an explicit length', () => {
    expect(generateInitialSequence(makeRng(1), 10)).toHaveLength(10)
  })

  it('only ever produces valid cell indices', () => {
    const seq = generateInitialSequence(makeRng(5), 50)
    for (const cell of seq) {
      expect(cell).toBeGreaterThanOrEqual(0)
      expect(cell).toBeLessThan(GRID_SIZE)
    }
  })

  it('never repeats the same cell on two consecutive steps, across many seeds', () => {
    for (let seed = 0; seed < 200; seed++) {
      const seq = generateInitialSequence(makeRng(seed), 30)
      for (let i = 1; i < seq.length; i++) {
        expect(seq[i]).not.toBe(seq[i - 1])
      }
    }
  })
})

describe('extendSequence', () => {
  it('appends exactly one step', () => {
    const rng = makeRng(1)
    const seq = generateInitialSequence(rng)
    const extended = extendSequence(seq, rng)
    expect(extended).toHaveLength(seq.length + 1)
  })

  it('leaves the original sequence array untouched (no shared-reference mutation)', () => {
    const rng = makeRng(1)
    const seq = generateInitialSequence(rng)
    const before = [...seq]
    extendSequence(seq, rng)
    expect(seq).toEqual(before)
  })

  it('preserves every existing step unchanged, only adding a new one at the end', () => {
    const rng = makeRng(1)
    const seq = generateInitialSequence(rng)
    const extended = extendSequence(seq, rng)
    expect(extended.slice(0, seq.length)).toEqual(seq)
  })

  it('never makes the new step repeat the immediately preceding cell, across many seeds and many extensions', () => {
    for (let seed = 0; seed < 100; seed++) {
      const rng = makeRng(seed)
      let seq = generateInitialSequence(rng)
      for (let i = 0; i < 30; i++) {
        const prev = seq[seq.length - 1]
        seq = extendSequence(seq, rng)
        expect(seq[seq.length - 1]).not.toBe(prev)
      }
    }
  })
})
