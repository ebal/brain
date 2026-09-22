// Shared factory behind every game's useXStorage.js — the autosave for a
// single in-progress level/puzzle (SPEC "Pause/autosave"). Extracted after
// 9 games' storage.js files turned out to be byte-identical apart from the
// key string and the exported function's own name (several already said so
// in their own comments) — each game still keeps its own thin
// useXStorage.js file re-exporting this under its own name, so import
// paths and the per-game folder convention are untouched; only the
// implementation is shared now.
export function createActiveLevelStorage(key) {
  function read() {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  function write(state) {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // localStorage unavailable (private mode, quota, etc.) — silently skip persistence
    }
  }

  function clear() {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }

  return { getActive: read, saveActive: write, clearActive: clear }
}
