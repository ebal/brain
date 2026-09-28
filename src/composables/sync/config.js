// Which Brain Sync server this build talks to, chosen at build time with
// VITE_BRAIN_SYNC_URL:
//
//   (unset) / same-origin   the sync API on the app's own address (/v1),
//                           whatever host or LAN IP the page was opened on.
//                           The default: the dev server (vite.config.js) and
//                           the production reverse proxy forward /v1 to the
//                           sync server, so no per-network configuration.
//   https://sync.example    a sync server on another origin (needs CORS:
//                           BRAIN_SYNC_ALLOWED_ORIGINS on the server).
//   off                     no sync at all: no status line, no Brain Sync
//                           screen, nothing ever touches the network.

export function resolveSyncServerUrl(value, origin) {
  const setting = String(value ?? '').trim()
  if (/^(off|false|0|no|none|disabled)$/i.test(setting)) return ''
  if (setting === '' || setting === 'same-origin') {
    return origin && origin !== 'null' ? origin.replace(/\/+$/, '') : ''
  }
  return setting.replace(/\/+$/, '')
}

export const SYNC_SERVER_URL = resolveSyncServerUrl(import.meta.env?.VITE_BRAIN_SYNC_URL, globalThis.location?.origin)

export function isSyncAvailable() {
  return SYNC_SERVER_URL !== ''
}
