import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { installOutbox, enableSync, disableSync, isSyncEnabled, listOutbox, getSyncState, recordWrite } from './outbox.js'
import { runSync, getSyncStatus, backoffDelay, validateResponse } from './syncClient.js'
import { startAutoSync, WRITE_DEBOUNCE_MS } from './autoSync.js'
import { createMockSyncServer } from './mockServer.js'
import { syncableData } from './mergeEngine.js'
import { stableStringify } from '../persistence/ids.js'
import { persistJSON, onDurableWrite } from '../persistence/durableWrite.js'
import { installFakeLocalStorage } from '../persistence/testStorage.js'
import { _resetDeviceIdCache, getDeviceId } from '../persistence/device.js'
import { DEVICE_KEY, SYNC_STATE_KEY, OUTBOX_PREFIX, isHistoryKey } from '../../constants/storageKeys.js'
import { deleteAllData } from '../dataPortability.js'
import { useHanoiStats } from '../hanoi/useHanoiStats.js'
import { useSudokuStats } from '../sudoku/useSudokuStats.js'
import { useEmojiMahjongStats } from '../emojimahjong/useEmojiMahjongStats.js'
import { useFlagsStats } from '../flags/useFlagsStats.js'

// ---- simulated installations --------------------------------------------
// A device is a persistent in-memory localStorage; `use` makes it the
// global one for the duration of fn (sync or async). "Reloading" a device
// is a fresh storage object built from the same raw entries.

function makeDevice(entries = {}) {
  const { storage, restore } = installFakeLocalStorage(entries)
  restore()
  return {
    storage,
    async use(fn) {
      const original = globalThis.localStorage
      Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true })
      _resetDeviceIdCache()
      try {
        return await fn()
      } finally {
        Object.defineProperty(globalThis, 'localStorage', { value: original, configurable: true, writable: true })
        _resetDeviceIdCache()
      }
    },
    reload() {
      return makeDevice(Object.fromEntries(Object.keys(storage).map((k) => [k, storage[k]])))
    },
    data() {
      const out = {}
      for (const key of Object.keys(storage)) out[key] = JSON.parse(storage[key])
      return syncableData(out)
    },
  }
}

const hanoiResult = (moves = 7) => ({ disks: 3, moves, optimalMoves: 7, efficiency: 100, stars: moves === 7 ? 3 : 2, mistakes: 0, undos: 0, hints: 0, duration: 30000, optimalReached: moves === 7 })
const sudokuResult = () => ({ completionTime: 300000, mistakes: 0, hints: 0, puzzleId: 'p' })
const mahjongResult = (stars = 3) => ({ layoutId: 'L', seed: 1, tileCount: 8, moves: 4, mistakes: 0, hints: 3 - stars, undos: 0, completionTime: 60000, clean: stars === 3, stars, score: 100 * stars })
const sessionOps = () => listOutbox().filter((op) => op.entityType === 'session')
const allSessionIds = (data) => Object.entries(data).filter(([k]) => isHistoryKey(k)).flatMap(([, v]) => v.map((e) => e.sessionId))

let uninstall
beforeAll(() => { uninstall = installOutbox() })
afterAll(() => uninstall())
afterEach(() => vi.useRealTimers())

