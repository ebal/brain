import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'))

// The app calls the Brain Sync API on its own origin (/v1, see
// composables/sync/config.js), so the dev and preview servers forward /v1 to
// the sync server: whatever host or LAN IP the app is opened on, sync works
// with no configuration and no CORS. docker-compose points this at its
// brain-sync service; `npm run sync-server` listens on the default.
const syncProxy = {
  '/v1': { target: process.env.BRAIN_SYNC_PROXY_TARGET || 'http://127.0.0.1:8787', xfwd: true },
}

export default defineConfig({
  // Never read .env files: the project's .env is docker-compose's (UID/GID
  // and optional overrides it passes in as real environment variables).
  // VITE_* variables from the actual environment still work.
  envDir: false,
  server: { proxy: syncProxy },
  preview: { proxy: syncProxy },
  define: {
    // Stamped into data exports (dataPortability.js) so an old export file
    // can be told apart from a newer one at a glance.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    vue(),
    VitePWA({
      // 'prompt', not 'autoUpdate' — a new build's service worker installs
      // and waits rather than self-activating immediately. autoUpdate risks
      // an already-open tab losing access to its OWN build's lazy chunk
      // files the moment the new SW's precache evicts them, if that tab
      // then navigates to a game screen it hasn't loaded yet. main.js's
      // onNeedRefresh + App.vue's update banner hand control of exactly
      // when to switch over to the user instead. See composables/pwaUpdate.js.
      registerType: 'prompt',
      injectRegister: false, // registered explicitly in main.js instead
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Brain',
        short_name: 'Brain',
        // Deliberately doesn't enumerate the current game catalog — the
        // manifest would go stale every time a game is added or removed
        // otherwise. See README.md for the actual game list.
        description: 'Offline cognitive games for attention, memory, reasoning and personal performance tracking.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#14151a',
        theme_color: '#14151a',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the whole built app shell — no runtime network dependency
        // exists for gameplay (verified: no fetch/XHR/CDN anywhere in src/),
        // so nothing beyond the build output needs a runtime caching strategy.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        // The QR decoder (~47 kB gzipped) is only needed to pair a device,
        // which needs the network anyway — so it isn't precached for every
        // player. It's fetched (and HTTP-cached) the first time the camera
        // scanner is opened on a browser without a native BarcodeDetector.
        globIgnores: ['**/jsQR-*.js'],
      },
    }),
  ],
})
