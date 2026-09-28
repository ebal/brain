// Release-upgrade and offline-flight test in a real browser
// (BRAIN-SYNC-SPEC §17, §49, §52, §66, §67). Headless Firefox over
// WebDriver BiDi; no test dependencies.
//
//   npm run test:e2e-release     (needs Firefox ≥ 129; KEEP=1 keeps logs/screenshots)
//
// 1. Release upgrade: the last pre-sync release (v1.1.1) is built
//    and served; a real game is played on it. Then THIS build is deployed
//    to the same origin. The installed service worker keeps serving the old
//    app until the player accepts the update banner, and the new app must
//    then migrate that data in place, losing nothing.
// 2. Offline flight: with the app server AND the sync server gone, the app
//    cold-starts from the PWA cache, a level is played and completed, the
//    result survives a reload, and once the network is back the pending
//    progress syncs by itself and reaches a second, freshly paired device.
//
// This automates everything in §52 that software can reach. The physical
// part (Airplane Mode on a real phone, device reboot) is in
// specs/BRAIN-SYNC-ACCEPTANCE.md.

import { execSync } from 'node:child_process'
import { mkdirSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { createHarness, playHanoiLevel1, log, ROOT } from './harness.mjs'

// The last release before sync: the parent of the commit that introduced
// storage migrations (v1.1.1, storage schema v1). Found from history rather
// than by a hard-coded commit ID, so it survives history rewrites.
const firstMigrationsCommit = () => execSync('git rev-list --reverse HEAD -- src/composables/persistence/migrations.js', { cwd: ROOT, encoding: 'utf8' }).split('\n')[0]
const OLD_RELEASE = process.env.E2E_OLD_RELEASE || `${firstMigrationsCommit()}^`
const SYNC_PORT = Number(process.env.E2E_SYNC_PORT || 18791)
const APP_PORT = Number(process.env.E2E_APP_PORT || 4181)
const BIDI_PORT = Number(process.env.E2E_BIDI_PORT || 9335)
const SYNC_URL = `http://127.0.0.1:${SYNC_PORT}`
const APP = `http://127.0.0.1:${APP_PORT}/`

const h = createHarness('release-offline')
const { evaluate, waitForText, click, shot, readLocal } = h

async function openApp(device) {
  await h.navigate(device, APP)
  await waitForText(device, 'Choose a Game', 15000)
}

const outboxSize = (device) => evaluate(device, `Object.keys(localStorage).filter((k) => k.startsWith('brain:sync:op:')).length`)
const swControlled = (device) => evaluate(device, `!!navigator.serviceWorker?.controller`)

let failed = false
try {
  // ---- builds ---------------------------------------------------------------
  const oldSrc = join(h.work, 'old-release')
  mkdirSync(oldSrc)
  execSync(`git archive ${OLD_RELEASE} | tar -x -C "${oldSrc}"`, { cwd: ROOT })
  symlinkSync(join(ROOT, 'node_modules'), join(oldSrc, 'node_modules'))
  h.build(join(h.work, 'old-dist'), { cwd: oldSrc })
  h.build(join(h.work, 'new-dist'), { env: { VITE_BRAIN_SYNC_URL: SYNC_URL } })
  log(`built release ${OLD_RELEASE} and this build`)

  const syncEnv = {
    BRAIN_SYNC_DB: join(h.work, 'sync.sqlite'), BRAIN_SYNC_PORT: String(SYNC_PORT),
    BRAIN_SYNC_REQUIRE_HTTPS: '0', BRAIN_SYNC_ALLOWED_ORIGINS: APP.slice(0, -1),
  }
  let syncServer = h.start('sync', process.execPath, ['server/index.js'], { env: syncEnv })
  let app = h.preview('preview-old', join(h.work, 'old-dist'), APP_PORT, { cwd: oldSrc })
  await h.waitFor(async () => (await fetch(APP)).ok, 'old release preview')
  await h.waitFor(async () => (await fetch(`${SYNC_URL}/v1/health`)).ok, 'sync server')
  await h.startFirefox(BIDI_PORT)
  const phone = await h.newDevice('Phone')

  // ---- 1. play on the old release ----------------------------------------------
  await openApp(phone)
  await h.waitFor(() => evaluate(phone, `navigator.serviceWorker.ready.then(() => true)`), 'old service worker')
  await openApp(phone) // now controlled by the old release's service worker
  if (!(await swControlled(phone))) throw new Error('old release service worker is not controlling the page')
  await playHanoiLevel1(h, phone)
  const legacy = await readLocal(phone, 'hanoi:history:1')
  if (legacy?.length !== 1 || legacy[0].sessionId || (await readLocal(phone, 'brain:meta')) !== null) {
    throw new Error(`unexpected data from the old release: ${JSON.stringify(legacy)}`)
  }
  await shot(phone, '01-old-release-level-complete.png')
  log('played Hanoi level 1 on the old release (schema v1 data: no sessionId, no brain:meta)')

  // ---- deploy this build to the same origin -------------------------------------
  await h.stop(app)
  app = h.preview('preview-new', join(h.work, 'new-dist'), APP_PORT)
  await h.waitFor(async () => (await fetch(APP)).ok, 'new build preview')
  await openApp(phone)
  if (await evaluate(phone, `document.body.innerText.includes('Progress stored on this device')`)) {
    throw new Error('the new build took over without the update prompt')
  }
  await waitForText(phone, 'A new version is available', 30000)
  await shot(phone, '02-update-banner.png')
  log('the installed service worker kept the old app running and offered the update')
  await click(phone, 'Reload to update')
  await waitForText(phone, 'Progress stored on this device', 20000) // only the new build has this line

  const meta = await readLocal(phone, 'brain:meta')
  const migrated = await readLocal(phone, 'hanoi:history:1')
  const progress = await readLocal(phone, 'hanoi:progress')
  if (meta?.schemaVersion !== 2) throw new Error(`storage not migrated: ${JSON.stringify(meta)}`)
  const { sessionId, ...rest } = migrated[0]
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-8/.test(sessionId ?? '') || JSON.stringify(rest) !== JSON.stringify(legacy[0])) {
    throw new Error(`migration changed or lost data: ${JSON.stringify(migrated)}`)
  }
  if (JSON.stringify(progress.completedLevels) !== '[1]' || progress.highestUnlocked !== 2) throw new Error(`progress lost: ${JSON.stringify(progress)}`)
  if ((await readLocal(phone, 'brain:migration-backup')) !== null) throw new Error('migration backup left behind')
  await shot(phone, '03-upgraded.png')
  log('upgraded: schema 2, legacy session kept byte-for-byte plus a deterministic sessionId, level 2 still unlocked')

  // ---- enable sync on the upgraded install -------------------------------------
  await click(phone, 'Enable Sync')
  await click(phone, 'Enable Brain Sync')
  await waitForText(phone, 'Your recovery code')
  const recoveryCode = await evaluate(phone, `document.querySelector('.recovery-code').innerText.replace(/\\s+/g, '')`)
  await evaluate(phone, `document.querySelector('.check-label input').click()`)
  await click(phone, 'Done')
  await waitForText(phone, 'Synced', 15000)
  log('sync enabled; the pre-upgrade session was uploaded')

  // ---- 2. offline flight ----------------------------------------------------------
  await h.stop(app)
  await h.stop(syncServer)
  let emulated = false
  try {
    await h.send('emulation.setNetworkConditions', { networkConditions: { type: 'offline' }, userContexts: [phone.userContext] })
    emulated = true
  } catch {
    // older Firefox: the servers being gone is the offline condition
  }
  log(`network gone (servers stopped${emulated ? ', browser offline emulation on' : ''})`)

  await openApp(phone) // cold start with nothing reachable: served by the service worker alone
  await shot(phone, '04-offline-cold-start.png')
  log('cold-started from the PWA cache with no network')
  await h.navigate(phone, APP)
  await waitForText(phone, 'Choose a Game')
  await playHanoiLevel1(h, phone)
  await shot(phone, '05-offline-level-complete.png')
  const offlineHistory = await readLocal(phone, 'hanoi:history:1')
  if (offlineHistory.length !== 2) throw new Error('offline completion was not saved')
  if ((await outboxSize(phone)) === 0) throw new Error('offline completion was not queued for sync')
  log('played and completed a level offline: Results shown, saved locally, queued for sync')

  await openApp(phone) // close/reopen while still offline
  if ((await readLocal(phone, 'hanoi:history:1')).length !== 2 || (await outboxSize(phone)) === 0) {
    throw new Error('progress or queue lost across an offline reload')
  }
  await waitForText(phone, emulated ? 'Offline' : 'Sync unavailable', 15000)
  await shot(phone, '06-offline-reopened.png')
  log('reopened offline: progress and queue intact, status says so')

  // ---- connectivity returns ---------------------------------------------------------
  if (emulated) await h.send('emulation.setNetworkConditions', { networkConditions: null, userContexts: [phone.userContext] })
  syncServer = h.start('sync-2', process.execPath, ['server/index.js'], { env: syncEnv })
  app = h.preview('preview-new-2', join(h.work, 'new-dist'), APP_PORT)
  await h.waitFor(async () => (await fetch(`${SYNC_URL}/v1/health`)).ok, 'sync server back')
  await h.waitFor(async () => (await fetch(APP)).ok, 'app server back')
  await openApp(phone) // foreground/launch while online: automatic sync, no button pressed
  await h.waitFor(async () => (await outboxSize(phone)) === 0, 'the queue to drain automatically', 30000)
  await waitForText(phone, 'Synced', 15000)
  await shot(phone, '07-reconnected-synced.png')
  log('connectivity back: the offline progress synced automatically')

  // ---- another paired device receives it ------------------------------------------------
  const tablet = await h.newDevice('Tablet')
  await openApp(tablet)
  await click(tablet, 'Brain Sync')
  await click(tablet, 'Use recovery code')
  await h.fill(tablet, 'Recovery code', recoveryCode)
  await click(tablet, 'Connect')
  await waitForText(tablet, 'Progress from your other devices is here now too', 15000)
  const tabletHistory = await readLocal(tablet, 'hanoi:history:1')
  const phoneHistory = await readLocal(phone, 'hanoi:history:1')
  if (JSON.stringify(tabletHistory.map((e) => e.sessionId).sort()) !== JSON.stringify(phoneHistory.map((e) => e.sessionId).sort())) {
    throw new Error('the other device did not receive every session')
  }
  const tabletStats = await readLocal(tablet, 'hanoi:stats:1')
  if (tabletStats.completed !== 2) throw new Error(`expected 2 completions on the other device, got ${tabletStats.completed}`)
  log('a second paired device received both sessions (pre-upgrade + offline) and the right completion count')

  const db = new DatabaseSync(join(h.work, 'sync.sqlite'))
  const rows = db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE storage_key = 'hanoi:history:1'").get().n
  db.close()
  if (rows !== 2) throw new Error(`server holds ${rows} Hanoi sessions, expected 2`)
  console.log('\nRelease upgrade + offline flight end-to-end: all checks passed.')
} catch (error) {
  failed = true
  console.error(`\nFAILED: ${error.message}`)
} finally {
  await h.teardown()
}
process.exit(failed ? 1 : 0)
