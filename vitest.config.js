import { defineConfig } from 'vitest/config'

// Deliberately separate from vite.config.js: everything tested so far is
// pure game-logic (no component mounting), so there's no need to load the
// Vue or PWA plugins for the test run.
export default defineConfig({
  define: {
    // Matches vite.config.js's define — dataPortability.js references this.
    __APP_VERSION__: JSON.stringify('test'),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
