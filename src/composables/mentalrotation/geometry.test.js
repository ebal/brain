import { describe, it, expect } from 'vitest'
import {
  normalizeShape,
  canonicalKey,
  rotateShape,
  mirrorShape,
  areRotationEquivalent,
  areReflectionEquivalent,
} from './geometry.js'

// An L-tetromino — asymmetric under rotation, and its mirror (a J-tetromino)
// is not equal to any of its own rotations. Good for exercising every
// property below without relying on the curated shape pool.
const L = [
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1],
]

describe('normalizeShape', () => {
  it('removes translation differences', () => {
    const shifted = L.map(([r, c]) => [r + 5, c + 3])
    expect(canonicalKey(shifted)).toBe(canonicalKey(L))
  })

  it('always starts at row 0, col 0', () => {
    const normalized = normalizeShape([[3, 4], [3, 5], [4, 4]])
    const minRow = Math.min(...normalized.map(([r]) => r))
    const minCol = Math.min(...normalized.map(([, c]) => c))
    expect(minRow).toBe(0)
    expect(minCol).toBe(0)
  })
})

describe('rotateShape', () => {
  it('rotates 90° correctly', () => {
    // L rotated 90° CW: (r,c)->(c,-r), normalized.
    // [0,0]->[0,0] [1,0]->[0,-1] [2,0]->[0,-2] [2,1]->[1,-2]
    // normalized (shift col by +2): [0,2] [0,1] [0,0] [1,0]
    expect(rotateShape(L, 1)).toEqual([[0, 0], [0, 1], [0, 2], [1, 0]])
  })

  it('rotates 180° correctly (rotating twice matches rotating once by 2)', () => {
    expect(rotateShape(L, 2)).toEqual(rotateShape(rotateShape(L, 1), 1))
  })

  it('rotates 270° correctly (three quarter-turns matches rotating once by 3)', () => {
    expect(rotateShape(L, 3)).toEqual(rotateShape(rotateShape(rotateShape(L, 1), 1), 1))
  })

  it('four 90° rotations return the original (normalized) shape', () => {
    expect(rotateShape(L, 4)).toEqual(normalizeShape(L))
  })
})

describe('mirrorShape', () => {
  it('produces a different shape than any rotation of the original (L is asymmetric)', () => {
    const mirrored = mirrorShape(L, 'vertical')
    for (let steps = 0; steps < 4; steps++) {
      expect(canonicalKey(rotateShape(L, steps))).not.toBe(canonicalKey(mirrored))
    }
  })

  it('horizontal mirror equals rotate180 composed with vertical mirror', () => {
    const horizontal = mirrorShape(L, 'horizontal')
    const viaVerticalThenRotate180 = rotateShape(mirrorShape(L, 'vertical'), 2)
    expect(horizontal).toEqual(viaVerticalThenRotate180)
  })
})

describe('areRotationEquivalent', () => {
  it('is true for a rotated version of the reference', () => {
    expect(areRotationEquivalent(L, rotateShape(L, 2))).toBe(true)
  })

  it('does not depend on argument order', () => {
    const rotated = rotateShape(L, 3)
    expect(areRotationEquivalent(L, rotated)).toBe(areRotationEquivalent(rotated, L))
  })

  it('is false for a mirrored (not rotated) reference', () => {
    expect(areRotationEquivalent(L, mirrorShape(L, 'vertical'))).toBe(false)
  })

  it('stays false for a mirrored-and-then-rotated candidate at every angle', () => {
    const mirrored = mirrorShape(L, 'vertical')
    for (let steps = 0; steps < 4; steps++) {
      expect(areRotationEquivalent(L, rotateShape(mirrored, steps))).toBe(false)
    }
  })
})

describe('areReflectionEquivalent', () => {
  it('is true for a mirrored version of the reference', () => {
    expect(areReflectionEquivalent(L, mirrorShape(L, 'vertical'))).toBe(true)
  })

  it('is true regardless of which axis produced the mirror', () => {
    expect(areReflectionEquivalent(L, mirrorShape(L, 'horizontal'))).toBe(true)
  })

  it('is false for a pure rotation of the reference (not mirrored)', () => {
    expect(areReflectionEquivalent(L, rotateShape(L, 1))).toBe(false)
  })
})
