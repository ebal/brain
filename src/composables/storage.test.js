import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createActiveLevelStorage } from './storage.js'

// Minimal in-memory localStorage — this environment's built-in global
// localStorage no-ops without a --localstorage-file flag, so every method
// silently hits its try/catch fallback without one installed.
function installFakeLocalStorage() {
  const fake = {}
  Object.defineProperties(fake, {
    getItem: { value: (k) => (k in fake ? fake[k] : null) },
    setItem: { value: (k, v) => { fake[k] = v } },
    removeItem: { value: (k) => { delete fake[k] } },
  })
  return fake
}

describe('createActiveLevelStorage', () => {
  let restore

  beforeEach(() => {
    const fake = installFakeLocalStorage()
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true, writable: true })
    restore = () => Object.defineProperty(globalThis, 'localStorage', { value: original, configurable: true, writable: true })
  })

  afterEach(() => restore())

  it('getActive returns null when nothing has been saved', () => {
    const storage = createActiveLevelStorage('hanoi:active')
    expect(storage.getActive()).toBeNull()
  })

  it('saveActive then getActive round-trips the exact object', () => {
    const storage = createActiveLevelStorage('hanoi:active')
    const state = { level: 3, cells: [1, 0, 1] }
    storage.saveActive(state)
    expect(storage.getActive()).toEqual(state)
  })

  it('clearActive removes the saved state', () => {
    const storage = createActiveLevelStorage('hanoi:active')
    storage.saveActive({ level: 1 })
    storage.clearActive()
    expect(storage.getActive()).toBeNull()
  })

  it('two different keys never collide with each other', () => {
    const a = createActiveLevelStorage('hanoi:active')
    const b = createActiveLevelStorage('lightsout:active')
    a.saveActive({ game: 'hanoi' })
    b.saveActive({ game: 'lightsout' })
    expect(a.getActive()).toEqual({ game: 'hanoi' })
    expect(b.getActive()).toEqual({ game: 'lightsout' })
  })

  it('getActive returns null (not throws) on corrupt stored JSON', () => {
    localStorage.setItem('hanoi:active', '{not valid json')
    const storage = createActiveLevelStorage('hanoi:active')
    expect(storage.getActive()).toBeNull()
  })
})
