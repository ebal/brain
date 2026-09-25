import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { createServer } from 'node:http'
import { openDatabase } from './db.js'
import { createApp } from './app.js'
import { claimPairingToken, createPairingToken, LIMITS, prunePairingTokens } from './sync.js'
import { makeDevice } from '../src/composables/sync/testDevices.js'
import { installOutbox } from '../src/composables/sync/outbox.js'
import { runSync, getSyncStatus } from '../src/composables/sync/syncClient.js'
import {
  createHttpTransport, createIdentity, createPairingPayload, cancelPairing, pairWithPayload, decodePairingPayload,
  encodePairingPayload, rotateRecoveryCode, getRecoveryStatus, recoverWithCode, listDevices, revokeDevice,
  disconnectThisDevice, deleteCloudData, getStoredCredential, SyncHttpError,
} from '../src/composables/sync/syncApi.js'
import { getDeviceId } from '../src/composables/persistence/device.js'
import { stableStringify } from '../src/composables/persistence/ids.js'
import { formatRecoveryCode, normalizeRecoveryCode, isValidRecoveryCode, generateRecoveryCode } from '../src/composables/sync/recoveryCode.js'
import { randomBytes } from 'node:crypto'
import { CURRENT_SCHEMA_VERSION } from '../src/composables/persistence/migrations.js'
import { useHanoiStats } from '../src/composables/hanoi/useHanoiStats.js'
import { useLightsOutStats } from '../src/composables/lightsout/useLightsOutStats.js'

async function startServer(options = {}) {
  const db = openDatabase(':memory:')
  const logs = []
  const server = createServer(createApp(db, { requireHttps: false, log: (line) => logs.push(line), ...options }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { db, logs, baseUrl: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) }
}

async function post(baseUrl, path, body, credential) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(credential ? { Authorization: `Bearer ${credential}` } : {}) },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: await res.json() }
}

const hanoi = () => ({ disks: 3, moves: 7, optimalMoves: 7, efficiency: 100, stars: 3, mistakes: 0, undos: 0, hints: 0, duration: 30000, optimalReached: true })
const lightsout = () => ({ moves: 5, efficiency: 100, stars: 3, undos: 0, hints: 0, duration: 20000 })
const transport = createHttpTransport()
const tokenOf = (payload) => decodePairingPayload(payload).token

let uninstall
beforeAll(() => { uninstall = installOutbox() })
afterAll(() => uninstall())

