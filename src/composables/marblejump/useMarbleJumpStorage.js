import { createActiveLevelStorage } from '../storage.js'

export function useMarbleJumpStorage() {
  return createActiveLevelStorage('marblejump:active')
}
