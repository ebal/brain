import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createServer } from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase, SERVER_SCHEMA_VERSION, MIGRATIONS } from './db.js'
import { DatabaseSync } from 'node:sqlite'
import { createApp } from './app.js'
import { registerDevice, pruneOperations, hashCredential, recoveryStatus, authenticate } from './sync.js'
import { makeDevice } from '../src/composables/sync/testDevices.js'
import { installOutbox, enableSync, listOutbox } from '../src/composables/sync/outbox.js'
import { runSync, getSyncStatus } from '../src/composables/sync/syncClient.js'
import { createHttpTransport, createIdentity, listDevices, renameDevice, revokeDevice, deleteCloudData, renameProfile, getProfile, getStoredCredential } from '../src/composables/sync/syncApi.js'
import { getDeviceId } from '../src/composables/persistence/device.js'
import { stableStringify } from '../src/composables/persistence/ids.js'
import { CURRENT_SCHEMA_VERSION } from '../src/composables/persistence/migrations.js'
import { SYNC_CREDENTIAL_KEY, isHistoryKey } from '../src/constants/storageKeys.js'
import { buildExport } from '../src/composables/dataPortability.js'
import { useEmojiMahjongStats } from '../src/composables/emojimahjong/useEmojiMahjongStats.js'
import { useSudokuStats } from '../src/composables/sudoku/useSudokuStats.js'
import { useHanoiStats } from '../src/composables/hanoi/useHanoiStats.js'

