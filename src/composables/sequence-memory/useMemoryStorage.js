import { createActiveLevelStorage } from '../storage.js'

export function useMemoryStorage() {
  return createActiveLevelStorage('sequence-memory:active')
}
