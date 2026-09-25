import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import { updateAvailable, setUpdateHandler } from './composables/pwaUpdate.js'
import { runStorageMigrations } from './composables/persistence/migrations.js'
import { getDeviceId } from './composables/persistence/device.js'
import { installOutbox, isSyncEnabled } from './composables/sync/outbox.js'
import { isSyncAvailable } from './composables/sync/config.js'
import { installSyncStatus } from './composables/sync/syncStatus.js'

// Synchronous and before mount, so every screen reads already-upgraded data
// and no gameplay write can interleave with a migration. It never throws
// and never blocks launch: on any failure the existing data is left as-is
// (see persistence/migrations.js).
const migration = runStorageMigrations({ appVersion: __APP_VERSION__ })
if (migration.status === 'migrated') console.log('[storage] migrated to schema', migration.toVersion, migration)
getDeviceId()
// Queues durable writes for sync — inert unless sync has been enabled.
installOutbox()
installSyncStatus()

createApp(App).mount('#app')

// Automatic sync (BRAIN-SYNC-SPEC §22) only for devices that enabled it, on
// builds that have a sync server. Loaded after mount and never awaited:
// launch, play and local saving never wait on it (§2, §38).
if (isSyncAvailable() && isSyncEnabled()) {
  import('./composables/sync/syncRuntime.js')
    .then(({ startSyncRuntime }) => startSyncRuntime())
    .catch(() => {
      // e.g. the chunk isn't cached yet while offline — sync starts next launch
    })
}

// Registered explicitly (rather than auto-injected) so registration success
// is visible in the console — useful for verifying offline support actually
// took effect. Only present in the production build (`npm run build`); the
// dev server intentionally serves the app without a Service Worker.
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      // registerType: 'prompt' (vite.config.js) — the new SW installs but
      // waits for this reloadPage=true call rather than self-activating, so
      // an already-open tab never has its already-loaded build's lazy
      // chunks evicted out from under it without warning (see
      // composables/pwaUpdate.js). onNeedRefresh fires once the new SW is
      // waiting; App.vue's update banner calls applyUpdate() from there.
      const updateSW = registerSW({
        immediate: true,
        onRegisteredSW(swUrl, registration) {
          console.log('[pwa] service worker registered:', swUrl, registration)
        },
        onRegisterError(error) {
          console.error('[pwa] service worker registration failed:', error)
        },
        onOfflineReady() {
          console.log('[pwa] app is ready to work offline')
        },
        onNeedRefresh() {
          console.log('[pwa] update available — waiting for the user to reload')
          updateAvailable.value = true
        },
      })
      setUpdateHandler(updateSW)
    })
    .catch(() => {
      // virtual:pwa-register only exists in a vite-plugin-pwa build (e.g. a
      // production build/preview) — harmless no-op under `vite dev`.
    })
}
