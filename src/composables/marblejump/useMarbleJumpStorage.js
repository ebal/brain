const KEY = 'marblejump:active'

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

export function useMarbleJumpStorage() {
  return { getActive: read, saveActive: write, clearActive: clear }
}
