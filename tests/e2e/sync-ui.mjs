// End-to-end Brain Sync UI test in a real browser (BRAIN-SYNC-SPEC §49-§53,
// §61). No test dependencies: headless Firefox driven over WebDriver BiDi
// with Node's built-in WebSocket.
//
//   npm run test:e2e-sync            (needs Firefox ≥ 129 on PATH, or FIREFOX=/path/to/firefox)
//   KEEP=1 npm run test:e2e-sync     keep the work dir (build, logs, screenshots)
//
// It makes the default build (sync on, calling /v1 on its own origin), serves
// it with `vite preview`, which forwards /v1 to a throwaway local sync server
// (no CORS, as in production), and runs installations as isolated browser user contexts
// (separate storage, like separate devices):
//   1. Blue (local progress) enables sync → recovery code shown once
//   2. Red (own progress) joins with the recovery code, typo caught locally
//   3. Both converge; Blue shows a QR that decodes to the real payload
//   4. Green joins with the pairing code; Blue sees it arrive
//   5. The sync server goes down: "Sync unavailable · Progress is safe…"

import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHarness, log, sleep } from './harness.mjs'

const SYNC_PORT = Number(process.env.E2E_SYNC_PORT || 18790)
const APP_PORT = Number(process.env.E2E_APP_PORT || 4179)
const BIDI_PORT = Number(process.env.E2E_BIDI_PORT || 9333)
const SYNC_URL = `http://127.0.0.1:${SYNC_PORT}`
// The default build: the app calls /v1 on its own origin, and the preview
// server forwards it to the sync server, exactly as in real use.
const APP_ORIGIN = `http://127.0.0.1:${APP_PORT}`
const APP = `http://127.0.0.1:${APP_PORT}/`

const h = createHarness('sync-ui')
const { evaluate, waitForText, click, fill, shot, readLocal } = h
const newDevice = (name) => h.newDevice(name)

async function open(device) {
  await h.navigate(device, APP)
  await waitForText(device, 'Choose a Game')
}

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
    btoa(${JSON.stringify(APP_ORIGIN)}).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '')`)
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

  await h.stop(syncServer)
  log('sync server stopped')

  await click(solo, 'Sync Now')
  await waitForText(solo, "Couldn't reach Brain Sync. Your progress is safe on this device.")
  await waitForText(solo, 'Sync unavailable')
  await click(solo, 'Back to Menu')
  await waitForText(solo, 'Progress is safe on this device')
  await shot(solo, '06-server-down.png')
  log('server down: "Sync unavailable · Progress is safe on this device", nothing blocked')
}

// ---- run ----------------------------------------------------------------

let failed = false
try {
  const dist = join(h.work, 'dist')
  h.build(dist) // default build: sync on, same-origin /v1
  const jsqrChunk = readdirSync(join(dist, 'assets')).find((f) => /^jsQR-.*\.js$/.test(f))
  const syncServer = h.start('sync', process.execPath, ['server/index.js'], {
    env: {
      BRAIN_SYNC_DB: join(h.work, 'sync.sqlite'), BRAIN_SYNC_PORT: String(SYNC_PORT),
      BRAIN_SYNC_REQUIRE_HTTPS: '0', BRAIN_SYNC_TRUST_PROXY: '1', // no CORS list: same origin
    },
  })
  h.preview('preview', dist, APP_PORT, { env: { BRAIN_SYNC_PROXY_TARGET: SYNC_URL } })
  await h.waitFor(async () => (await fetch(`${SYNC_URL}/v1/health`)).ok, 'sync server')
  await h.waitFor(async () => (await fetch(APP)).ok, 'app preview')
  await h.waitFor(async () => (await fetch(`${APP_ORIGIN}/v1/health`)).ok, 'sync API through the app\'s own origin')
  await h.startFirefox(BIDI_PORT)

  await threeDevices(jsqrChunk)
  await serverGoesDown(syncServer)
  console.log('\nBrain Sync UI end-to-end: all checks passed.')
} catch (error) {
  failed = true
  console.error(`\nFAILED: ${error.message}`)
} finally {
  await h.teardown()
}
process.exit(failed ? 1 : 0)