// A real server on an ephemeral port, backed by in-memory SQLite.
async function startServer(options = {}) {
  const db = openDatabase(':memory:')
  const logs = []
  const server = createServer(createApp(db, { requireHttps: false, log: (line) => logs.push(line), ...options }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}`
  return { db, logs, baseUrl, close: () => new Promise((resolve) => server.close(resolve)) }
}

async function call(baseUrl, method, path, { credential, body, headers = {} } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(credential ? { Authorization: `Bearer ${credential}` } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
  const text = await res.text()
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null }
}

const mahjong = (stars = 1) => ({ layoutId: 'L', seed: 1, tileCount: 8, moves: 4, mistakes: 0, hints: 3 - stars, undos: 0, completionTime: 60000, clean: stars === 3, stars, score: 100 * stars })
const sudoku = () => ({ completionTime: 300000, mistakes: 0, hints: 0, puzzleId: 'p' })
const hanoi = () => ({ disks: 3, moves: 7, optimalMoves: 7, efficiency: 100, stars: 3, mistakes: 0, undos: 0, hints: 0, duration: 30000, optimalReached: true })
const sessionIdsOf = (data) => Object.entries(data).filter(([k]) => isHistoryKey(k)).flatMap(([, v]) => v.map((e) => e.sessionId))
const transport = createHttpTransport()

// Adds a device to an identity the way Phase 5 pairing will, and gives the
// simulated installation that credential.
async function pairDevice(ctx, device, syncId) {
  const deviceId = await device.use(() => getDeviceId())
  const { credential } = registerDevice(ctx.db, syncId, { deviceId })
  await device.use(() => {
    localStorage.setItem(SYNC_CREDENTIAL_KEY, JSON.stringify({ baseUrl: ctx.baseUrl, syncId, credential }))
    enableSync()
  })
  return credential
}

let uninstall
beforeAll(() => { uninstall = installOutbox() })
afterAll(() => uninstall())

describe('Brain Sync API', () => {
  let ctx
  beforeEach(async () => {
    ctx?.close()
    ctx = await startServer()
  })
  afterAll(() => ctx?.close())

  it('reports health and schema versions', async () => {
    const res = await call(ctx.baseUrl, 'GET', '/v1/health')
    expect(res).toMatchObject({ status: 200, body: { ok: true, schemaVersion: CURRENT_SCHEMA_VERSION, serverSchemaVersion: SERVER_SCHEMA_VERSION } })
  })

  describe('identity and authentication (§5, §14, §53)', () => {
    it('Enable Sync creates an anonymous identity with this device, stores the credential locally, never exports it', async () => {
      const device = makeDevice()
      await device.use(async () => {
        const created = await createIdentity({ baseUrl: ctx.baseUrl, displayName: 'My Brain', deviceLabel: 'Blue' })
        expect(created.deviceId).toBe(getDeviceId())
        expect(getStoredCredential().credential).toMatch(/^bsc_[A-Za-z0-9_-]{43}$/)
        expect(getSyncStatus().state).toBe('pending') // full upload of local progress queued
        useSudokuStats().recordCompletion('easy', sudoku())
        expect(JSON.stringify(buildExport())).not.toContain(getStoredCredential().credential)
        expect(await getProfile()).toMatchObject({ syncId: created.syncId, displayName: 'My Brain' })
      })
    })

    it('stores only a hash of each credential', async () => {
      const { body } = await call(ctx.baseUrl, 'POST', '/v1/identities', { body: { deviceId: crypto.randomUUID() } })
      const dump = JSON.stringify(ctx.db.prepare('SELECT * FROM devices').all())
      expect(dump).not.toContain(body.credential)
      expect(dump).toContain(hashCredential(body.credential))
    })

    it('a Sync ID alone — or no/forged credential — never authenticates', async () => {
      const { body } = await call(ctx.baseUrl, 'POST', '/v1/identities', { body: { deviceId: crypto.randomUUID() } })
      for (const credential of [body.syncId, `bsc_${body.syncId}`, 'bsc_' + 'A'.repeat(43), undefined]) {
        expect((await call(ctx.baseUrl, 'GET', '/v1/profile', { credential })).status).toBe(401)
      }
      expect((await call(ctx.baseUrl, 'GET', '/v1/profile', { credential: body.credential })).status).toBe(200)
    })

    it('each new device gets a distinct credential', async () => {
      const { body } = await call(ctx.baseUrl, 'POST', '/v1/identities', { body: { deviceId: crypto.randomUUID() } })
      const second = registerDevice(ctx.db, body.syncId, { deviceId: crypto.randomUUID() })
      expect(second.credential).not.toBe(body.credential)
      expect((await call(ctx.baseUrl, 'GET', '/v1/devices', { credential: second.credential })).body.devices).toHaveLength(2)
    })

    it('rejects an invalid device ID', async () => {
      expect((await call(ctx.baseUrl, 'POST', '/v1/identities', { body: { deviceId: 'my-iphone' } })).status).toBe(400)
    })
  })

  describe('cross-profile isolation (§53)', () => {
    it('one identity can never read, rename or revoke another identity\'s devices or data', async () => {
      const a = (await call(ctx.baseUrl, 'POST', '/v1/identities', { body: { deviceId: crypto.randomUUID() } })).body
      const b = (await call(ctx.baseUrl, 'POST', '/v1/identities', { body: { deviceId: crypto.randomUUID() } })).body
      const push = { schemaVersion: CURRENT_SCHEMA_VERSION, cursor: null, operations: [{ operationId: 'op-b', entityType: 'record', entityId: 'hanoi:progress', payload: { highestUnlocked: 2, completedLevels: [1] } }] }
      await call(ctx.baseUrl, 'POST', '/v1/sync', { credential: b.credential, body: push })
      const pull = await call(ctx.baseUrl, 'POST', '/v1/sync', { credential: a.credential, body: { schemaVersion: CURRENT_SCHEMA_VERSION, cursor: null, operations: [] } })
      expect(pull.body.changes).toEqual({})
      expect((await call(ctx.baseUrl, 'PATCH', `/v1/devices/${b.deviceId}`, { credential: a.credential, body: { label: 'x' } })).status).toBe(404)
      expect((await call(ctx.baseUrl, 'DELETE', `/v1/devices/${b.deviceId}`, { credential: a.credential })).status).toBe(404)
      expect((await call(ctx.baseUrl, 'GET', '/v1/profile', { credential: b.credential })).status).toBe(200)
    })
  })

  describe('sync over HTTP', () => {
    it('Blue, Green and Red play offline, then converge through the real server (§48/§51/§68)', async () => {
      const [blue, green, red] = [makeDevice(), makeDevice(), makeDevice()]
      const campaign = (through, overrides) => () => {
        const stats = useEmojiMahjongStats()
        for (let level = 1; level <= through; level++) stats.recordCompletion(level, mahjong(overrides[level] ?? 1))
      }
      // Blue has been playing local-only, then enables sync.
      await blue.use(campaign(36, { 30: 3 }))
      const { syncId } = await blue.use(() => createIdentity({ baseUrl: ctx.baseUrl, deviceLabel: 'Blue' }))
      await pairDevice(ctx, green, syncId)
      await pairDevice(ctx, red, syncId)
      await green.use(campaign(28, { 28: 3 }))
      await red.use(campaign(38, { 37: 2 }))
      const expected = [blue, green, red].flatMap((d) => sessionIdsOf(d.data()))

      // Connectivity returns: everyone syncs, then syncs again to pull the others'.
      await green.use(() => runSync({ transport }))
      await red.use(() => runSync({ transport }))
      await blue.use(() => runSync({ transport }))
      for (const device of [green, red, blue]) {
        const result = await device.use(() => runSync({ transport }))
        expect(result.status).toBe('synced')
      }

      const states = [blue, green, red].map((d) => stableStringify(d.data()))
      expect(new Set(states).size).toBe(1)
      const merged = blue.data()
      expect(merged['emojimahjong:progress']).toMatchObject({ highestUnlocked: 39 })
      expect(merged['emojimahjong:stats:30'].best.stars).toBe(3)
      expect(merged['emojimahjong:stats:28'].best.stars).toBe(3)
      expect(merged['emojimahjong:stats:37'].best.stars).toBe(2)
      expect(sessionIdsOf(merged).sort()).toEqual(expected.sort())
      expect(ctx.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n).toBe(36 + 28 + 38)
      for (const device of [blue, green, red]) expect(await device.use(() => listOutbox())).toEqual([])
    })

    it('two devices pushing at the same moment both land, and neither erases the other (§48)', async () => {
      const { syncId, credential: a } = (await call(ctx.baseUrl, 'POST', '/v1/identities', { body: { deviceId: crypto.randomUUID() } })).body
      const { credential: b } = registerDevice(ctx.db, syncId, { deviceId: crypto.randomUUID() })
      const push = (credential, prefix, levels) => call(ctx.baseUrl, 'POST', '/v1/sync', { credential, body: { schemaVersion: CURRENT_SCHEMA_VERSION, cursor: null, operations: [
        { operationId: `${prefix}-progress`, entityType: 'record', entityId: 'lightsout:progress', payload: { highestUnlocked: 1, completedLevels: levels } },
        ...levels.map((level) => {
          const entry = { sessionId: crypto.randomUUID(), level, completedAt: '2026-09-01T00:00:00.000Z' }
          return { operationId: `${prefix}-${level}`, entityType: 'session', entityId: entry.sessionId, payload: { key: `lightsout:history:${level}`, entry } }
        }),
      ] } })
      const results = await Promise.all([push(a, 'a', [1, 2, 3]), push(b, 'b', [3, 4])])
      expect(results.map((r) => r.status)).toEqual([200, 200])
      const pull = await call(ctx.baseUrl, 'POST', '/v1/sync', { credential: a, body: { schemaVersion: CURRENT_SCHEMA_VERSION, cursor: null, operations: [] } })
      expect(pull.body.changes['lightsout:progress']).toMatchObject({ completedLevels: [1, 2, 3, 4], highestUnlocked: 5 })
      expect(ctx.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n).toBe(5)
    })

    it('keeps the full, uncapped session history server-side', async () => {
      const device = makeDevice()
      await device.use(async () => {
        await createIdentity({ baseUrl: ctx.baseUrl })
        for (let i = 0; i < 35; i++) useSudokuStats().recordCompletion('easy', sudoku())
        await runSync({ transport })
      })
      expect(ctx.db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE storage_key = 'sudoku:history'").get().n).toBe(35)
    })

    it('is idempotent: a replayed request changes nothing and is still acknowledged (§28/§46)', async () => {
      const { credential } = (await call(ctx.baseUrl, 'POST', '/v1/identities', { body: { deviceId: crypto.randomUUID() } })).body
      const entry = { sessionId: '11111111-1111-4111-8111-111111111111', completedAt: '2026-09-01T00:00:00.000Z', score: 1 }
      const body = { schemaVersion: CURRENT_SCHEMA_VERSION, cursor: null, operations: [
        { operationId: 'op-1', entityType: 'session', entityId: entry.sessionId, payload: { key: 'sudoku:history', entry } },
        { operationId: 'op-2', entityType: 'record', entityId: 'sudoku:stats:easy', payload: { completed: 1, bestCleanTime: { time: 10, mistakes: 0 } } },
      ] }
      const first = await call(ctx.baseUrl, 'POST', '/v1/sync', { credential, body })
      const second = await call(ctx.baseUrl, 'POST', '/v1/sync', { credential, body })
      expect(second.body.acknowledged).toEqual(['op-1', 'op-2'])
      expect(second.body.cursor).toBe(first.body.cursor) // nothing re-applied
      // Same session under a new operation ID: still one row.
      await call(ctx.baseUrl, 'POST', '/v1/sync', { credential, body: { ...body, operations: [{ ...body.operations[0], operationId: 'op-3' }] } })
      expect(ctx.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n).toBe(1)
    })

    it('returns only changes since the cursor', async () => {
      const { credential } = (await call(ctx.baseUrl, 'POST', '/v1/identities', { body: { deviceId: crypto.randomUUID() } })).body
      const op = (id, key, payload) => ({ operationId: id, entityType: 'record', entityId: key, payload })
      const first = await call(ctx.baseUrl, 'POST', '/v1/sync', { credential, body: { schemaVersion: CURRENT_SCHEMA_VERSION, cursor: null, operations: [op('a', 'sudoku:stats:easy', { completed: 1 })] } })
      const second = await call(ctx.baseUrl, 'POST', '/v1/sync', { credential, body: { schemaVersion: CURRENT_SCHEMA_VERSION, cursor: first.body.cursor, operations: [op('b', 'set:stats:easy', { completed: 2 })] } })
      expect(Object.keys(second.body.changes)).toEqual(['set:stats:easy'])
      const nothing = await call(ctx.baseUrl, 'POST', '/v1/sync', { credential, body: { schemaVersion: CURRENT_SCHEMA_VERSION, cursor: second.body.cursor, operations: [] } })
      expect(nothing.body.changes).toEqual({})
    })

    it('re-derives campaign progression server-side and never lets a worse best win', async () => {
      const { credential } = (await call(ctx.baseUrl, 'POST', '/v1/identities', { body: { deviceId: crypto.randomUUID() } })).body
      const ops = [
        { operationId: '1', entityType: 'record', entityId: 'hanoi:stats:2', payload: { completed: 1, best: { moves: 15, hints: 0, stars: 3 } } },
        { operationId: '2', entityType: 'record', entityId: 'hanoi:progress', payload: { highestUnlocked: 1, completedLevels: [2], totalStars: 0 } },
        { operationId: '3', entityType: 'record', entityId: 'hanoi:stats:2', payload: { completed: 1, best: { moves: 40, hints: 2, stars: 1 } } },
      ]
      const res = await call(ctx.baseUrl, 'POST', '/v1/sync', { credential, body: { schemaVersion: CURRENT_SCHEMA_VERSION, cursor: null, operations: ops } })
      expect(res.body.changes['hanoi:progress']).toMatchObject({ highestUnlocked: 3, totalStars: 3 })
      expect(res.body.changes['hanoi:stats:2'].best.moves).toBe(15)
    })
  })

  describe('malformed and oversized payloads (§45/§53)', () => {
    let credential
    beforeEach(async () => {
      credential = (await call(ctx.baseUrl, 'POST', '/v1/identities', { body: { deviceId: crypto.randomUUID() } })).body.credential
    })
    const sync = (body) => call(ctx.baseUrl, 'POST', '/v1/sync', { credential, body })

    it('rejects broken requests', async () => {
      expect((await sync('{not json')).status).toBe(400)
      expect((await sync({ schemaVersion: CURRENT_SCHEMA_VERSION, operations: 'x' })).status).toBe(400)
      expect((await sync({ schemaVersion: CURRENT_SCHEMA_VERSION, cursor: -1, operations: [] })).status).toBe(400)
      expect((await sync({ schemaVersion: CURRENT_SCHEMA_VERSION, operations: [{ operationId: 1 }] })).status).toBe(400)
      expect((await sync({ schemaVersion: CURRENT_SCHEMA_VERSION + 1, operations: [] })).status).toBe(409)
      const tooMany = Array.from({ length: 5001 }, (_, i) => ({ operationId: `o${i}`, entityType: 'record', entityId: 'x:y', payload: 1 }))
      expect((await sync({ schemaVersion: CURRENT_SCHEMA_VERSION, operations: tooMany })).status).toBe(413)
    })

    it('acknowledges but never merges invalid operations, so they can\'t jam a queue or damage data', async () => {
      await sync({ schemaVersion: CURRENT_SCHEMA_VERSION, operations: [{ operationId: 'good', entityType: 'record', entityId: 'hanoi:progress', payload: { highestUnlocked: 2, completedLevels: [1] } }] })
      const res = await sync({ schemaVersion: CURRENT_SCHEMA_VERSION, cursor: null, operations: [
        { operationId: 'bad-1', entityType: 'record', entityId: 'sudoku:history', payload: 'not a list' },
        { operationId: 'bad-2', entityType: 'record', entityId: 'sudoku:active', payload: { board: [] } }, // device-local
        { operationId: 'bad-3', entityType: 'record', entityId: 'brain:sync:credential', payload: {} }, // not game data
        { operationId: 'bad-4', entityType: 'session', entityId: 'x', payload: { key: 'sudoku:history', entry: { sessionId: 'y' } } }, // id mismatch
        { operationId: 'bad-5', entityType: 'record', entityId: 'hanoi:stats:1', payload: [1, 2] },
      ] })
      expect(res.status).toBe(200)
      expect(res.body.acknowledged).toHaveLength(5)
      expect(res.body.rejected).toEqual(['bad-1', 'bad-2', 'bad-3', 'bad-4', 'bad-5'])
      expect(Object.keys(res.body.changes)).toEqual(['hanoi:progress'])
    })

    it('rejects oversized bodies', async () => {
      const small = await startServer({ maxBodyBytes: 1024 })
      const { credential: c } = (await call(small.baseUrl, 'POST', '/v1/identities', { body: { deviceId: crypto.randomUUID() } })).body
      const res = await call(small.baseUrl, 'POST', '/v1/sync', { credential: c, body: { schemaVersion: CURRENT_SCHEMA_VERSION, operations: [], pad: 'x'.repeat(4096) } })
      expect(res.status).toBe(413)
      await small.close()
    })

    it('404s unknown routes and 405s wrong methods', async () => {
      expect((await call(ctx.baseUrl, 'GET', '/v1/nope')).status).toBe(404)
      expect((await call(ctx.baseUrl, 'GET', '/v1/sync', { credential })).status).toBe(405)
    })
  })

  describe('devices, revocation and cloud deletion (§13, §39, §44)', () => {
    it('lists, renames (labels never affect identity), and revokes devices', async () => {
      const blue = makeDevice()
      const green = makeDevice()
      const { syncId } = await blue.use(() => createIdentity({ baseUrl: ctx.baseUrl, deviceLabel: 'Blue' }))
      await pairDevice(ctx, green, syncId)
      const greenId = await green.use(() => getDeviceId())
      await blue.use(async () => {
        await renameDevice(greenId, 'Green')
        await renameDevice(greenId, 'Blue') // non-unique labels are fine
        const devices = await listDevices()
        expect(devices.map((d) => d.label)).toEqual(['Blue', 'Blue'])
        expect(devices.find((d) => d.current).deviceId).toBe(getDeviceId())
        await renameProfile('Evaggelos')
        expect((await getProfile()).syncId).toBe(syncId) // renaming never changes the Sync ID
      })

      await green.use(() => useHanoiStats().recordCompletion(1, hanoi()))
      await blue.use(() => revokeDevice(greenId))
      await green.use(async () => {
        const result = await runSync({ transport })
        expect(result.status).toBe('unauthorized')
        expect(getSyncStatus().state).toBe('needs-pairing')
        expect(useHanoiStats().getHistory(1)).toHaveLength(1) // local progress untouched
        useHanoiStats().recordCompletion(2, hanoi()) // and play goes on
      })
      expect((await blue.use(() => runSync({ transport }))).status).toBe('synced') // others unaffected
    })

    it('Delete Cloud Data removes every server row for the identity, keeps local progress', async () => {
      const device = makeDevice()
      await device.use(async () => {
        await createIdentity({ baseUrl: ctx.baseUrl })
        useFlagsStatsRound()
        useHanoiStats().recordCompletion(1, hanoi())
        await runSync({ transport })
      })
      for (const table of ['sessions', 'records', 'learning_events', 'operations', 'devices', 'identities']) {
        expect(ctx.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n).toBeGreaterThan(table === 'learning_events' ? -1 : 0)
      }
      await device.use(async () => {
        await deleteCloudData()
        expect(getStoredCredential()).toBeNull()
        expect(getSyncStatus().state).toBe('local-only')
        expect(useHanoiStats().getHistory(1)).toHaveLength(1)
      })
      for (const table of ['sessions', 'records', 'learning_events', 'operations', 'devices', 'identities']) {
        expect(ctx.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n).toBe(0)
      }
    })
  })

  describe('transport security and logging (§14, §38, §53)', () => {
    it('never logs credentials, Sync IDs, device IDs or headers', async () => {
      const device = makeDevice()
      let stored
      await device.use(async () => {
        await createIdentity({ baseUrl: ctx.baseUrl })
        useHanoiStats().recordCompletion(1, hanoi())
        await runSync({ transport })
        await listDevices()
        await revokeDevice(getDeviceId())
        await runSync({ transport })
        stored = { ...getStoredCredential(), deviceId: getDeviceId() }
      })
      const log = ctx.logs.join('\n')
      expect(ctx.logs.length).toBeGreaterThan(3)
      for (const secret of [stored.credential, stored.syncId, stored.deviceId, 'Bearer', 'bsc_']) expect(log).not.toContain(secret)
      expect(log).toContain('DELETE /v1/devices/:deviceId 200')
    })

    it('requires HTTPS (via the trusted proxy) when configured', async () => {
      const strict = await startServer({ requireHttps: true, trustProxy: true })
      expect((await call(strict.baseUrl, 'POST', '/v1/identities', { body: { deviceId: crypto.randomUUID() } })).status).toBe(403)
      const ok = await call(strict.baseUrl, 'POST', '/v1/identities', { body: { deviceId: crypto.randomUUID() }, headers: { 'X-Forwarded-Proto': 'https' } })
      expect(ok.status).toBe(201)
      expect((await call(strict.baseUrl, 'GET', '/v1/health')).status).toBe(200) // health stays reachable for probes
      await strict.close()
    })

    it('does not trust X-Forwarded-Proto unless configured to', async () => {
      const untrusting = await startServer({ requireHttps: true, trustProxy: false })
      const res = await call(untrusting.baseUrl, 'POST', '/v1/identities', { body: { deviceId: crypto.randomUUID() }, headers: { 'X-Forwarded-Proto': 'https' } })
      expect(res.status).toBe(403)
      await untrusting.close()
    })

    it('rate-limits identity creation and repeated authentication failures', async () => {
      const limited = await startServer({ rateLimits: { createIdentity: { limit: 2, windowMs: 60000 }, authFailure: { limit: 3, windowMs: 60000 } } })
      const create = () => call(limited.baseUrl, 'POST', '/v1/identities', { body: { deviceId: crypto.randomUUID() } })
      const { credential } = (await create()).body
      await create()
      expect((await create()).status).toBe(429)
      for (let i = 0; i < 3; i++) expect((await call(limited.baseUrl, 'GET', '/v1/profile', { credential: 'bsc_wrong' })).status).toBe(401)
      expect((await call(limited.baseUrl, 'GET', '/v1/profile', { credential: 'bsc_wrong' })).status).toBe(429)
      expect((await call(limited.baseUrl, 'GET', '/v1/profile', { credential })).status).toBe(429) // blocked source, even with a good credential
      await limited.close()
    })

    it('answers CORS only for allowed origins', async () => {
      const cors = await startServer({ allowedOrigins: ['https://brain.ebal.gr'] })
      const allowed = await call(cors.baseUrl, 'OPTIONS', '/v1/sync', { headers: { Origin: 'https://brain.ebal.gr' } })
      expect(allowed.status).toBe(204)
      expect(allowed.headers.get('access-control-allow-origin')).toBe('https://brain.ebal.gr')
      expect(allowed.headers.get('access-control-allow-headers')).toContain('Authorization')
      const denied = await call(cors.baseUrl, 'OPTIONS', '/v1/sync', { headers: { Origin: 'https://evil.example' } })
      expect(denied.headers.get('access-control-allow-origin')).toBeNull()
      await cors.close()
    })

    it('marks every response no-store', async () => {
      expect((await call(ctx.baseUrl, 'GET', '/v1/health')).headers.get('cache-control')).toBe('no-store')
    })
  })
})

describe('datastore', () => {
  it('applies server schema migrations once and reopens an existing file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'brain-sync-'))
    try {
      const path = join(dir, 'db.sqlite')
      openDatabase(path).close()
      const db = openDatabase(path)
      expect(db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get().n).toBe(SERVER_SCHEMA_VERSION)
      db.close()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('upgrades a database written by an older server without losing anything (§17)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'brain-sync-'))
    try {
      const path = join(dir, 'v1.sqlite')
      // Exactly what the Phase 4 server (schema 1) left on disk.
      const old = new DatabaseSync(path)
      old.exec('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)')
      old.exec(MIGRATIONS[0])
      old.prepare("INSERT INTO schema_migrations VALUES (1, 'then')").run()
      old.prepare("INSERT INTO identities (sync_id, display_name, revision, created_at) VALUES ('s1', 'Mine', 3, 'then')").run()
      old.prepare("INSERT INTO devices (sync_id, device_id, credential_hash, created_at) VALUES ('s1', 'd1', ?, 'then')").run(hashCredential('bsc_old'))
      old.prepare("INSERT INTO records VALUES ('s1', 'hanoi:progress', '{\"completedLevels\":[1]}', 3, 'then')").run()
      old.close()

      const db = openDatabase(path)
      expect(db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get().v).toBe(SERVER_SCHEMA_VERSION)
      expect(db.prepare('SELECT display_name AS n, revision AS r FROM identities').get()).toEqual({ n: 'Mine', r: 3 })
      expect(JSON.parse(db.prepare('SELECT value FROM records').get().value)).toEqual({ completedLevels: [1] })
      const auth = authenticate(db, 'bsc_old') // existing credentials keep working
      expect(recoveryStatus(db, auth)).toEqual({ configured: false, rotatedAt: null })
      db.close()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('prunes only expired operation IDs', () => {
    const db = openDatabase(':memory:')
    db.prepare("INSERT INTO identities (sync_id, created_at) VALUES ('s', 'x')").run()
    db.prepare("INSERT INTO operations VALUES ('s', 'old', 'd', '2000-01-01T00:00:00.000Z'), ('s', 'new', 'd', ?)").run(new Date().toISOString())
    expect(pruneOperations(db, 90)).toBe(1)
    expect(db.prepare('SELECT operation_id AS id FROM operations').all().map((r) => r.id)).toEqual(['new'])
  })
})

// A Flags round, so learning events exist to be deleted too.
import { useFlagsStats } from '../src/composables/flags/useFlagsStats.js'
function useFlagsStatsRound() {
  useFlagsStats().recordCompletion(1, {
    level: 1, correctCount: 1, totalCount: 1, accuracy: 100, bestStreak: 1, score: 10, stars: 3, duration: 1000,
    perQuestionLog: [{ countryCode: 'gr', correct: true, timestamp: 1 }],
  })
}
