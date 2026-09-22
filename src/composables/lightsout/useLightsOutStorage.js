import { createActiveLevelStorage } from '../storage.js'

export function useLightsOutStorage() {
  return createActiveLevelStorage('lightsout:active')
}
