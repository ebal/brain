// Bridges vite-plugin-pwa's registerSW() callback API (wired up in main.js,
// outside any Vue component) to a small piece of reactive state a Vue
// component can show a banner from. Kept here rather than inline in
// App.vue since App.vue is already the app's largest file and this has
// nothing to do with game routing.
//
// registerType is 'prompt' (vite.config.js), not 'autoUpdate' — a new
// service worker installs but waits, rather than self-activating and
// taking over immediately. With 'autoUpdate', an already-open tab that's
// mid-session can have the new SW's precache evict the OLD build's hashed
// chunk files out from under it, so a lazy `import()` for a game screen
// that tab hasn't visited yet fails outright (the exact file it's asking
// for no longer exists in cache or on the server). Waiting for an explicit
// reload means everything currently running keeps using the build it
// already loaded until the user chooses to pick up the new one.
import { ref } from 'vue'

export const updateAvailable = ref(false)

let applyUpdateFn = null

export function setUpdateHandler(fn) {
  applyUpdateFn = fn
}

export function applyUpdate() {
  if (applyUpdateFn) applyUpdateFn(true)
}
