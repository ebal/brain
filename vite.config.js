import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'))

export default defineConfig({
  define: {
    // Stamped into data exports (dataPortability.js) so an old export file
    // can be told apart from a newer one at a glance.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
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
      },
    }),
  ],
})
