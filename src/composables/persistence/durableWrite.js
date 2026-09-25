// The single write path for durable progress (history, stats, bests,
// progress, learning state). Behaves exactly like the
// `localStorage.setItem(key, JSON.stringify(value))` it replaced in every
// game's stats/history module — including THROWING on failure, so each
// caller's existing try/catch still decides what a failed write means —
// and then tells any registered listener (the sync outbox) about the write
// in the same synchronous step, so "saved locally" and "queued for sync"
// can never drift apart (BRAIN-SYNC-SPEC §21).
//
// Listeners run only after the local write has succeeded, and a listener
// failing can never undo or fail the local save (§2.3).
//
// Device-local writes (in-progress autosaves via storage.js, UI flags)
// deliberately don't come through here.

const listeners = new Set()

export function onDurableWrite(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function persistJSON(key, value) {
  const previousRaw = listeners.size > 0 ? localStorage.getItem(key) : null
  localStorage.setItem(key, JSON.stringify(value))
  for (const listener of listeners) {
    try {
      listener(key, value, previousRaw)
    } catch (error) {
      console.warn('[storage] durable-write listener failed; local data is saved:', error?.message ?? error)
    }
  }
}