describe('outbox queuing (§21)', () => {
  it('queues nothing while sync is disabled (the default)', async () => {
    const device = makeDevice()
    await device.use(() => {
      expect(isSyncEnabled()).toBe(false)
      useHanoiStats().recordCompletion(1, hanoiResult())
      expect(listOutbox()).toEqual([])
    })
  })

  it('queues one session op per new session and one coalesced record op per changed key', async () => {
    const device = makeDevice()
    await device.use(() => {
      enableSync()
      const stats = useHanoiStats()
      stats.recordCompletion(1, hanoiResult(9))
      stats.recordCompletion(1, hanoiResult(7))
      const ops = listOutbox()
      const sessions = ops.filter((o) => o.entityType === 'session')
      expect(sessions.map((o) => o.entityId).sort()).toEqual(stats.getHistory(1).map((e) => e.sessionId).sort())
      expect(sessions[0].payload.key).toBe('hanoi:history:1')
      const statsOp = ops.find((o) => o.entityType === 'record' && o.entityId === 'hanoi:stats:1')
      expect(statsOp.version).toBe(2) // two writes, one op
      expect(ops.filter((o) => o.entityId === 'hanoi:stats:1')).toHaveLength(1)
      for (const op of ops) {
        expect(op).toMatchObject({ deviceId: getDeviceId(), attemptCount: 0, lastAttemptAt: null })
        expect(op.operationId).toMatch(/^[0-9a-f-]{36}$/)
      }
    })
  })

  it('never queues device-local keys (autosaves, UI flags)', async () => {
    await makeDevice().use(() => {
      enableSync()
      persistJSON('sudoku:active', { board: [] })
      persistJSON('targettap:last-target', 'X')
      expect(listOutbox()).toEqual([])
    })
  })

  it('keeps a session queued even after the capped history has evicted it (§2/§46)', async () => {
    const device = makeDevice()
    const server = createMockSyncServer()
    await device.use(async () => {
      enableSync()
      const stats = useSudokuStats()
      for (let i = 0; i < 35; i++) stats.recordCompletion('easy', sudokuResult())
      expect(stats.getHistory('all')).toHaveLength(30) // local cap unchanged
      expect(sessionOps()).toHaveLength(35)
      await runSync({ transport: server.transport })
      expect(server.data['sudoku:history']).toHaveLength(35) // nothing lost
    })
  })

  it('queues Flags learning events with unique IDs (§20)', async () => {
    const server = createMockSyncServer()
    await makeDevice().use(async () => {
      enableSync()
      useFlagsStats().recordCompletion(1, {
        level: 1, correctCount: 1, totalCount: 2, accuracy: 50, bestStreak: 1, score: 10, stars: 1, duration: 1000,
        perQuestionLog: [{ countryCode: 'gr', correct: true, timestamp: 1 }, { countryCode: 'cy', correct: false, wrongCode: 'gr', timestamp: 2 }],
      })
      const events = listOutbox().filter((o) => o.entityType === 'learningEvent')
      expect(events).toHaveLength(2)
      expect(new Set(events.map((e) => e.payload.learningEventId)).size).toBe(2)
      expect(events[1].payload).toMatchObject({ game: 'flagsoftheworld', level: 1, deviceId: getDeviceId() })
      await runSync({ transport: server.transport })
      expect(server.learningEvents.size).toBe(2)
      expect(listOutbox()).toEqual([])
    })
  })

  it('a failing sync listener can never fail or undo the local save', async () => {
    await makeDevice().use(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const off = onDurableWrite(() => { throw new Error('boom') })
      persistJSON('sudoku:history', [{ sessionId: 's' }])
      off()
      expect(JSON.parse(localStorage.getItem('sudoku:history'))).toEqual([{ sessionId: 's' }])
    })
  })

  it('an outbox out of room falls back to a full resync instead of losing the change', async () => {
    await makeDevice().use(() => {
      enableSync()
      updateStateNoResync()
      localStorage.failOn(`${OUTBOX_PREFIX}record:hanoi:progress`)
      recordWrite('hanoi:progress', { completedLevels: [1] }, null)
      expect(getSyncState().needsFullResync).toBe(true)
    })
  })
})

function updateStateNoResync() {
  const state = JSON.parse(localStorage.getItem(SYNC_STATE_KEY))
  localStorage.setItem(SYNC_STATE_KEY, JSON.stringify({ ...state, needsFullResync: false }))
}

