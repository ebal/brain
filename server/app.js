// HTTP layer for Brain Sync — plain node:http, no framework (§64).
//
//   GET    /v1/health
//   POST   /v1/identities          create identity + first device (no auth)
//   GET    /v1/profile             ┐
//   PATCH  /v1/profile             │
//   POST   /v1/sync                │ Authorization: Bearer <device credential>
//   GET    /v1/devices             │
//   PATCH  /v1/devices/:deviceId   │
//   DELETE /v1/devices/:deviceId   │ revoke
//   DELETE /v1/identity            │ delete all cloud data (§39)
//   POST   /v1/pairing-tokens      │ new short-lived single-use QR token
//   DELETE /v1/pairing-tokens      │ cancel outstanding tokens
//   GET    /v1/recovery-code       │ { configured, rotatedAt } — never the code
//   POST   /v1/recovery-code       ┘ rotate; the new code is returned once
//   POST   /v1/pairing/claim       new device joins with a pairing token (no auth)
//   POST   /v1/recover             new device joins with the recovery code (no auth)
//
// Privacy/security (§14, §37, §38): credentials only ever travel in the
// Authorization header (never URLs), are stored only as SHA-256 hashes, and
// are never logged. The access log is `METHOD /route/template STATUS ms` —
// no IPs, no headers, no bodies, no IDs. Client IPs are used only in memory
// for rate limiting. HTTPS is enforced (TLS terminated by the reverse
// proxy in front, which must set X-Forwarded-Proto).

import { CURRENT_SCHEMA_VERSION } from '../src/composables/persistence/migrations.js'
import { SERVER_SCHEMA_VERSION } from './db.js'
import {
  ApiError, authenticate, createIdentity, getProfile, renameProfile, sync,
  listDevices, renameDevice, revokeDevice, deleteIdentity,
  createPairingToken, cancelPairingTokens, claimPairingToken,
  rotateRecoveryCode, recoveryStatus, recoverWithCode,
} from './sync.js'

const DEFAULTS = {
  allowedOrigins: [],
  requireHttps: true,
  trustProxy: false,
  maxBodyBytes: 8 * 1024 * 1024, // > a full localStorage (5 MB) bootstrap
  rateLimits: {
    createIdentity: { limit: 20, windowMs: 60 * 60 * 1000 },
    authFailure: { limit: 30, windowMs: 10 * 60 * 1000 },
    pairingFailure: { limit: 20, windowMs: 10 * 60 * 1000 },
    recoveryFailure: { limit: 10, windowMs: 60 * 60 * 1000 }, // §53: reasonable pairing/recovery limits
    // Per identity (not IP): automatic sync is debounced and backs off, so
    // a real device stays far below this; a runaway client can't hog the server.
    syncPerIdentity: { limit: 120, windowMs: 60 * 1000 },
  },
  log: (line) => console.log(line),
}

// Fixed-window counters, in memory only.
function createRateLimiter() {
  const windows = new Map()
  return {
    hit(bucket, key, { limit, windowMs }, at = Date.now()) {
      const id = `${bucket}\n${key}`
      let w = windows.get(id)
      if (!w || at - w.start >= windowMs) w = { start: at, count: 0 }
      w.count += 1
      windows.set(id, w)
      if (windows.size > 10000) {
        for (const [k, v] of windows) if (at - v.start >= windowMs) windows.delete(k)
      }
      return w.count <= limit
    },
    exceeded(bucket, key, { limit, windowMs }, at = Date.now()) {
      const w = windows.get(`${bucket}\n${key}`)
      return !!w && at - w.start < windowMs && w.count >= limit
    },
  }
}

const ROUTES = [
  ['GET', /^\/v1\/health$/, 'health'],
  ['POST', /^\/v1\/identities$/, 'createIdentity'],
  ['GET', /^\/v1\/profile$/, 'getProfile'],
  ['PATCH', /^\/v1\/profile$/, 'renameProfile'],
  ['POST', /^\/v1\/sync$/, 'sync'],
  ['GET', /^\/v1\/devices$/, 'listDevices'],
  ['PATCH', /^\/v1\/devices\/([0-9a-fA-F-]{36})$/, 'renameDevice'],
  ['DELETE', /^\/v1\/devices\/([0-9a-fA-F-]{36})$/, 'revokeDevice'],
  ['DELETE', /^\/v1\/identity$/, 'deleteIdentity'],
  ['POST', /^\/v1\/pairing-tokens$/, 'createPairingToken'],
  ['DELETE', /^\/v1\/pairing-tokens$/, 'cancelPairingTokens'],
  ['POST', /^\/v1\/pairing\/claim$/, 'claimPairingToken'],
  ['GET', /^\/v1\/recovery-code$/, 'recoveryStatus'],
  ['POST', /^\/v1\/recovery-code$/, 'rotateRecoveryCode'],
  ['POST', /^\/v1\/recover$/, 'recoverWithCode'],
]

