import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')

// Registered explicitly (rather than auto-injected) so registration success
// is visible in the console — useful for verifying offline support actually
// took effect. Only present in the production build (`npm run build`); the
// dev server intentionally serves the app without a Service Worker.
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({
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
      })
    })
    .catch(() => {
      // virtual:pwa-register only exists in a vite-plugin-pwa build (e.g. a
      // production build/preview) — harmless no-op under `vite dev`.
    })
}
