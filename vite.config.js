import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered explicitly in main.js instead
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Cognitive Test Suite',
        short_name: 'Cognitive Tests',
        description: 'Stroop Effect Test, Schulte Tables, and Number N-Back — offline-capable.',
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