describe('QR pairing (BRAIN-SYNC-SPEC §10/§11)', () => {
  let ctx
  beforeEach(async () => { ctx = await startServer() })
  afterEach(() => ctx.close())

  it('a trusted device shows a payload; a new device claims it, gets its own ID and credential, and both converge', async () => {
    const [blue, green] = [makeDevice(), makeDevice()]
    await blue.use(async () => {
      await createIdentity({ baseUrl: ctx.baseUrl, displayName: 'My Brain', deviceLabel: 'Blue' })
      useHanoiStats().recordCompletion(1, hanoi())
      await runSync({ transport })
    })
    const { payload, expiresAt } = await blue.use(() => createPairingPayload())
    expect(payload).toMatch(/^BRAINPAIR1\./)
    expect(() => new URL(payload)).toThrow() // not a URL
    expect(Date.parse(expiresAt) - Date.now()).toBeLessThanOrEqual(LIMITS.pairingTtlMs)

    // Green already has its own local progress — it must be merged, not replaced (§32).
    await green.use(() => useLightsOutStats().recordCompletion(1, lightsout()))
    const joined = await green.use(() => pairWithPayload(payload, { deviceLabel: 'Green' }))
    expect(joined.displayName).toBe('My Brain')
    const [blueCred, greenCred] = await Promise.all([blue.use(() => getStoredCredential()), green.use(() => getStoredCredential())])
    expect(greenCred.syncId).toBe(blueCred.syncId)
    expect(greenCred.credential).not.toBe(blueCred.credential)
    expect(await green.use(() => getDeviceId())).not.toBe(await blue.use(() => getDeviceId()))

    await green.use(() => runSync({ transport }))
    await blue.use(() => runSync({ transport }))
    expect(stableStringify(blue.data())).toBe(stableStringify(green.data()))
    expect(blue.data()['lightsout:progress'].completedLevels).toEqual([1]) // Green's pre-pairing play arrived
    expect(green.data()['hanoi:progress'].completedLevels).toEqual([1]) // and Blue's reached Green
    expect((await blue.use(() => listDevices())).map((d) => d.label)).toEqual(['Blue', 'Green'])
  })

  it('a token is single-use', async () => {
    const blue = makeDevice()
    await blue.use(() => createIdentity({ baseUrl: ctx.baseUrl }))
    const { payload } = await blue.use(() => createPairingPayload())
    await makeDevice().use(() => pairWithPayload(payload))
    await expect(makeDevice().use(() => pairWithPayload(payload))).rejects.toMatchObject({ status: 401, code: 'invalid_pairing_token' })
  })

  it('a token expires, and unknown/expired/used tokens are indistinguishable', async () => {
    const { body } = await post(ctx.baseUrl, '/v1/identities', { deviceId: crypto.randomUUID() })
    const auth = { syncId: body.syncId, deviceId: body.deviceId }
    const issuedAt = Date.now()
    const { token } = createPairingToken(ctx.db, auth, { at: issuedAt })
    const claim = (t, at) => () => claimPairingToken(ctx.db, { token: t, deviceId: crypto.randomUUID() }, { at })
    expect(claim(token, issuedAt + LIMITS.pairingTtlMs + 1)).toThrow('invalid_pairing_token')
    expect(claim('bpt_' + 'x'.repeat(43), issuedAt)).toThrow('invalid_pairing_token')
    const fresh = createPairingToken(ctx.db, auth, { at: issuedAt }).token
    claim(fresh, issuedAt + 1000)()
    expect(claim(fresh, issuedAt + 2000)).toThrow('invalid_pairing_token')
  })

  it('cancelling invalidates outstanding tokens', async () => {
    const blue = makeDevice()
    await blue.use(() => createIdentity({ baseUrl: ctx.baseUrl }))
    const { payload } = await blue.use(() => createPairingPayload())
    await blue.use(() => cancelPairing())
    await expect(makeDevice().use(() => pairWithPayload(payload))).rejects.toMatchObject({ status: 401 })
  })

  it('keeps at most a handful of open tokens per identity', async () => {
    const { body } = await post(ctx.baseUrl, '/v1/identities', { deviceId: crypto.randomUUID() })
    const auth = { syncId: body.syncId, deviceId: body.deviceId }
    const tokens = Array.from({ length: LIMITS.maxOpenPairingTokens + 3 }, (_, i) => createPairingToken(ctx.db, auth, { at: Date.now() + i }).token)
    expect(ctx.db.prepare('SELECT COUNT(*) AS n FROM pairing_tokens').get().n).toBe(LIMITS.maxOpenPairingTokens)
    expect(() => claimPairingToken(ctx.db, { token: tokens[0], deviceId: crypto.randomUUID() })).toThrow('invalid_pairing_token')
    expect(claimPairingToken(ctx.db, { token: tokens.at(-1), deviceId: crypto.randomUUID() }).credential).toMatch(/^bsc_/)
  })

  it('the trusted device cannot claim its own token', async () => {
    const blue = makeDevice()
    await blue.use(() => createIdentity({ baseUrl: ctx.baseUrl }))
    const { payload } = await blue.use(() => createPairingPayload())
    await expect(blue.use(() => pairWithPayload(payload))).rejects.toMatchObject({ status: 409 })
  })

  it('a Sync ID is never a pairing token', async () => {
    const { body } = await post(ctx.baseUrl, '/v1/identities', { deviceId: crypto.randomUUID() })
    for (const token of [body.syncId, `bpt_${body.syncId}`, body.credential]) {
      expect((await post(ctx.baseUrl, '/v1/pairing/claim', { token, deviceId: crypto.randomUUID() })).status).toBe(401)
    }
  })

  it('rejects malformed payloads locally', () => {
    for (const bad of ['', 'hello', 'BRAINPAIR1.bpt_x.aaa', 'BRAINPAIR2.bpt_aaaaaaaaaaaaaaaaaaaaaaaa.aHR0cHM6Ly94', encodePairingPayload('http://example.org', 'bpt_' + 'a'.repeat(43))]) {
      expect(decodePairingPayload(bad)).toBeNull()
    }
    expect(decodePairingPayload(encodePairingPayload('https://sync.example.org', 'bpt_' + 'a'.repeat(43)))).toEqual({ baseUrl: 'https://sync.example.org', token: 'bpt_' + 'a'.repeat(43) })
  })

  it('stores only token hashes', async () => {
    const blue = makeDevice()
    await blue.use(() => createIdentity({ baseUrl: ctx.baseUrl }))
    const { payload } = await blue.use(() => createPairingPayload())
    expect(JSON.stringify(ctx.db.prepare('SELECT * FROM pairing_tokens').all())).not.toContain(tokenOf(payload))
  })

  it('prunes expired and long-used tokens', async () => {
    const { body } = await post(ctx.baseUrl, '/v1/identities', { deviceId: crypto.randomUUID() })
    createPairingToken(ctx.db, { syncId: body.syncId, deviceId: body.deviceId }, { at: Date.now() - LIMITS.pairingTtlMs - 1 })
    createPairingToken(ctx.db, { syncId: body.syncId, deviceId: body.deviceId })
    expect(prunePairingTokens(ctx.db)).toBe(1)
  })
})

