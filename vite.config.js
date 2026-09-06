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
        name: 'Cognitive Test Suite',
        short_name: 'Cognitive Tests',
        description: 'Six offline-capable cognitive tests: Stroop Effect, Schulte Tables, Number N-Back, Sudoku, SET, and Sequence Memory.',
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
