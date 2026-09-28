import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { describeSyncStatus, refreshSyncStatus, syncStatus, installSyncStatus } from './syncStatus.js'
import { isSyncAvailable, SYNC_SERVER_URL, resolveSyncServerUrl } from './config.js'
import { startSyncRuntime, stopSyncRuntime, syncNow, isSyncRuntimeRunning } from './syncRuntime.js'
import { installOutbox, enableSync, updateSyncState } from './outbox.js'
import { createMockSyncServer } from './mockServer.js'
import { makeDevice } from './testDevices.js'
import { SYNC_CREDENTIAL_KEY } from '../../constants/storageKeys.js'
import { useHanoiStats } from '../hanoi/useHanoiStats.js'

const hanoi = () => ({ disks: 3, moves: 7, optimalMoves: 7, efficiency: 100, stars: 3, mistakes: 0, undos: 0, hints: 0, duration: 1000, optimalReached: true })

let uninstall
beforeAll(() => { uninstall = installOutbox() })
afterAll(() => uninstall())

describe('status wording (BRAIN-SYNC-SPEC §41)', () => {
  it('uses the spec\'s messages', () => {
    expect(describeSyncStatus({ state: 'local-only' }).text).toBe('Progress stored on this device')
    expect(describeSyncStatus({ state: 'synced' })).toMatchObject({ icon: '☁', text: 'Synced' })
    expect(describeSyncStatus({ state: 'pending', pending: 12 })).toMatchObject({ icon: '☁', text: '12 changes waiting to sync' })
    expect(describeSyncStatus({ state: 'pending', pending: 1 }).text).toBe('1 change waiting to sync')
    expect(describeSyncStatus({ state: 'offline' })).toMatchObject({ icon: '✈', text: 'Offline', detail: 'Progress saved locally' })
    expect(describeSyncStatus({ state: 'unavailable' })).toMatchObject({ text: 'Sync unavailable', detail: 'Progress is safe on this device' })
  })

  it('never implies that a cloud problem lost progress', () => {
    for (const state of ['local-only', 'synced', 'pending', 'offline', 'unavailable', 'needs-pairing']) {
      const { text, detail } = describeSyncStatus({ state, pending: 3 })
      expect(`${text} ${detail ?? ''}`).not.toMatch(/lost|delet|fail|error/i)
    }
    for (const state of ['offline', 'unavailable', 'needs-pairing']) {
      expect(describeSyncStatus({ state }).detail).toMatch(/saved locally|safe on this device/)
    }
  })

  it('tracks the real outbox, including after writes and connectivity changes', async () => {
    const listeners = {}
    const win = { addEventListener: (type, fn) => { listeners[type] = fn } }
    const nav = { onLine: true }
    await makeDevice().use(async () => {
      installSyncStatus({ win, doc: null, nav })
      expect(refreshSyncStatus(nav).state).toBe('local-only')
      enableSync()
      updateSyncState({ needsFullResync: false })
      useHanoiStats().recordCompletion(1, hanoi())
      await Promise.resolve() // refresh is batched to a microtask
      expect(syncStatus.value).toMatchObject({ state: 'pending' })
      expect(syncStatus.value.pending).toBeGreaterThan(0)
      nav.onLine = false
      listeners.offline()
      await Promise.resolve()
      expect(syncStatus.value.state).toBe('offline')
    })
  })
})

describe('build configuration', () => {
  it('defaults to the sync API on the page\'s own origin, whatever host or LAN address it was opened on', () => {
    expect(resolveSyncServerUrl(undefined, 'http://10.0.0.7:5173')).toBe('http://10.0.0.7:5173')
    expect(resolveSyncServerUrl('', 'https://brain.example.org')).toBe('https://brain.example.org')
    expect(resolveSyncServerUrl('same-origin', 'http://localhost:5173/')).toBe('http://localhost:5173')
  })

  it('can point at another server, or be switched off entirely', () => {
    expect(resolveSyncServerUrl('https://sync.example.org/', 'http://localhost:5173')).toBe('https://sync.example.org')
    for (const off of ['off', 'OFF', 'false', '0', 'none', 'disabled']) expect(resolveSyncServerUrl(off, 'http://localhost:5173')).toBe('')
  })

  it('has no server without a real page origin (e.g. a file:// page or these tests)', () => {
    expect(resolveSyncServerUrl(undefined, 'null')).toBe('')
    expect(resolveSyncServerUrl(undefined, undefined)).toBe('')
    expect(SYNC_SERVER_URL).toBe('')
    expect(isSyncAvailable()).toBe(false)
  })
})

describe('sync runtime (§22/§61)', () => {
  it('does not start for a local-only device, or without a credential', async () => {
    await makeDevice().use(() => {
      expect(startSyncRuntime({ transport: createMockSyncServer().transport })).toBe(false)
      enableSync()
      expect(startSyncRuntime({ transport: createMockSyncServer().transport })).toBe(false)
      expect(isSyncRuntimeRunning()).toBe(false)
    })
  })

  it('starts for an enabled, credentialed device; Sync Now drains the queue; stop stops it', async () => {
    const server = createMockSyncServer()
    const env = { transport: server.transport, win: null, doc: null, nav: { onLine: true } }
    await makeDevice().use(async () => {
      localStorage.setItem(SYNC_CREDENTIAL_KEY, JSON.stringify({ baseUrl: 'https://sync.example.org', syncId: 's', credential: 'bsc_x' }))
      enableSync()
      useHanoiStats().recordCompletion(1, hanoi())
      expect(startSyncRuntime(env)).toBe(true)
      expect(startSyncRuntime(env)).toBe(false) // already running
      const result = await syncNow(env)
      expect(result.status).toBe('synced')
      expect(server.data['hanoi:history:1']).toHaveLength(1)
      expect(syncStatus.value.state).toBe('synced')
      stopSyncRuntime()
      expect(isSyncRuntimeRunning()).toBe(false)
    })
  })
})