describe('recovery code (BRAIN-SYNC-SPEC §12)', () => {
  let ctx
  beforeEach(async () => { ctx = await startServer() })
  afterEach(() => ctx.close())

  it('is issued once at Enable Sync; the server keeps only a hash and never returns it again', async () => {
    const blue = makeDevice()
    const { recoveryCode } = await blue.use(() => createIdentity({ baseUrl: ctx.baseUrl }))
    expect(isValidRecoveryCode(recoveryCode)).toBe(true)
    expect(recoveryCode).toBe(formatRecoveryCode(recoveryCode))
    const dump = JSON.stringify(ctx.db.prepare('SELECT * FROM identities').all())
    expect(dump).not.toContain(normalizeRecoveryCode(recoveryCode))
    expect(dump).not.toContain(recoveryCode)
    const status = await blue.use(() => getRecoveryStatus())
    expect(status).toEqual({ configured: true, rotatedAt: expect.any(String) })
    expect(JSON.stringify(blue.storage)).not.toContain(normalizeRecoveryCode(recoveryCode)) // not kept on the device either
  })

  it('lets a new device join without any trusted device, merging its own progress', async () => {
    const [blue, red] = [makeDevice(), makeDevice()]
    const { recoveryCode } = await blue.use(async () => {
      const created = await createIdentity({ baseUrl: ctx.baseUrl, displayName: 'My Brain' })
      useHanoiStats().recordCompletion(1, hanoi())
      await runSync({ transport })
      return created
    })
    await red.use(() => useLightsOutStats().recordCompletion(1, lightsout()))
    const sloppy = recoveryCode.toLowerCase().replace(/-/g, ' ')
    const joined = await red.use(() => recoverWithCode(ctx.baseUrl, sloppy, { deviceLabel: 'Red' }))
    expect(joined.displayName).toBe('My Brain')
    await red.use(() => runSync({ transport }))
    expect(red.data()['hanoi:progress'].completedLevels).toEqual([1])
    expect(red.data()['lightsout:progress'].completedLevels).toEqual([1])
  })

  it('rejects a wrong code, and catches a typo locally without asking the server', async () => {
    const blue = makeDevice()
    const { recoveryCode } = await blue.use(() => createIdentity({ baseUrl: ctx.baseUrl }))
    const code = normalizeRecoveryCode(recoveryCode)
    const typo = (code[0] === 'A' ? 'B' : 'A') + code.slice(1)
    const fetchFn = vi.fn(globalThis.fetch)
    await expect(makeDevice().use(() => recoverWithCode(ctx.baseUrl, typo, { fetchFn }))).rejects.toMatchObject({ code: 'invalid_recovery_code_format' })
    expect(fetchFn).not.toHaveBeenCalled()
    // A well-formed code that simply isn't anyone's:
    const nobodys = generateRecoveryCode((n) => randomBytes(n))
    await expect(makeDevice().use(() => recoverWithCode(ctx.baseUrl, nobodys))).rejects.toMatchObject({ status: 401, code: 'invalid_recovery_code' })
  })

  it('rotation invalidates the old code at once; paired devices keep syncing', async () => {
    const [blue, green] = [makeDevice(), makeDevice()]
    const { recoveryCode: oldCode } = await blue.use(() => createIdentity({ baseUrl: ctx.baseUrl }))
    const { payload } = await blue.use(() => createPairingPayload())
    await green.use(() => pairWithPayload(payload))
    const { recoveryCode: newCode } = await blue.use(() => rotateRecoveryCode())
    expect(newCode).not.toBe(oldCode)
    await expect(makeDevice().use(() => recoverWithCode(ctx.baseUrl, oldCode))).rejects.toMatchObject({ status: 401 })
    await makeDevice().use(() => recoverWithCode(ctx.baseUrl, newCode))
    expect((await green.use(() => runSync({ transport }))).status).toBe('synced')
    expect((await blue.use(() => runSync({ transport }))).status).toBe('synced')
  })

  it('a revoked or disconnected device can come back with the recovery code; its old credential stays dead', async () => {
    const [blue, green] = [makeDevice(), makeDevice()]
    const { recoveryCode } = await blue.use(() => createIdentity({ baseUrl: ctx.baseUrl }))
    const { payload } = await blue.use(() => createPairingPayload())
    await green.use(() => pairWithPayload(payload))
    const greenId = await green.use(() => getDeviceId())
    const oldCredential = (await green.use(() => getStoredCredential())).credential
    await blue.use(() => revokeDevice(greenId))
    await green.use(async () => {
      expect((await runSync({ transport })).status).toBe('unauthorized')
      await recoverWithCode(ctx.baseUrl, recoveryCode)
      expect(getStoredCredential().credential).not.toBe(oldCredential)
      expect((await runSync({ transport })).status).toBe('synced')
    })
    expect((await post(ctx.baseUrl, '/v1/sync', { schemaVersion: CURRENT_SCHEMA_VERSION, operations: [] }, oldCredential)).status).toBe(401)
    // Disconnect is the same story from the device's own side.
    await green.use(async () => {
      await disconnectThisDevice()
      expect(getSyncStatus().state).toBe('local-only')
      await recoverWithCode(ctx.baseUrl, recoveryCode)
      expect((await runSync({ transport })).status).toBe('synced')
    })
  })

  it('a device that lost its local credential can recover; the lost credential is replaced', async () => {
    const blue = makeDevice()
    const { recoveryCode } = await blue.use(() => createIdentity({ baseUrl: ctx.baseUrl }))
    const lost = (await blue.use(() => getStoredCredential())).credential
    await blue.use(async () => {
      localStorage.removeItem('brain:sync:credential')
      await recoverWithCode(ctx.baseUrl, recoveryCode)
    })
    expect((await post(ctx.baseUrl, '/v1/sync', { schemaVersion: CURRENT_SCHEMA_VERSION, operations: [] }, lost)).status).toBe(401)
    expect((await blue.use(() => listDevices())).filter((d) => !d.revokedAt)).toHaveLength(1)
  })

  it('Delete Cloud Data also removes the recovery code and open pairing tokens', async () => {
    const blue = makeDevice()
    const { recoveryCode } = await blue.use(() => createIdentity({ baseUrl: ctx.baseUrl }))
    await blue.use(() => createPairingPayload())
    await blue.use(() => deleteCloudData())
    expect(ctx.db.prepare('SELECT COUNT(*) AS n FROM pairing_tokens').get().n).toBe(0)
    await expect(makeDevice().use(() => recoverWithCode(ctx.baseUrl, recoveryCode))).rejects.toMatchObject({ status: 401 })
  })
})

