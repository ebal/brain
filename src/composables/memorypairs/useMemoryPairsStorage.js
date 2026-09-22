import { createActiveLevelStorage } from '../storage.js'

export function useMemoryPairsStorage() {
  return createActiveLevelStorage('memorypairs:active')
}
