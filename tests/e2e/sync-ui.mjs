// End-to-end Brain Sync UI test in a real browser (BRAIN-SYNC-SPEC §49-§53,
// §61). No test dependencies: headless Firefox driven over WebDriver BiDi
// with Node's built-in WebSocket.
//
//   npm run test:e2e-sync            (needs Firefox ≥ 129 on PATH, or FIREFOX=/path/to/firefox)
//   KEEP=1 npm run test:e2e-sync     keep the work dir (build, logs, screenshots)
//
// It builds the app pointed at a throwaway local sync server, serves it with
// `vite preview`, and runs installations as isolated browser user contexts
// (separate storage, like separate devices):
//   1. Blue (local progress) enables sync → recovery code shown once
//   2. Red (own progress) joins with the recovery code, typo caught locally
//   3. Both converge; Blue shows a QR that decodes to the real payload
//   4. Green joins with the pairing code; Blue sees it arrive
//   5. The sync server goes down: "Sync unavailable · Progress is safe…"

import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const FIREFOX = process.env.FIREFOX || 'firefox'
const SYNC_PORT = Number(process.env.E2E_SYNC_PORT || 18790)
const APP_PORT = Number(process.env.E2E_APP_PORT || 4179)
const BIDI_PORT = Number(process.env.E2E_BIDI_PORT || 9333)
const SYNC_URL = `http://127.0.0.1:${SYNC_PORT}`
const APP = `http://127.0.0.1:${APP_PORT}/`

const work = mkdtempSync(join(tmpdir(), 'brain-sync-e2e-'))
const shots = join(work, 'screenshots')
mkdirSync(shots)
const children = []
const log = (...a) => console.log('•', ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function start(name, command, args, env = {}) {
  const child = spawn(command, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
  const out = []
  child.stdout.on('data', (d) => out.push(d))
  child.stderr.on('data', (d) => out.push(d))
  child.on('exit', () => writeFileSync(join(work, `${name}.log`), Buffer.concat(out)))
  children.push(child)
  return child
}

async function waitFor(check, what, timeout = 20000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    try {
      if (await check()) return
    } catch {
      // not up yet
    }
    await sleep(200)
  }
  throw new Error(`timed out waiting for ${what}`)
}

function teardown() {
  for (const child of children) if (child.exitCode === null) child.kill()
  if (!process.env.KEEP) rmSync(work, { recursive: true, force: true })
  else console.log(`\nwork dir kept: ${work}`)
}

// ---- BiDi client ----------------------------------------------------------

let ws
let nextId = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})

async function connectBidi() {
  await waitFor(() => new Promise((resolve) => {
    const socket = new WebSocket(`ws://127.0.0.1:${BIDI_PORT}/session`)
    socket.onopen = () => { ws = socket; resolve(true) }
    socket.onerror = () => resolve(false)
  }), 'Firefox remote agent')
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id === undefined || !pending.has(msg.id)) return
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.type === 'error' ? reject(new Error(`${msg.error}: ${msg.message}`)) : resolve(msg.result)
  }
  await send('session.new', { capabilities: {} })
}

async function newDevice(name) {
  const { userContext } = await send('browser.createUserContext')
  const { context } = await send('browsingContext.create', { type: 'tab', userContext })
  await send('browsingContext.setViewport', { context, viewport: { width: 390, height: 844 } })
  return { name, context }
}

async function evaluate(device, expression) {
  const result = await send('script.evaluate', { expression, target: { context: device.context }, awaitPromise: true, resultOwnership: 'none' })
  if (result.type === 'exception') throw new Error(`${device.name}: ${result.exceptionDetails.text}`)
  return result.result?.value
}

async function waitForText(device, text, timeout = 10000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if (await evaluate(device, `document.body.innerText.includes(${JSON.stringify(text)})`)) return
    await sleep(150)
  }
  throw new Error(`${device.name}: timed out waiting for "${text}". Page says:\n${await evaluate(device, 'document.body.innerText')}`)
}

async function click(device, label) {
  const ok = await evaluate(device, `(() => {
    const el = [...document.querySelectorAll('button, summary')].find((b) => b.innerText.trim().includes(${JSON.stringify(label)}) && !b.disabled)
    if (!el) return false
    el.click(); return true })()`)
  if (!ok) throw new Error(`${device.name}: no enabled button "${label}"`)
  await sleep(200)
}

async function fill(device, labelText, value) {
  const ok = await evaluate(device, `(() => {
    const label = [...document.querySelectorAll('label')].find((l) => l.innerText.includes(${JSON.stringify(labelText)}))
    const el = label?.querySelector('input, textarea')
    if (!el) return false
    el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true })()`)
  if (!ok) throw new Error(`${device.name}: no field "${labelText}"`)
}

