// Stable per-installation Device ID (BRAIN-SYNC-SPEC §7) and the identity
// stamp every newly completed session carries (§19).
//
// The ID is random and created once per browser/PWA storage origin — never
// derived from hardware, fingerprinting or network identity. It lives under
// DEVICE_KEY, outside every game prefix, so it's never exported, never
// imported over, and survives Delete All Data (which deletes progress, not
// the installation's identity).

import { DEVICE_KEY } from '../../constants/storageKeys.js'
import { randomUUID } from './ids.js'

let cachedDeviceId = null

export function getDeviceId() {
  if (cachedDeviceId) return cachedDeviceId
  try {
    const stored = JSON.parse(localStorage.getItem(DEVICE_KEY))
    if (stored && typeof stored.deviceId === 'string') {
      cachedDeviceId = stored.deviceId
      return cachedDeviceId
    }
  } catch {
    // unreadable/corrupt — mint a new one below
  }
  const deviceId = randomUUID()
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify({ deviceId, createdAt: new Date().toISOString() }))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — nothing else
    // persists either, so an ID stable for this page load is enough
  }
  cachedDeviceId = deviceId
  return deviceId
}

// Spread into every new history entry alongside metricVersion/appVersion.
// `game` isn't included: it's already implied by the storage key the entry
// is written under, and SET's history entries already use a `gameId` field
// for its own per-deal identifier.
export function newSessionStamp() {
  return { sessionId: randomUUID(), deviceId: getDeviceId() }
}

// Test-only: forget the cached ID so a fresh fake localStorage is re-read.
export function _resetDeviceIdCache() {
  cachedDeviceId = null
}
