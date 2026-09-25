// Test helper: a minimal in-memory localStorage, installed as the global.
// Data lives as plain enumerable own properties (so Object.keys(storage)
// sees exactly the stored keys, as with the real thing); the methods are
// non-enumerable. `failOn(key)` makes setItem throw for that key, to
// simulate a quota error part-way through a write sequence.
export function installFakeLocalStorage(initialEntries = {}) {
  const failing = new Set()
  const fake = { ...initialEntries }
  Object.defineProperties(fake, {
    getItem: { value: (k) => (Object.prototype.hasOwnProperty.call(fake, k) ? fake[k] : null) },
    setItem: {
      value: (k, v) => {
        if (failing.has(k)) throw new Error('QuotaExceededError')
        fake[k] = String(v)
      },
    },
    removeItem: { value: (k) => { delete fake[k] } },
    failOn: { value: (k) => failing.add(k) },
  })
  const original = globalThis.localStorage
  Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true, writable: true })
  const restore = () => Object.defineProperty(globalThis, 'localStorage', { value: original, configurable: true, writable: true })
  return { storage: fake, restore }
}

// A fixture's parsed `localStorage` section, serialized the way the browser
// actually stores it.
export function toRawEntries(parsed) {
  return Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, JSON.stringify(v)]))
}