describe('local-first guarantees (§49)', () => {
  it('network unavailable: the game saves, unlocks and stays queued; nothing blocks', async () => {
    const server = createMockSyncServer()
    server.setMode('offline')
    await makeDevice().use(async () => {
      enableSync()
      const stats = useEmojiMahjongStats()
      stats.recordCompletion(1, mahjongResult())
      expect(stats.getProgress().highestUnlocked).toBe(2) // level unlocked offline
      const result = await runSync({ transport: server.transport })
      expect(result.status).toBe('failed')
      expect(stats.getHistory(1)).toHaveLength(1)
      expect(sessionOps()).toHaveLength(1)
      expect(getSyncStatus().state).toBe('unavailable')
    })
  })

  it('navigator offline: no network attempt at all', async () => {
    const server = createMockSyncServer()
    await makeDevice().use(async () => {
      enableSync()
      useHanoiStats().recordCompletion(1, hanoiResult())
      expect((await runSync({ transport: server.transport, online: false })).status).toBe('offline')
      expect(server.requests).toHaveLength(0)
      expect(getSyncStatus({ online: false })).toMatchObject({ state: 'offline' })
    })
  })

  it('API timeout: local save already succeeded, ops stay queued with the attempt recorded', async () => {
    const server = createMockSyncServer()
    server.setMode('hang')
    await makeDevice().use(async () => {
      enableSync()
      useHanoiStats().recordCompletion(1, hanoiResult())
      const result = await runSync({ transport: server.transport, timeoutMs: 20 })
      expect(result).toMatchObject({ status: 'failed' })
      expect(result.error).toMatch(/timed out/)
      expect(result.retryInMs).toBeGreaterThan(0)
      expect(useHanoiStats().getHistory(1)).toHaveLength(1)
      expect(sessionOps()[0].attemptCount).toBe(1)
      expect(sessionOps()[0].lastAttemptAt).not.toBeNull()
    })
  })

  it('Results are available before any sync happens: recording is synchronous and sync is deferred', async () => {
    vi.useFakeTimers()
    const server = createMockSyncServer()
    await makeDevice().use(async () => {
      enableSync()
      const auto = startAutoSync({ transport: server.transport, nav: { onLine: false } })
      const outcome = useHanoiStats().recordCompletion(1, hanoiResult()) // what ResultsScreen shows
      expect(outcome).toMatchObject({ isNewBest: true })
      expect(server.requests).toHaveLength(0) // no network work happened inside the save
      auto.stop()
    })
  })

  it('the outbox survives a reload/restart', async () => {
    let device = makeDevice()
    await device.use(() => {
      enableSync()
      useHanoiStats().recordCompletion(1, hanoiResult())
    })
    const before = await device.use(() => listOutbox())
    device = device.reload()
    const after = await device.use(() => listOutbox())
    expect(after).toEqual(before)
    expect(after.length).toBeGreaterThan(0)
  })

  it('reconnecting drains every pending change', async () => {
    const server = createMockSyncServer()
    server.setMode('offline')
    await makeDevice().use(async () => {
      enableSync()
      for (let level = 1; level <= 3; level++) useHanoiStats().recordCompletion(level, hanoiResult())
      await runSync({ transport: server.transport })
      expect(getSyncStatus().pending).toBeGreaterThan(0)
      server.setMode('online')
      const result = await runSync({ transport: server.transport })
      expect(result).toMatchObject({ status: 'synced', pending: 0 })
      expect(getSyncStatus().state).toBe('synced')
      expect(server.data['hanoi:progress'].completedLevels).toEqual([1, 2, 3])
    })
  })
})

