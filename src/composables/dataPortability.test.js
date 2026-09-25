import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { validateImportFile, mergeValue, csvEscape, buildHistoryCSV, buildExport, deleteAllData, storageFootprintChars, applyImport, SCHEMA_VERSION } from './dataPortability.js'
import { CURRENT_SCHEMA_VERSION, runStorageMigrations } from './persistence/migrations.js'
import { installFakeLocalStorage as installStorage } from './persistence/testStorage.js'

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

  it('rejects a non-integer or non-positive schemaVersion', () => {
    expect(() => validateImportFile({ schemaVersion: 0, data: { 'sudoku:history': [] } })).toThrow(/invalid schemaVersion/)
    expect(() => validateImportFile({ schemaVersion: 1.5, data: { 'sudoku:history': [] } })).toThrow(/invalid schemaVersion/)
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

  it('de-duplicates history entries by sessionId, keeping the local copy', () => {
    const local = [{ sessionId: 's1', completedAt: '2026-01-01', score: 1, appVersion: '1.2.0' }]
    const incoming = [{ sessionId: 's1', completedAt: '2026-01-01', score: 1, appVersion: '1.2.1' }, { sessionId: 's2', completedAt: '2026-01-02', score: 2 }]
    expect(mergeValue(local, incoming)).toEqual([local[0], incoming[1]])
  })

  it('keeps the local value for non-array conflicts (stats/best objects)', () => {
    const existing = { bestStreak: 10 }
    const incoming = { bestStreak: 99 }
    expect(mergeValue(existing, incoming)).toEqual({ bestStreak: 10 })
  })

  it('preserves metricVersion/appVersion on history entries through a merge — SPEC (improvement pass §4/§11): the field must survive export/import untouched', () => {
    const existing = [{ completedAt: '2026-01-01', score: 1, metricVersion: 1, appVersion: '1.0.0' }]
    const incoming = [{ completedAt: '2026-01-02', score: 2, metricVersion: 1, appVersion: '1.1.0' }]
    const merged = mergeValue(existing, incoming)
    expect(merged).toEqual([
      { completedAt: '2026-01-01', score: 1, metricVersion: 1, appVersion: '1.0.0' },
      { completedAt: '2026-01-02', score: 2, metricVersion: 1, appVersion: '1.1.0' },
    ])
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
    expect(csv.split('\n')[0]).toBe('game,difficulty,mode,completedAt,primaryMetric,accuracy,medianRT,mistakes,hints,duration,metricVersion')
  })
})

// A minimal in-memory localStorage so deleteAllData()/buildExport()/
// storageFootprintChars() can be exercised against real key presence —
// this environment's built-in global localStorage no-ops without a
// --localstorage-file flag (every safeGet/safeSet call hits its catch
// block), so the bug this test guards against (orphaned deprecated-feature
// keys surviving "Delete All Data") would otherwise go untested.
function installFakeLocalStorage(initialEntries) {
  // Data lives as plain enumerable own properties (so Object.keys(localStorage),
  // used throughout dataPortability.js, sees exactly the stored keys);
  // getItem/setItem/removeItem are non-enumerable so they never show up as
  // "keys" themselves, and mutate this same object directly.
  const fake = { ...initialEntries }
  Object.defineProperties(fake, {
    getItem: { value: (k) => (k in fake ? fake[k] : null) },
    setItem: { value: (k, v) => { fake[k] = v } },
    removeItem: { value: (k) => { delete fake[k] } },
  })
  return fake
}

describe('deprecated-feature key cleanup (orphaned benchmark: keys)', () => {
  let restore

  beforeEach(() => {
    const fake = installFakeLocalStorage({
      'sudoku:history': '[]',
      'benchmark:history:stroop': '[{"score":1}]',
      'unrelated:other-app-key': 'x', // must never be touched
    })
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true, writable: true })
    restore = () => Object.defineProperty(globalThis, 'localStorage', { value: original, configurable: true, writable: true })
  })

  afterEach(() => restore())

  it('buildExport does not include deprecated benchmark: keys', () => {
    const exported = buildExport()
    expect(Object.keys(exported.data)).toEqual(['sudoku:history'])
  })

  it('deleteAllData removes both current-game and deprecated benchmark: keys, but never unrelated keys', () => {
    const result = deleteAllData()
    expect(result.keysDeleted).toBe(2)
    expect(localStorage.getItem('sudoku:history')).toBeNull()
    expect(localStorage.getItem('benchmark:history:stroop')).toBeNull()
    expect(localStorage.getItem('unrelated:other-app-key')).toBe('x')
  })

  it('storageFootprintChars counts deprecated keys too', () => {
    const total = storageFootprintChars()
    const gameOnly = 'sudoku:history'.length + '[]'.length
    expect(total).toBeGreaterThan(gameOnly) // includes the benchmark: key's bytes too
  })
})

