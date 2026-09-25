// Shared plumbing for the real-browser end-to-end tests: child processes
// (builds, servers, Firefox) and a minimal WebDriver BiDi client using
// Node's built-in WebSocket. No test dependencies.

import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = fileURLToPath(new URL('../..', import.meta.url))
export const FIREFOX = process.env.FIREFOX || 'firefox'
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export const log = (...a) => console.log('•', ...a)

export function createHarness(name) {
  const work = mkdtempSync(join(tmpdir(), `brain-${name}-`))
  const shots = join(work, 'screenshots')
  mkdirSync(shots)
  const children = []
  let ws = null
  let nextId = 0
  const pending = new Map()

  function start(label, command, args, { env = {}, cwd = ROOT } = {}) {
    const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
    const out = []
    child.stdout.on('data', (d) => out.push(d))
    child.stderr.on('data', (d) => out.push(d))
    child.on('exit', () => writeFileSync(join(work, `${label}.log`), Buffer.concat(out)))
    children.push(child)
    return child
  }

  async function stop(child) {
    if (child.exitCode !== null || child.signalCode !== null) return
    const exited = new Promise((r) => child.once('exit', r))
    child.kill()
    await exited
  }

  function build(outDir, { env = {}, cwd = ROOT } = {}) {
    const result = spawnSync(process.execPath, [join(cwd, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', outDir, '--emptyOutDir'], { cwd, env: { ...process.env, ...env }, encoding: 'utf8' })
    if (result.status !== 0) throw new Error(`build failed in ${cwd}:\n${result.stderr}${result.stdout}`)
  }

  function preview(label, distDir, port, { cwd = ROOT } = {}) {
    return start(label, process.execPath, [join(cwd, 'node_modules/vite/bin/vite.js'), 'preview', '--outDir', distDir, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd })
  }

  async function waitFor(check, what, timeout = 20000) {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      try {
        if (await check()) return
      } catch {
        // not ready yet
      }
      await sleep(200)
    }
    throw new Error(`timed out waiting for ${what}`)
  }

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })

  async function startFirefox(port) {
    const profile = join(work, 'firefox-profile')
    mkdirSync(profile)
    start('firefox', FIREFOX, ['--headless', '--no-remote', '--profile', profile, '--remote-debugging-port', String(port)])
    await waitFor(() => new Promise((resolve) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}/session`)
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

  async function newDevice(label) {
    const { userContext } = await send('browser.createUserContext')
    const { context } = await send('browsingContext.create', { type: 'tab', userContext })
    await send('browsingContext.setViewport', { context, viewport: { width: 390, height: 844 } })
    return { name: label, context, userContext }
  }

  async function evaluate(device, expression) {
    const result = await send('script.evaluate', { expression, target: { context: device.context }, awaitPromise: true, resultOwnership: 'none' })
    if (result.type === 'exception') throw new Error(`${device.name}: ${result.exceptionDetails.text}`)
    return result.result?.value
  }

  async function waitForText(device, text, timeout = 10000) {
    const started = Date.now()
    while (Date.now() - started < timeout) {
      try {
        if (await evaluate(device, `document.body?.innerText.includes(${JSON.stringify(text)}) ?? false`)) return
      } catch {
        // mid-navigation
      }
      await sleep(150)
    }
    const page = await evaluate(device, 'document.body?.innerText ?? ""').catch(() => '(unavailable)')
    throw new Error(`${device.name}: timed out waiting for "${text}". Page says:\n${page}`)
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

  async function navigate(device, url) {
    await send('browsingContext.navigate', { context: device.context, url, wait: 'complete' })
  }

  async function reload(device) {
    await send('browsingContext.reload', { context: device.context, wait: 'complete' })
  }

  // A missing key comes back from BiDi as a null remote value (no `value`).
  const readLocal = async (device, key) => JSON.parse((await evaluate(device, `localStorage.getItem(${JSON.stringify(key)})`)) ?? 'null')

  async function teardown() {
    if (ws) {
      await send('session.end').catch(() => {})
      ws.close()
    }
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill()
    if (!process.env.KEEP) rmSync(work, { recursive: true, force: true })
    else console.log(`\nwork dir kept: ${work}`)
  }

  return { work, send, start, stop, build, preview, waitFor, startFirefox, newDevice, evaluate, waitForText, click, fill, shot, navigate, reload, readLocal, teardown }
}

// Plays Tower of Hanoi level 1 (3 disks) optimally through the real UI,
// from the landing screen to the Level Complete screen.
export async function playHanoiLevel1(h, device) {
  await h.click(device, 'Tower of Hanoi')
  await h.waitForText(device, 'Level 1')
  await h.evaluate(device, `[...document.querySelectorAll('.level-card')].find((b) => b.innerText.includes('Level 1')).click()`)
  await h.waitFor(() => h.evaluate(device, `document.querySelectorAll('.peg-column').length === 3`), 'Hanoi board')
  for (const [from, to] of [[0, 2], [0, 1], [2, 1], [0, 2], [1, 0], [1, 2], [0, 2]]) {
    await h.evaluate(device, `document.querySelectorAll('.peg-column')[${from}].click()`)
    await sleep(60)
    await h.evaluate(device, `document.querySelectorAll('.peg-column')[${to}].click()`)
    await sleep(60)
  }
  await h.waitForText(device, 'Level Complete')
}
