import { createActiveLevelStorage } from '../storage.js'

export function useSetStorage() {
  return createActiveLevelStorage('set:active')
}
