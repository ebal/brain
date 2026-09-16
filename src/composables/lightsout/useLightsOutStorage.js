// Autosave for the single in-progress level (SPEC "Pause/autosave") — same
// shape as hanoi/useHanoiStorage.js / marblejump/useMarbleJumpStorage.js.
const KEY = 'lightsout:active'

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

export function useLightsOutStorage() {
  return { getActive: read, saveActive: write, clearActive: clear }
}
