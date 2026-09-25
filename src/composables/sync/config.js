// Which Brain Sync server this build talks to, fixed at build time:
//
//   VITE_BRAIN_SYNC_URL=https://sync.example.org npm run build
//
// Unset (the default) means this build has no sync at all: no status line,
// no Brain Sync screen, nothing ever touches the network — exactly the app
// as it was before sync existed.

export const SYNC_SERVER_URL = String(import.meta.env?.VITE_BRAIN_SYNC_URL ?? '').trim().replace(/\/+$/, '')

export function isSyncAvailable() {
  return SYNC_SERVER_URL !== ''
}