const ROUTE_TEMPLATES = {
  renameDevice: '/v1/devices/:deviceId',
  revokeDevice: '/v1/devices/:deviceId',
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length'])
    if (declared > maxBytes) return reject(new ApiError(413, 'payload_too_large'))
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(new ApiError(413, 'payload_too_large'))
        req.destroy()
      } else chunks.push(chunk)
    })
    req.on('end', () => {
      if (size === 0) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new ApiError(400, 'invalid_json'))
      }
    })
    req.on('error', reject)
  })
}

export function createApp(db, options = {}) {
  const config = { ...DEFAULTS, ...options, rateLimits: { ...DEFAULTS.rateLimits, ...options.rateLimits } }
  const limiter = createRateLimiter()

  const clientKey = (req) => (config.trustProxy ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() : '') || req.socket.remoteAddress || 'unknown'
  const isHttps = (req) => req.socket.encrypted || (config.trustProxy && String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim() === 'https')

  function bearer(req) {
    const header = req.headers.authorization
    return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : null
  }

  // Runs fn unless this client already used up its failure budget for
  // `bucket`; a 401 from fn counts against it.
  function limitFailures(req, bucket, fn) {
    const key = clientKey(req)
    if (limiter.exceeded(bucket, key, config.rateLimits[bucket])) throw new ApiError(429, 'rate_limited')
    try {
      return fn()
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) limiter.hit(bucket, key, config.rateLimits[bucket])
      throw error
    }
  }

  const auth = (req) => limitFailures(req, 'authFailure', () => authenticate(db, bearer(req)))

  const handlers = {
    health: () => [200, { ok: true, schemaVersion: CURRENT_SCHEMA_VERSION, serverSchemaVersion: SERVER_SCHEMA_VERSION }],
    async createIdentity(req) {
      if (!limiter.hit('createIdentity', clientKey(req), config.rateLimits.createIdentity)) throw new ApiError(429, 'rate_limited')
      return [201, createIdentity(db, await readBody(req, config.maxBodyBytes))]
    },
    getProfile: (req) => [200, getProfile(db, auth(req))],
    async renameProfile(req) {
      const a = auth(req)
      return [200, renameProfile(db, a, await readBody(req, config.maxBodyBytes))]
    },
    async sync(req) {
      const a = auth(req)
      if (!limiter.hit('syncPerIdentity', a.syncId, config.rateLimits.syncPerIdentity)) throw new ApiError(429, 'rate_limited')
      return [200, sync(db, a, await readBody(req, config.maxBodyBytes))]
    },
    listDevices: (req) => [200, { devices: listDevices(db, auth(req)) }],
    async renameDevice(req, [deviceId]) {
      const a = auth(req)
      return [200, renameDevice(db, a, deviceId.toLowerCase(), await readBody(req, config.maxBodyBytes))]
    },
    revokeDevice: (req, [deviceId]) => [200, revokeDevice(db, auth(req), deviceId.toLowerCase())],
    deleteIdentity: (req) => [200, deleteIdentity(db, auth(req))],
    createPairingToken: (req) => [201, createPairingToken(db, auth(req))],
    cancelPairingTokens: (req) => [200, cancelPairingTokens(db, auth(req))],
    async claimPairingToken(req) {
      const body = await readBody(req, config.maxBodyBytes)
      return [201, limitFailures(req, 'pairingFailure', () => claimPairingToken(db, body))]
    },
    recoveryStatus: (req) => [200, recoveryStatus(db, auth(req))],
    rotateRecoveryCode: (req) => [200, rotateRecoveryCode(db, auth(req))],
    async recoverWithCode(req) {
      const body = await readBody(req, config.maxBodyBytes)
      return [201, limitFailures(req, 'recoveryFailure', () => recoverWithCode(db, body))]
    },
  }

  function corsHeaders(req) {
    const origin = req.headers.origin
    if (!origin || !config.allowedOrigins.includes(origin)) return {}
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    }
  }

  return async function handle(req, res) {
    const started = Date.now()
    const path = new URL(req.url, 'http://localhost').pathname
    let routeName = 'unknown'
    let status = 500
    let body
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...corsHeaders(req),
    }
    try {
      if (req.method === 'OPTIONS') {
        status = 204
      } else {
        const forPath = ROUTES.filter(([, pattern]) => pattern.test(path))
        if (forPath.length === 0) throw new ApiError(404, 'not_found')
        const route = forPath.find(([method]) => method === req.method)
        if (!route) throw new ApiError(405, 'method_not_allowed')
        const [, pattern, name] = route
        routeName = name
        if (config.requireHttps && name !== 'health' && !isHttps(req)) throw new ApiError(403, 'https_required')
        ;[status, body] = await handlers[name](req, path.match(pattern).slice(1))
      }
    } catch (error) {
      if (error instanceof ApiError) {
        status = error.status
        body = { error: error.code }
      } else {
        status = 500
        body = { error: 'internal' }
        config.log(`error ${routeName}: ${error?.message ?? error}`)
      }
    }
    res.writeHead(status, headers)
    res.end(status === 204 ? undefined : JSON.stringify(body ?? {}))
    config.log(`${req.method} ${ROUTE_TEMPLATES[routeName] ?? (routeName === 'unknown' ? '-' : path)} ${status} ${Date.now() - started}ms`)
  }
}
