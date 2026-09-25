import { describe, it, expect, afterEach, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  CURRENT_SCHEMA_VERSION,
  migrateData,
  assertNoLoss,
  assertUniqueSessionIds,
  readSchemaVersion,
  runStorageMigrations,
} from './migrations.js'
import { META_KEY, MIGRATION_BACKUP_KEY, isHistoryKey } from '../../constants/storageKeys.js'
import { installFakeLocalStorage, toRawEntries } from './testStorage.js'

const FIXTURE_DIR = fileURLToPath(new URL('../../../tests/fixtures/storage/', import.meta.url))
const loadFixture = (version) => JSON.parse(readFileSync(`${FIXTURE_DIR}schema-v${version}.json`, 'utf8'))
const historyEntries = (data) =>
  Object.entries(data).filter(([k, v]) => isHistoryKey(k) && Array.isArray(v)).flatMap(([, v]) => v)

describe('historical fixtures (BRAIN-SYNC-SPEC §18/§54)', () => {
  const fixtureVersions = readdirSync(FIXTURE_DIR)
    .map((f) => /^schema-v(\d+)\.json$/.exec(f)?.[1])
    .filter(Boolean)
    .map(Number)
    .sort((a, b) => a - b)

  it('there is a fixture for every schema version up to the current one', () => {
    expect(fixtureVersions).toEqual(Array.from({ length: CURRENT_SCHEMA_VERSION }, (_, i) => i + 1))
  })

  for (const version of fixtureVersions) {
    it(`schema-v${version} upgrades to the current schema without meaningful loss`, () => {
      const { localStorage: before } = loadFixture(version)
      const after = migrateData(before, version)
      expect(() => assertNoLoss(before, after)).not.toThrow()
      expect(() => assertUniqueSessionIds(after)).not.toThrow()
      expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort())
      for (const entry of historyEntries(after)) expect(entry.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[48][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    })
  }

  it('migrating schema-v1 reproduces the committed schema-v2 fixture exactly (released steps never change output)', () => {
    expect(migrateData(loadFixture(1).localStorage, 1)).toEqual(loadFixture(2).localStorage)
  })
})

describe('v1 -> v2 migration', () => {
  const v1 = loadFixture(1).localStorage

  it('adds a sessionId to every history entry and changes nothing else', () => {
    const v2 = migrateData(v1, 1)
    for (const key of Object.keys(v1)) {
      if (isHistoryKey(key)) {
        expect(v2[key].map(({ sessionId, ...rest }) => rest)).toEqual(v1[key])
      } else {
        expect(v2[key]).toEqual(v1[key])
      }
    }
  })

  it('preserves bests, levels, progress, learning state, autosaves and retired-mode keys verbatim', () => {
    const v2 = migrateData(v1, 1)
    for (const key of ['emojimahjong:progress', 'hanoi:progress', 'flagsoftheworld:learning', 'stroop:best:color:medium', 'sudoku:active', 'emojimahjong:stats:easy', 'nback:history:1', 'emojimahjong:tutorialSeen', 'targettap:last-target']) {
      expect(key in v2).toBe(true)
    }
    expect(v2['hanoi:progress']).toEqual(v1['hanoi:progress'])
    expect(v2['flagsoftheworld:learning']).toEqual(v1['flagsoftheworld:learning'])
    expect(v2['nback:history:1']).toHaveLength(1)
  })

  it('keeps exact-duplicate legacy entries as two records with distinct IDs', () => {
    const [a, b] = migrateData(v1, 1)['emojimahjong:history']
    expect(a.sessionId).not.toBe(b.sessionId)
  })

  it('is deterministic — two devices holding the same legacy entry derive the same ID', () => {
    const deviceA = migrateData(structuredClone(v1), 1)
    const deviceB = migrateData(structuredClone(v1), 1)
    expect(deviceB).toEqual(deviceA)
  })

  it('does not depend on property order within an entry', () => {
    const entry = { score: 1, completedAt: '2026-01-01T00:00:00.000Z' }
    const reordered = { completedAt: '2026-01-01T00:00:00.000Z', score: 1 }
    const a = migrateData({ 'sudoku:history': [entry] }, 1)['sudoku:history'][0].sessionId
    const b = migrateData({ 'sudoku:history': [reordered] }, 1)['sudoku:history'][0].sessionId
    expect(a).toBe(b)
  })

  it('gives the same entry under different keys different IDs', () => {
    const entry = { score: 1, completedAt: '2026-01-01T00:00:00.000Z' }
    const out = migrateData({ 'hanoi:history:1': [entry], 'hanoi:history:2': [entry] }, 1)
    expect(out['hanoi:history:1'][0].sessionId).not.toBe(out['hanoi:history:2'][0].sessionId)
  })

  it('is idempotent and leaves already-identified (native v2) entries untouched', () => {
    const native = { score: 5, completedAt: '2026-09-01T00:00:00.000Z', sessionId: 'native-id', deviceId: 'dev-a' }
    const once = migrateData({ 'hanoi:history:1': [native, { score: 1 }] }, 1)
    expect(once['hanoi:history:1'][0]).toEqual(native)
    expect(migrateData(once, 1)).toEqual(once)
  })

  it('leaves non-object history items and non-array history values alone', () => {
    const out = migrateData({ 'sudoku:history': [null, 3, 'x'], 'set:history': { odd: true } }, 1)
    expect(out).toEqual({ 'sudoku:history': [null, 3, 'x'], 'set:history': { odd: true } })
  })

  it('rejects unknown or newer versions', () => {
    expect(() => migrateData({}, 0)).toThrow(/Unknown schema version/)
    expect(() => migrateData({}, CURRENT_SCHEMA_VERSION + 1)).toThrow(/newer/)
  })
})

describe('assertNoLoss', () => {
  it('accepts pure additions', () => {
    expect(() => assertNoLoss({ a: [{ x: 1 }], b: { y: 2 } }, { a: [{ x: 1, id: 'i' }], b: { y: 2, z: 3 }, c: 1 })).not.toThrow()
  })

  it('rejects dropped keys, shrunk arrays and changed fields', () => {
    expect(() => assertNoLoss({ a: 1 }, {})).toThrow(/dropped key a/)
    expect(() => assertNoLoss({ a: [1, 2] }, { a: [1] })).toThrow(/shrank/)
    expect(() => assertNoLoss({ a: { best: 10 } }, { a: { best: 9 } })).toThrow(/changed a.best/)
  })
})

describe('runStorageMigrations (on-device upgrade)', () => {
  let env
  afterEach(() => {
    env?.restore()
    vi.restoreAllMocks()
  })

  const setup = (entries) => {
    env = installFakeLocalStorage(entries)
    return env.storage
  }

  it('upgrades a released v1 device in place, records schemaVersion, and leaves no backup behind', () => {
    const storage = setup({ ...toRawEntries(loadFixture(1).localStorage), 'unrelated:other-app': 'x' })
    const result = runStorageMigrations({ appVersion: '1.2.0', now: () => 'T' })
    expect(result).toMatchObject({ status: 'migrated', fromVersion: 1, toVersion: CURRENT_SCHEMA_VERSION })
    expect(JSON.parse(storage.getItem(META_KEY))).toEqual({ schemaVersion: CURRENT_SCHEMA_VERSION, appVersion: '1.2.0', migratedAt: 'T' })
    expect(storage.getItem(MIGRATION_BACKUP_KEY)).toBeNull()
    expect(storage.getItem('unrelated:other-app')).toBe('x')
    const expected = loadFixture(2).localStorage
    for (const [key, value] of Object.entries(expected)) expect(JSON.parse(storage.getItem(key))).toEqual(value)
  })

  it('never touches deprecated-feature keys', () => {
    const storage = setup(toRawEntries(loadFixture(1).localStorage))
    const before = storage.getItem('benchmark:history:stroop')
    runStorageMigrations()
    expect(storage.getItem('benchmark:history:stroop')).toBe(before)
  })

  it('is a no-op on an already-current device', () => {
    const storage = setup({ [META_KEY]: JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION }), 'sudoku:history': '[{"score":1}]' })
    expect(runStorageMigrations().status).toBe('current')
    expect(storage.getItem('sudoku:history')).toBe('[{"score":1}]')
  })

  it('never downgrades or rewrites data from a newer build', () => {
    const storage = setup({ [META_KEY]: JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 }), 'sudoku:history': '[{"score":1}]' })
    expect(runStorageMigrations().status).toBe('newer')
    expect(storage.getItem('sudoku:history')).toBe('[{"score":1}]')
  })

  it('marks a brand-new empty install as current without writing any game data', () => {
    const storage = setup({})
    expect(runStorageMigrations().status).toBe('migrated')
    expect(readSchemaVersion(storage)).toBe(CURRENT_SCHEMA_VERSION)
    expect(Object.keys(storage)).toEqual([META_KEY])
  })

  it('leaves an unparseable value exactly as it is', () => {
    const storage = setup({ 'sudoku:history': '{not json', 'set:history': '[{"score":1}]' })
    expect(runStorageMigrations().status).toBe('migrated')
    expect(storage.getItem('sudoku:history')).toBe('{not json')
    expect(JSON.parse(storage.getItem('set:history'))[0].sessionId).toBeTypeOf('string')
  })

  it('on a write failure part-way through, restores every original value and does not bump schemaVersion', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const raw = toRawEntries(loadFixture(1).localStorage)
    const storage = setup(raw)
    storage.failOn('whackamole:history:1') // alphabetically late — several keys are already rewritten by then
    const result = runStorageMigrations()
    expect(result.status).toBe('failed')
    for (const [key, value] of Object.entries(raw)) expect(storage.getItem(key)).toBe(value)
    expect(storage.getItem(META_KEY)).toBeNull()
    expect(storage.getItem(MIGRATION_BACKUP_KEY)).toBeNull()
  })

  it('aborts before touching anything if the backup itself cannot be written (e.g. quota)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const raw = toRawEntries(loadFixture(1).localStorage)
    const storage = setup(raw)
    storage.failOn(MIGRATION_BACKUP_KEY)
    expect(runStorageMigrations().status).toBe('failed')
    for (const [key, value] of Object.entries(raw)) expect(storage.getItem(key)).toBe(value)
    expect(storage.getItem(META_KEY)).toBeNull()
  })

  it('restores the pre-image of an interrupted migration on the next launch, then completes', () => {
    const storage = setup({
      'sudoku:history': '[{"score":1,"half":"written"}]', // interrupted mid-rewrite
      [MIGRATION_BACKUP_KEY]: JSON.stringify({ fromVersion: 1, toVersion: 2, raw: { 'sudoku:history': '[{"score":1}]' } }),
    })
    const result = runStorageMigrations()
    expect(result).toMatchObject({ status: 'migrated', restored: true })
    const [entry] = JSON.parse(storage.getItem('sudoku:history'))
    expect(entry).toMatchObject({ score: 1 })
    expect(entry.half).toBeUndefined()
    expect(storage.getItem(MIGRATION_BACKUP_KEY)).toBeNull()
  })

  it('reports unavailable storage instead of throwing', () => {
    expect(runStorageMigrations({ storage: null }).status).toBe('unavailable')
  })
})

// BRAIN-SYNC-SPEC §17: never clear storage as an upgrade strategy.
describe('release safety guard', () => {
  it('no source file calls localStorage.clear() / sessionStorage.clear() / indexedDB.deleteDatabase()', () => {
    const srcDir = fileURLToPath(new URL('../../', import.meta.url))
    const offenders = []
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = `${dir}${entry.name}`
        if (entry.isDirectory()) walk(`${path}/`)
        else if (/\.(js|vue)$/.test(entry.name) && !entry.name.endsWith('.test.js')) {
          if (/(localStorage|sessionStorage)\s*\.\s*clear\s*\(|deleteDatabase\s*\(/.test(readFileSync(path, 'utf8'))) offenders.push(path)
        }
      }
    }
    walk(srcDir)
    expect(offenders).toEqual([])
  })
})
