import { describe, it, expect } from 'vitest'
import { avg, median } from './mathStats.js'

describe('avg', () => {
  it('returns 0 for an empty array', () => {
    expect(avg([])).toBe(0)
  })

  it('averages a single value', () => {
    expect(avg([42])).toBe(42)
  })

  it('averages multiple values', () => {
    expect(avg([1, 2, 3, 4])).toBe(2.5)
  })
})

describe('median', () => {
  it('returns 0 for an empty array', () => {
    expect(median([])).toBe(0)
  })

  it('returns the single value for a one-element array', () => {
    expect(median([7])).toBe(7)
  })

  it('averages the two middle values for an even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })

  it('returns the middle value for an odd-length array', () => {
    expect(median([1, 2, 3])).toBe(2)
  })

  it('does not mutate the input array', () => {
    const input = [3, 1, 2]
    median(input)
    expect(input).toEqual([3, 1, 2])
  })

  it('handles unsorted input correctly', () => {
    expect(median([5, 1, 4, 2, 3])).toBe(3)
  })
})