async function shot(device, file) {
  const { data } = await send('browsingContext.captureScreenshot', { context: device.context, origin: 'document' })
  writeFileSync(join(shots, file), Buffer.from(data, 'base64'))
}

async function open(device) {
  await send('browsingContext.navigate', { context: device.context, url: APP, wait: 'complete' })
  await waitForText(device, 'Choose a Game')
}

const readLocal = async (device, key) => JSON.parse(await evaluate(device, `localStorage.getItem(${JSON.stringify(key)})`))
// Stands in for progress played before sync was enabled.
const seed = (device, key, value) => evaluate(device, `localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(value))})`)

async function acknowledgeRecoveryCode(device) {
  await waitForText(device, 'Your recovery code')
  const code = await evaluate(device, `document.querySelector('.recovery-code').innerText.replace(/\\s+/g, '')`)
  const doneDisabled = await evaluate(device, `[...document.querySelectorAll('button')].find((b) => b.innerText === 'Done').disabled`)
  if (!doneDisabled) throw new Error('Done must stay disabled until the code is acknowledged')
  await shot(device, `${device.name}-recovery-code.png`)
  await evaluate(device, `document.querySelector('.check-label input').click()`)
  await sleep(100)
  await click(device, 'Done')
  return code
}

// ---- scenarios -------------------------------------------------------------

async function threeDevices(jsqrChunk) {
  const [blue, red, green] = [await newDevice('Blue'), await newDevice('Red'), await newDevice('Green')]

  await open(blue)
  await seed(blue, 'hanoi:progress', { highestUnlocked: 3, completedLevels: [1, 2], totalStars: 6 })
  await seed(blue, 'hanoi:stats:1', { started: 1, completed: 1, best: { moves: 7, hints: 0, stars: 3 }, completions: [] })
  await seed(blue, 'hanoi:stats:2', { started: 1, completed: 1, best: { moves: 15, hints: 0, stars: 3 }, completions: [] })
  await open(blue)
  await waitForText(blue, 'Progress stored on this device')
  await shot(blue, '01-landing-local-only.png')
  log('landing shows the local-only status line')

  await click(blue, 'Enable Sync')
  await waitForText(blue, 'Use Brain on more than one device')
  await fill(blue, 'Profile name', 'My Brain')
  await fill(blue, "This device's name", 'Blue')
  await click(blue, 'Enable Brain Sync')
  const recoveryCode = await acknowledgeRecoveryCode(blue)
  await waitForText(blue, 'Synced')
  await shot(blue, '02-connected.png')
  if (JSON.stringify(await readLocal(blue, 'brain:sync:credential')).includes(recoveryCode.replace(/-/g, ''))) {
    throw new Error('the recovery code must not be stored on the device')
  }
  log('Blue enabled sync; recovery code shown once, acknowledged, not stored')

  await open(red)
  await seed(red, 'lightsout:progress', { highestUnlocked: 2, completedLevels: [1], totalStars: 3 })
  await seed(red, 'lightsout:stats:1', { started: 1, completed: 1, best: { moves: 5, hints: 0, undos: 0, stars: 3 }, completions: [] })
  await open(red)
  await click(red, 'Brain Sync')
  await click(red, 'Use recovery code')
  const typo = recoveryCode.toLowerCase().replace(/-/g, ' ').replace(/.$/, (c) => (c === '0' ? '1' : '0'))
  await fill(red, 'Recovery code', typo)
  await waitForText(red, 'typo')
  log('a typo in the recovery code is caught on the device')
  await fill(red, 'Recovery code', recoveryCode.toLowerCase().replace(/-/g, ' '))
  await fill(red, "This device's name", 'Red')
  await click(red, 'Connect')
  await waitForText(red, 'Progress from your other devices is here now too')
  const redHanoi = await readLocal(red, 'hanoi:progress')
  if (JSON.stringify(redHanoi?.completedLevels) !== '[1,2]') throw new Error(`Red is missing Blue's progress: ${JSON.stringify(redHanoi)}`)
  log("Red joined with the recovery code and received Blue's progress")

  await click(blue, 'Sync Now')
  await waitForText(blue, 'Synced.')
  const blueLights = await readLocal(blue, 'lightsout:progress')
  if (JSON.stringify(blueLights?.completedLevels) !== '[1]') throw new Error(`Blue is missing Red's progress: ${JSON.stringify(blueLights)}`)
  log("Blue received Red's pre-existing progress (merged, not replaced)")

  // Capture the pairing token as it arrives, to rebuild the payload for Green.
  await evaluate(blue, `(() => {
    const real = window.fetch
    window.fetch = async (...args) => {
      const res = await real(...args)
      if (String(args[0]).endsWith('/v1/pairing-tokens') && args[1]?.method === 'POST') res.clone().json().then((b) => { window.__pairingToken = b.token })
      return res
    } })()`)
  await click(blue, 'Add Device')
  await waitForText(blue, 'Expires in')
  await shot(blue, '03-add-device-qr.png')
  const payload = await evaluate(blue, `'BRAINPAIR1.' + window.__pairingToken + '.' +
    btoa(${JSON.stringify(SYNC_URL)}).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '')`)
  const scanned = await evaluate(blue, `(async () => {
    const svg = document.querySelector('svg.qr').cloneNode(true)
    svg.setAttribute('width', '400'); svg.setAttribute('height', '400')
    const img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg))
    await img.decode()
    const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 400
    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, 400, 400)
    const mod = await import('/assets/${jsqrChunk}')
    const ns = mod.default ?? Object.values(mod)[0]
    const jsQR = typeof ns === 'function' ? ns : ns.default
    return jsQR(ctx.getImageData(0, 0, 400, 400).data, 400, 400)?.data ?? null })()`)
  if (scanned !== payload) throw new Error('the on-screen QR does not decode to the pairing payload')
  log('the QR as rendered on screen decodes to the exact pairing payload')

  await open(green)
  await click(green, 'Brain Sync')
  await click(green, 'Paste pairing code')
  await fill(green, 'Pairing code', payload)
  await fill(green, "This device's name", 'Green')
  await click(green, 'Connect')
  await waitForText(green, 'Progress from your other devices is here now too')
  await waitForText(blue, 'is now connected', 8000)
  log('Green paired with the pairing code; Blue saw it join')
  await click(blue, 'Done')
  await waitForText(blue, 'Last seen')
  const names = await evaluate(blue, `[...document.querySelectorAll('.device-name')].map((n) => n.innerText).join(',')`)
  if (names !== 'Blue,Red,Green') throw new Error(`expected devices Blue,Red,Green, got ${names}`)
  await shot(blue, '04-devices.png')
  log('Blue lists devices Blue, Red, Green')

  await open(green)
  await waitForText(green, 'Synced')
  await shot(green, '05-landing-synced.png')
  log('landing shows "☁ Synced"')
}

