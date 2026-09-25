// The small reactive sync status shown on the landing screen and the Brain
// Sync screen (BRAIN-SYNC-SPEC §41). Main-bundle safe: it only reads the
// outbox bookkeeping, never the merge engine or the network.
//
// The wording never implies that a cloud problem means lost progress —
// every non-synced state says where the progress is: on this device.

import { ref } from 'vue'
import { getSyncStatus } from './outbox.js'
import { onDurableWrite } from '../persistence/durableWrite.js'

export const syncStatus = ref({ state: 'local-only', pending: 0 })

function isOnline(nav = globalThis.navigator) {
  return nav?.onLine !== false
}

export function refreshSyncStatus(nav) {
  try {
    syncStatus.value = getSyncStatus({ online: isOnline(nav) })
  } catch {
    // storage unreadable — keep the last known status
  }
  return syncStatus.value
}

// { icon, text, detail, tone } for a status. `tone` is purely cosmetic.
export function describeSyncStatus({ state, pending = 0 } = {}) {
  const changes = `${pending} change${pending === 1 ? '' : 's'}`
  switch (state) {
    case 'synced':
      return { icon: '☁', text: 'Synced', detail: null, tone: 'ok' }
    case 'pending':
      return {
        icon: '☁',
        text: pending > 0 ? `${changes} waiting to sync` : 'Waiting to sync',
        detail: null,
        tone: 'neutral',
      }
    case 'offline':
      return { icon: '✈', text: 'Offline', detail: pending > 0 ? `Progress saved locally · ${changes} to sync` : 'Progress saved locally', tone: 'neutral' }
    case 'unavailable':
      return { icon: '⚠', text: 'Sync unavailable', detail: 'Progress is safe on this device', tone: 'warn' }
    case 'needs-pairing':
      return { icon: '⚠', text: 'Sync paused', detail: 'Progress is safe on this device · reconnect in Brain Sync', tone: 'warn' }
    default:
      return { icon: '', text: 'Progress stored on this device', detail: null, tone: 'neutral' }
  }
}

let installed = false

// Keeps syncStatus current: after every durable write (pending count), on
// connectivity changes, and when the app returns to the foreground. The
// sync runtime also refreshes it after every exchange.
export function installSyncStatus({ win = globalThis.window, doc = globalThis.document, nav = globalThis.navigator } = {}) {
  refreshSyncStatus(nav)
  if (installed) return
  installed = true
  let scheduled = false
  const schedule = () => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      refreshSyncStatus(nav)
    })
  }
  onDurableWrite(schedule)
  win?.addEventListener?.('online', schedule)
  win?.addEventListener?.('offline', schedule)
  doc?.addEventListener?.('visibilitychange', schedule)
}
