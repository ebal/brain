import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import { updateAvailable, setUpdateHandler } from './composables/pwaUpdate.js'
import { runStorageMigrations } from './composables/persistence/migrations.js'
import { getDeviceId } from './composables/persistence/device.js'

// Synchronous and before mount, so every screen reads already-upgraded data
// and no gameplay write can interleave with a migration. It never throws
// and never blocks launch: on any failure the existing data is left as-is
// (see persistence/migrations.js).
const migration = runStorageMigrations({ appVersion: __APP_VERSION__ })
if (migration.status === 'migrated') console.log('[storage] migrated to schema', migration.toVersion, migration)
getDeviceId()

createApp(App).mount('#app')

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
