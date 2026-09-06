import { describe, it, expect } from 'vitest'
import { validateImportFile, mergeValue, csvEscape, buildHistoryCSV, SCHEMA_VERSION } from './dataPortability.js'

describe('validateImportFile', () => {
  it('accepts a well-formed export', () => {
    const file = { schemaVersion: 1, exportedAt: 'X', appVersion: '1.0.0', data: { 'sudoku:history': [] } }
    expect(validateImportFile(file)).toEqual(['sudoku:history'])
  })

  it('rejects null, non-objects, and arrays', () => {
    expect(() => validateImportFile(null)).toThrow(/not a valid export/)
    expect(() => validateImportFile('a string')).toThrow(/not a valid export/)
    expect(() => validateImportFile([1, 2, 3])).toThrow(/not a valid export/)
  })

  it('rejects a file with no schemaVersion', () => {
    expect(() => validateImportFile({ data: {} })).toThrow(/no schemaVersion/)
  })

  it('rejects a file from a newer schema version than this app supports', () => {
    expect(() => validateImportFile({ schemaVersion: SCHEMA_VERSION + 1, data: { 'sudoku:history': [] } }))
      .toThrow(/newer version of the app/)
  })

  it('rejects a file with no data section', () => {
    expect(() => validateImportFile({ schemaVersion: 1 })).toThrow(/missing its data section/)
    expect(() => validateImportFile({ schemaVersion: 1, data: [] })).toThrow(/missing its data section/)
  })

  it('rejects a file whose data section has no recognizable game keys', () => {
    expect(() => validateImportFile({ schemaVersion: 1, data: { 'unrelated:key': 1 } }))
      .toThrow(/recognizable game data/)
  })

  it('ignores unrecognized keys but accepts the file if at least one recognized key exists', () => {
    const file = { schemaVersion: 1, data: { 'unrelated:key': 1, 'set:history': [] } }
    expect(validateImportFile(file)).toEqual(['set:history'])
  })
})

describe('mergeValue', () => {
  it('takes the incoming value when nothing exists locally', () => {
    expect(mergeValue(null, { started: 5 })).toEqual({ started: 5 })
  })

  it('concatenates and de-duplicates array values (history lists)', () => {
    const existing = [{ completedAt: '2026-01-02', score: 2 }, { completedAt: '2026-01-01', score: 1 }]
    const incoming = [{ completedAt: '2026-01-01', score: 1 }, { completedAt: '2026-01-03', score: 3 }]
    const merged = mergeValue(existing, incoming)
    expect(merged).toHaveLength(3) // the duplicate 2026-01-01 entry counted once
    expect(merged.map((e) => e.completedAt)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']) // sorted
  })

  it('keeps the local value for non-array conflicts (stats/best objects)', () => {
    const existing = { bestStreak: 10 }
    const incoming = { bestStreak: 99 }
    expect(mergeValue(existing, incoming)).toEqual({ bestStreak: 10 })
  })
})

describe('csvEscape', () => {
  it('passes through plain values unchanged', () => {
    expect(csvEscape('easy')).toBe('easy')
    expect(csvEscape(42)).toBe('42')
  })

  it('returns an empty string for null/undefined', () => {
    expect(csvEscape(null)).toBe('')
    expect(csvEscape(undefined)).toBe('')
  })

  it('quotes and escapes values containing commas, quotes, or newlines', () => {
    expect(csvEscape('a,b')).toBe('"a,b"')
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""')
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"')
  })
})

describe('buildHistoryCSV', () => {
  it('produces at least a header row without throwing, even with no localStorage available', () => {
    const csv = buildHistoryCSV()
    expect(csv.split('\n')[0]).toBe('game,difficulty,mode,completedAt,primaryMetric,accuracy,medianRT,mistakes,hints,duration')
  })
})
