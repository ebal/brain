import { createActiveLevelStorage } from '../storage.js'

export function useFlagsStorage() {
  return createActiveLevelStorage('flagsoftheworld:active')
}