describe('schema-versioned import/export (BRAIN-SYNC-SPEC §15/§40)', () => {
  let env
  afterEach(() => env.restore())

  const legacyEntry = { score: 7, accuracy: 90, date: '2026-03-01T08:00:00.000Z' }

  it('exports with the current storage schemaVersion', () => {
    env = installStorage({})
    expect(SCHEMA_VERSION).toBe(CURRENT_SCHEMA_VERSION)
    expect(buildExport().schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('upgrades an old (schema 1) backup on import and dedupes it against the same, already-migrated local sessions', () => {
    // This device held the entry before upgrading, and exported it back then.
    env = installStorage({ 'stroop:history:color:easy': JSON.stringify([legacyEntry]) })
    runStorageMigrations()
    const [local] = JSON.parse(localStorage.getItem('stroop:history:color:easy'))
    const oldBackup = { schemaVersion: 1, data: { 'stroop:history:color:easy': [legacyEntry, { ...legacyEntry, score: 8, date: '2026-03-02T08:00:00.000Z' }] } }
    applyImport(oldBackup, 'merge')
    const merged = JSON.parse(localStorage.getItem('stroop:history:color:easy'))
    expect(merged).toHaveLength(2) // the shared legacy session counted once
    expect(merged[0]).toEqual(local)
    expect(merged[1].sessionId).toBeTypeOf('string')
  })

  it('Replace-mode import of an old backup also writes upgraded (identified) sessions', () => {
    env = installStorage({})
    applyImport({ schemaVersion: 1, data: { 'sudoku:history': [{ completionTime: 1, completedAt: 'x' }] } }, 'replace')
    expect(JSON.parse(localStorage.getItem('sudoku:history'))[0].sessionId).toBeTypeOf('string')
  })
})

describe('semantic import merge and synced-device deletion (BRAIN-SYNC-SPEC §39/§40)', () => {
  let env
  afterEach(() => env.restore())

  it('a better imported best wins, a better local best is kept, completions are unioned and progress re-derived', () => {
    env = installStorage({
      'hanoi:stats:1': JSON.stringify({ started: 2, completed: 2, best: { moves: 9, hints: 0, stars: 2 }, completions: [] }),
      'hanoi:stats:2': JSON.stringify({ started: 1, completed: 1, best: { moves: 15, hints: 0, stars: 3 }, completions: [] }),
      'hanoi:progress': JSON.stringify({ highestUnlocked: 3, completedLevels: [1, 2], totalStars: 5 }),
    })
    applyImport({ schemaVersion: CURRENT_SCHEMA_VERSION, data: {
      'hanoi:stats:1': { started: 1, completed: 1, best: { moves: 7, hints: 0, stars: 3 }, completions: [] }, // better
      'hanoi:stats:2': { started: 1, completed: 1, best: { moves: 30, hints: 1, stars: 1 }, completions: [] }, // worse
      'hanoi:stats:4': { started: 1, completed: 1, best: { moves: 40, hints: 0, stars: 3 }, completions: [] },
      'hanoi:progress': { highestUnlocked: 2, completedLevels: [1, 4], totalStars: 0 },
    } }, 'merge')
    expect(JSON.parse(localStorage.getItem('hanoi:stats:1')).best.moves).toBe(7)
    expect(JSON.parse(localStorage.getItem('hanoi:stats:2')).best.moves).toBe(15)
    expect(JSON.parse(localStorage.getItem('hanoi:progress'))).toMatchObject({ completedLevels: [1, 2, 4], highestUnlocked: 5, totalStars: 9 })
  })

  it('device-local keys (autosaves) only fill gaps, never replace what is on this device', () => {
    env = installStorage({ 'sudoku:active': JSON.stringify({ mine: true }) })
    applyImport({ schemaVersion: CURRENT_SCHEMA_VERSION, data: { 'sudoku:active': { theirs: true }, 'set:active': { theirs: true } } }, 'merge')
    expect(JSON.parse(localStorage.getItem('sudoku:active'))).toEqual({ mine: true })
    expect(JSON.parse(localStorage.getItem('set:active'))).toEqual({ theirs: true })
  })

  it('on a synced device, Delete All Data resets the cursor so the cloud copy downloads again', () => {
    env = installStorage({ 'sudoku:history': '[]', 'brain:sync:state': JSON.stringify({ enabled: true, cursor: 42 }) })
    deleteAllData()
    expect(JSON.parse(localStorage.getItem('brain:sync:state'))).toMatchObject({ enabled: true, cursor: null })
  })

  it('on a local-only device, Delete All Data leaves sync state alone', () => {
    env = installStorage({ 'sudoku:history': '[]' })
    deleteAllData()
    expect(localStorage.getItem('brain:sync:state')).toBeNull()
  })
})