describe('idempotency and partial sync (§28/§46)', () => {
  it('a lost response is retried without duplicating anything', async () => {
    const server = createMockSyncServer()
    await makeDevice().use(async () => {
      enableSync()
      useHanoiStats().recordCompletion(1, hanoiResult())
      server.setMode('lose-response')
      expect((await runSync({ transport: server.transport })).status).toBe('failed')
      const appliedAfterFirst = server.appliedCount
      server.setMode('online')
      await runSync({ transport: server.transport })
      expect(server.appliedCount).toBe(appliedAfterFirst) // same operationIds: not re-applied
      expect(server.data['hanoi:history:1']).toHaveLength(1)
      expect(listOutbox()).toEqual([])
    })
  })

  it('a change made while a sync is in flight stays queued after the older ack', async () => {
    const server = createMockSyncServer()
    let release
    const gated = { sync: (req) => new Promise((resolve) => { release = () => resolve(server.transport.sync(req)) }) }
    await makeDevice().use(async () => {
      enableSync()
      updateStateNoResync()
      persistJSON('hanoi:progress', { highestUnlocked: 2, completedLevels: [1] })
      const pending = runSync({ transport: gated })
      await Promise.resolve()
      await Promise.resolve()
      persistJSON('hanoi:progress', { highestUnlocked: 3, completedLevels: [1, 2] }) // newer version mid-flight
      release()
      await pending
      const [op] = listOutbox()
      expect(op).toMatchObject({ entityId: 'hanoi:progress', version: 2 })
      await runSync({ transport: server.transport })
      expect(server.data['hanoi:progress'].completedLevels).toEqual([1, 2])
    })
  })

  it('an invalid server response is rejected wholesale; local data and queue are untouched (§45)', async () => {
    const server = createMockSyncServer()
    server.setMode('garbage')
    const device = makeDevice()
    await device.use(async () => {
      enableSync()
      useHanoiStats().recordCompletion(1, hanoiResult())
      const before = JSON.stringify(device.data())
      const queued = listOutbox().length
      expect((await runSync({ transport: server.transport })).status).toBe('failed')
      expect(JSON.stringify(device.data())).toBe(before)
      expect(listOutbox()).toHaveLength(queued)
    })
    expect(() => validateResponse({ acknowledged: [], changes: [], cursor: 1 })).toThrow(/changes/)
    expect(() => validateResponse({ acknowledged: [1], changes: {}, cursor: 1 })).toThrow(/acknowledged/)
  })

  it('a revoked credential stops automatic retries but never touches local progress (§44)', async () => {
    const server = createMockSyncServer()
    server.setMode('unauthorized')
    await makeDevice().use(async () => {
      enableSync()
      useHanoiStats().recordCompletion(1, hanoiResult())
      const result = await runSync({ transport: server.transport })
      expect(result).toMatchObject({ status: 'unauthorized', retryInMs: null })
      expect(getSyncStatus().state).toBe('needs-pairing')
      useHanoiStats().recordCompletion(2, hanoiResult()) // play continues
      expect(useHanoiStats().getProgress().completedLevels).toEqual([1, 2])
    })
  })
})

describe('enabling sync on a device that already has progress (§9/§32)', () => {
  it('pushes the whole existing local state once, then goes incremental', async () => {
    const server = createMockSyncServer()
    const device = makeDevice()
    await device.use(async () => {
      for (let level = 1; level <= 4; level++) useHanoiStats().recordCompletion(level, hanoiResult())
      expect(listOutbox()).toEqual([]) // local-only until now
      enableSync()
      expect(getSyncStatus().state).toBe('pending')
      await runSync({ transport: server.transport })
      expect(server.data).toEqual(device.data())
      expect(getSyncState().needsFullResync).toBe(false)
      useHanoiStats().recordCompletion(5, hanoiResult())
      const before = server.requests.length
      await runSync({ transport: server.transport })
      expect(server.requests[before].operations.length).toBeLessThan(6) // just the new session + touched keys
    })
  })

  it('disabling sync clears the queue but keeps all local progress', async () => {
    await makeDevice().use(() => {
      enableSync()
      useHanoiStats().recordCompletion(1, hanoiResult())
      disableSync()
      expect(listOutbox()).toEqual([])
      expect(useHanoiStats().getHistory(1)).toHaveLength(1)
      expect(getSyncStatus().state).toBe('local-only')
    })
  })
})

describe('three devices converge through the server (§48/§51/§68)', () => {
  it('Blue, Green and Red play offline, then sync in any order and end up identical', async () => {
    const server = createMockSyncServer()
    const blue = makeDevice()
    const green = makeDevice()
    const red = makeDevice()
    const campaign = (through, overrides) => () => {
      enableSync()
      const stats = useEmojiMahjongStats()
      for (let level = 1; level <= through; level++) stats.recordCompletion(level, mahjongResult(overrides[level] ?? 1))
      useSudokuStats().recordCompletion('easy', sudokuResult())
    }
    // Offline play on every device first.
    await blue.use(campaign(36, { 30: 3 }))
    await green.use(campaign(28, { 28: 3 }))
    await red.use(campaign(38, { 37: 2 }))
    const expectedSessions = [blue, green, red].flatMap((d) => allSessionIds(d.data()))

    // Connectivity returns; each device syncs twice (push, then pull the others').
    for (const round of [1, 2]) {
      for (const device of round === 1 ? [red, blue, green] : [green, red, blue]) {
        await device.use(() => runSync({ transport: server.transport }))
      }
    }

    const states = [blue, green, red].map((d) => stableStringify(d.data()))
    expect(new Set(states).size).toBe(1)
    const merged = blue.data()
    expect(merged['emojimahjong:progress'].highestUnlocked).toBe(39)
    expect(merged['emojimahjong:stats:30'].best.stars).toBe(3)
    expect(merged['emojimahjong:stats:28'].best.stars).toBe(3)
    expect(merged['emojimahjong:stats:37'].best.stars).toBe(2)
    expect(allSessionIds(merged).sort()).toEqual(expectedSessions.sort())
    for (const device of [blue, green, red]) expect(await device.use(() => listOutbox())).toEqual([])
  })
})