async function serverGoesDown(syncServer) {
  const solo = await newDevice('Solo')
  await open(solo)
  await click(solo, 'Brain Sync')
  await click(solo, 'Enable Brain Sync')
  await acknowledgeRecoveryCode(solo)
  await waitForText(solo, 'Synced')

  syncServer.kill()
  await new Promise((r) => syncServer.once('exit', r))
  log('sync server stopped')

  await click(solo, 'Sync Now')
  await waitForText(solo, "Couldn't reach Brain Sync. Your progress is safe on this device.")
  await waitForText(solo, 'Sync unavailable')
  await click(solo, 'Back to Menu')
  await waitForText(solo, 'Progress is safe on this device')
  await shot(solo, '06-server-down.png')
  log('server down: "Sync unavailable · Progress is safe on this device", nothing blocked')
}

// ---- run ------------------------------------------------------------------

let failed = false
try {
  const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', join(work, 'dist'), '--emptyOutDir'], {
    cwd: ROOT, env: { ...process.env, VITE_BRAIN_SYNC_URL: SYNC_URL }, encoding: 'utf8',
  })
  if (build.status !== 0) throw new Error(`build failed:\n${build.stderr}`)
  const jsqrChunk = readdirSync(join(work, 'dist', 'assets')).find((f) => /^jsQR-.*\.js$/.test(f))

  const syncServer = start('sync', process.execPath, ['server/index.js'], {
    BRAIN_SYNC_DB: join(work, 'sync.sqlite'), BRAIN_SYNC_PORT: String(SYNC_PORT),
    BRAIN_SYNC_REQUIRE_HTTPS: '0', BRAIN_SYNC_ALLOWED_ORIGINS: APP.slice(0, -1),
  })
  start('preview', process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', join(work, 'dist'), '--host', '127.0.0.1', '--port', String(APP_PORT), '--strictPort'])
  const profile = join(work, 'firefox-profile')
  mkdirSync(profile)
  start('firefox', FIREFOX, ['--headless', '--no-remote', '--profile', profile, '--remote-debugging-port', String(BIDI_PORT)])

  await waitFor(async () => (await fetch(`${SYNC_URL}/v1/health`)).ok, 'sync server')
  await waitFor(async () => (await fetch(APP)).ok, 'app preview')
  await connectBidi()

  await threeDevices(jsqrChunk)
  await serverGoesDown(syncServer)
  console.log('\nBrain Sync UI end-to-end: all checks passed.')
} catch (error) {
  failed = true
  console.error(`\nFAILED: ${error.message}`)
} finally {
  if (ws) await send('session.end').catch(() => {})
  ws?.close()
  teardown()
}
process.exit(failed ? 1 : 0)
