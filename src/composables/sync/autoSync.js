// Automatic sync triggers (BRAIN-SYNC-SPEC §22): app launch while online,
// connectivity returning, the app coming back to the foreground, shortly
// after any durable local write (i.e. a game/level completion), a bounded-
// backoff retry after a failure, and an explicit Sync Now. Plain
// foreground events only — no reliance on the Background Sync API, which
// iOS Safari/PWAs don't support.
//
// Nothing here is started until a transport exists (Phase 4/5); the
// browser globals are injectable so tests can drive every trigger.

import { onDurableWrite } from '../persistence/durableWrite.js'
import { runSync } from './syncClient.js'
import { isSyncEnabled } from './outbox.js'

export const WRITE_DEBOUNCE_MS = 2000

export function startAutoSync({
  transport,
  win = globalThis.window,
  doc = globalThis.document,
  nav = globalThis.navigator,
  timers = { setTimeout: globalThis.setTimeout.bind(globalThis), clearTimeout: globalThis.clearTimeout.bind(globalThis) },
  onResult = () => {},
} = {}) {
  let retryTimer = null
  let debounceTimer = null
  let stopped = false

  const online = () => nav?.onLine !== false

  async function trigger() {
    if (stopped || !isSyncEnabled()) return null
    timers.clearTimeout(retryTimer)
    retryTimer = null
    const result = await runSync({ transport, online: online() })
    onResult(result)
    if (!stopped && result.status === 'failed' && result.retryInMs != null) {
      retryTimer = timers.setTimeout(trigger, result.retryInMs)
    }
    return result
  }

  const onOnline = () => trigger()
  const onVisibility = () => {
    if (doc?.visibilityState === 'visible') trigger()
  }
  const unsubscribeWrites = onDurableWrite(() => {
    timers.clearTimeout(debounceTimer)
    debounceTimer = timers.setTimeout(trigger, WRITE_DEBOUNCE_MS)
  })

  win?.addEventListener?.('online', onOnline)
  doc?.addEventListener?.('visibilitychange', onVisibility)
  if (online()) trigger()

  return {
    syncNow: trigger,
    stop() {
      stopped = true
      timers.clearTimeout(retryTimer)
      timers.clearTimeout(debounceTimer)
      unsubscribeWrites()
      win?.removeEventListener?.('online', onOnline)
      doc?.removeEventListener?.('visibilitychange', onVisibility)
    },
  }
}
