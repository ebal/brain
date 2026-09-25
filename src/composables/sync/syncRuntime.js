// Starts and stops automatic sync for this installation (§22, §61). Loaded
// lazily — only when sync is enabled on this device, or the Brain Sync
// screen is opened — so a local-only player never downloads the sync code.

import { startAutoSync } from './autoSync.js'
import { createHttpTransport, getStoredCredential } from './syncApi.js'
import { isSyncEnabled } from './outbox.js'
import { refreshSyncStatus } from './syncStatus.js'

let auto = null

export function startSyncRuntime({ transport = createHttpTransport(), ...env } = {}) {
  if (auto || !isSyncEnabled() || !getStoredCredential()) return false
  auto = startAutoSync({ transport, onResult: () => refreshSyncStatus(env.nav), ...env })
  return true
}

export function stopSyncRuntime() {
  auto?.stop()
  auto = null
  refreshSyncStatus()
}

export function isSyncRuntimeRunning() {
  return auto !== null
}

// "Sync Now" (§42). Starts the runtime first if sync was just enabled.
export async function syncNow(options) {
  if (!auto) startSyncRuntime(options)
  const result = auto ? await auto.syncNow() : { status: 'disabled' }
  refreshSyncStatus(options?.nav)
  return result
}
