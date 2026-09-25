// Test helper: simulated Brain installations, each with its own persistent
// in-memory localStorage (see persistence/testStorage.js).
import { installFakeLocalStorage } from '../persistence/testStorage.js'
import { _resetDeviceIdCache } from '../persistence/device.js'
import { syncableData } from './mergeEngine.js'

// ---- simulated installations --------------------------------------------
// A device is a persistent in-memory localStorage; `use` makes it the
// global one for the duration of fn (sync or async). "Reloading" a device
// is a fresh storage object built from the same raw entries.

export function makeDevice(entries = {}) {
  const { storage, restore } = installFakeLocalStorage(entries)
  restore()
  return {
    storage,
    async use(fn) {
      const original = globalThis.localStorage
      Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true })
      _resetDeviceIdCache()
      try {
        return await fn()
      } finally {
        Object.defineProperty(globalThis, 'localStorage', { value: original, configurable: true, writable: true })
        _resetDeviceIdCache()
      }
    },
    reload() {
      return makeDevice(Object.fromEntries(Object.keys(storage).map((k) => [k, storage[k]])))
    },
    data() {
      const out = {}
      for (const key of Object.keys(storage)) out[key] = JSON.parse(storage[key])
      return syncableData(out)
    },
  }
}
