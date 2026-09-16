// Autosave for the single in-progress level (SPEC "Pause/autosave") — same
// shape as marblejump/useMarbleJumpStorage.js: one JSON blob, one key. Only
// one level can ever be "active" at a time, matching every other resumable
// game in the project.
const KEY = 'hanoi:active'

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — silently skip persistence
  }
}

function clear() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

export function useHanoiStorage() {
  return { getActive: read, saveActive: write, clearActive: clear }
}