describe('auto-sync triggers (§22)', () => {
  function fakeEnv(onLine = true) {
    const listeners = {}
    const target = () => ({
      addEventListener: (type, fn) => { listeners[type] = fn },
      removeEventListener: (type) => { delete listeners[type] },
    })
    return { listeners, win: target(), doc: { ...target(), visibilityState: 'visible' }, nav: { onLine } }
  }

  it('syncs on launch, on reconnect, on foreground, shortly after a write, and on Sync Now', async () => {
    vi.useFakeTimers()
    const server = createMockSyncServer()
    const env = fakeEnv(true)
    await makeDevice().use(async () => {
      enableSync()
      const auto = startAutoSync({ transport: server.transport, win: env.win, doc: env.doc, nav: env.nav })
      await vi.runAllTimersAsync()
      expect(server.requests).toHaveLength(1) // launch while online
      env.listeners.online()
      await vi.runAllTimersAsync()
      expect(server.requests).toHaveLength(2) // connectivity returned
      env.listeners.visibilitychange()
      await vi.runAllTimersAsync()
      expect(server.requests).toHaveLength(3) // foregrounded
      useHanoiStats().recordCompletion(1, hanoiResult())
      await vi.advanceTimersByTimeAsync(WRITE_DEBOUNCE_MS - 1)
      expect(server.requests).toHaveLength(3) // debounced, not inside the save
      await vi.advanceTimersByTimeAsync(1)
      await vi.runAllTimersAsync()
      expect(server.requests).toHaveLength(4)
      expect(server.data['hanoi:history:1']).toHaveLength(1)
      await auto.syncNow()
      expect(server.requests).toHaveLength(5)
      auto.stop()
      expect(env.listeners).toEqual({})
    })
  })

  it('retries after a failure with backoff, and not at all while offline', async () => {
    vi.useFakeTimers()
    const server = createMockSyncServer()
    server.setMode('offline')
    const env = fakeEnv(true)
    await makeDevice().use(async () => {
      enableSync()
      const auto = startAutoSync({ transport: server.transport, win: env.win, doc: env.doc, nav: env.nav })
      await vi.advanceTimersByTimeAsync(0)
      expect(server.requests).toHaveLength(1)
      server.setMode('online')
      await vi.advanceTimersByTimeAsync(5000) // first backoff is 2.5–5s
      expect(server.requests).toHaveLength(2)
      expect(getSyncStatus().state).toBe('synced')
      env.nav.onLine = false
      await auto.syncNow()
      expect(server.requests).toHaveLength(2)
      auto.stop()
    })
  })

  it('backoff is exponential, jittered and bounded', () => {
    expect(backoffDelay(0)).toBe(0)
    expect(backoffDelay(1, () => 1)).toBe(5000)
    expect(backoffDelay(3, () => 1)).toBe(20000)
    expect(backoffDelay(3, () => 0)).toBe(10000)
    expect(backoffDelay(50, () => 1)).toBe(15 * 60 * 1000)
  })
})

describe('Delete All Data (§39)', () => {
  it('drops queued copies of local progress but keeps device identity and sync settings', async () => {
    await makeDevice().use(() => {
      enableSync()
      useHanoiStats().recordCompletion(1, hanoiResult())
      deleteAllData()
      expect(listOutbox()).toEqual([])
      expect(localStorage.getItem(DEVICE_KEY)).not.toBeNull()
      expect(isSyncEnabled()).toBe(true)
    })
  })
})
