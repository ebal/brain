import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getDeviceId, newSessionStamp, _resetDeviceIdCache } from './device.js'
import { randomUUID, contentUUID, stableStringify } from './ids.js'
import { DEVICE_KEY, META_KEY } from '../../constants/storageKeys.js'
import { buildExport, deleteAllData } from '../dataPortability.js'
import { useHanoiStats } from '../hanoi/useHanoiStats.js'
import { installFakeLocalStorage } from './testStorage.js'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('ids', () => {
  it('randomUUID returns distinct v4 UUIDs', () => {
    const a = randomUUID()
    expect(a).toMatch(UUID_V4)
    expect(randomUUID()).not.toBe(a)
  })

  it('randomUUID falls back to getRandomValues outside secure contexts', () => {
    const original = globalThis.crypto
    Object.defineProperty(globalThis, 'crypto', { value: { getRandomValues: (b) => original.getRandomValues(b) }, configurable: true })
    try {
      expect(randomUUID()).toMatch(UUID_V4)
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true })
    }
  })

  it('contentUUID is a deterministic v8 UUID', () => {
    expect(contentUUID('abc')).toBe(contentUUID('abc'))
    expect(contentUUID('abc')).not.toBe(contentUUID('abd'))
    expect(contentUUID('abc')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('stableStringify ignores key order', () => {
    expect(stableStringify({ b: 1, a: [{ d: 2, c: 3 }] })).toBe(stableStringify({ a: [{ c: 3, d: 2 }], b: 1 }))
  })
})

describe('device identity (BRAIN-SYNC-SPEC §7)', () => {
  let env
  beforeEach(() => {
    _resetDeviceIdCache()
    env = installFakeLocalStorage()
  })
  afterEach(() => env.restore())

  it('is created once and stays stable across reloads', () => {
    const id = getDeviceId()
    expect(id).toMatch(UUID_V4)
    _resetDeviceIdCache() // simulate a page reload
    expect(getDeviceId()).toBe(id)
    expect(JSON.parse(env.storage.getItem(DEVICE_KEY)).deviceId).toBe(id)
  })

  it('is never exported, and survives Delete All Data', () => {
    const id = getDeviceId()
    env.storage.setItem(META_KEY, JSON.stringify({ schemaVersion: 2 }))
    env.storage.setItem('sudoku:history', '[]')
    expect(Object.keys(buildExport().data)).toEqual(['sudoku:history'])
    deleteAllData()
    expect(env.storage.getItem('sudoku:history')).toBeNull()
    expect(JSON.parse(env.storage.getItem(DEVICE_KEY)).deviceId).toBe(id)
    expect(env.storage.getItem(META_KEY)).not.toBeNull()
  })

  it('newSessionStamp gives a fresh sessionId and this device ID each time', () => {
    const a = newSessionStamp()
    const b = newSessionStamp()
    expect(a.deviceId).toBe(getDeviceId())
    expect(b.deviceId).toBe(a.deviceId)
    expect(a.sessionId).toMatch(UUID_V4)
    expect(b.sessionId).not.toBe(a.sessionId)
  })

  it('every newly recorded session carries sessionId + deviceId (BRAIN-SYNC-SPEC §19)', () => {
    const stats = useHanoiStats()
    const result = { disks: 3, moves: 7, optimalMoves: 7, efficiency: 100, stars: 3, mistakes: 0, undos: 0, hints: 0, duration: 1000, optimalReached: true }
    stats.recordCompletion(1, result)
    stats.recordCompletion(1, result)
    const [first, second] = stats.getHistory(1)
    expect(first).toMatchObject({ deviceId: getDeviceId(), metricVersion: 1 })
    expect(first.sessionId).toMatch(UUID_V4)
    expect(second.sessionId).not.toBe(first.sessionId)
  })
})