describe('pairing/recovery abuse limits and logging (§38/§53)', () => {
  it('rate-limits failed recovery and pairing attempts per client — even a correct code is refused once blocked', async () => {
    const ctx = await startServer({ rateLimits: { recoveryFailure: { limit: 3, windowMs: 60000 }, pairingFailure: { limit: 2, windowMs: 60000 } } })
    const { recoveryCode } = (await post(ctx.baseUrl, '/v1/identities', { deviceId: crypto.randomUUID() })).body
    const wrong = normalizeRecoveryCode(recoveryCode).split('').reverse().join('')
    for (let i = 0; i < 3; i++) expect((await post(ctx.baseUrl, '/v1/recover', { recoveryCode: wrong, deviceId: crypto.randomUUID() })).status).toBe(401)
    expect((await post(ctx.baseUrl, '/v1/recover', { recoveryCode, deviceId: crypto.randomUUID() })).status).toBe(429)
    for (let i = 0; i < 2; i++) expect((await post(ctx.baseUrl, '/v1/pairing/claim', { token: 'bpt_nope', deviceId: crypto.randomUUID() })).status).toBe(401)
    expect((await post(ctx.baseUrl, '/v1/pairing/claim', { token: 'bpt_nope', deviceId: crypto.randomUUID() })).status).toBe(429)
    await ctx.close()
  })

  it('never logs tokens, recovery codes or credentials', async () => {
    const ctx = await startServer()
    const [blue, green] = [makeDevice(), makeDevice()]
    const { recoveryCode } = await blue.use(() => createIdentity({ baseUrl: ctx.baseUrl }))
    const { payload } = await blue.use(() => createPairingPayload())
    await green.use(() => pairWithPayload(payload))
    await makeDevice().use(() => recoverWithCode(ctx.baseUrl, recoveryCode))
    const log = ctx.logs.join('\n')
    for (const secret of [tokenOf(payload), 'bpt_', 'bsc_', normalizeRecoveryCode(recoveryCode), recoveryCode]) expect(log).not.toContain(secret)
    expect(log).toContain('POST /v1/pairing/claim 201')
    expect(log).toContain('POST /v1/recover 201')
    await ctx.close()
  })

  it('surfaces errors as SyncHttpError', async () => {
    const ctx = await startServer()
    await expect(makeDevice().use(() => pairWithPayload('garbage'))).rejects.toBeInstanceOf(SyncHttpError)
    await ctx.close()
  })
})
