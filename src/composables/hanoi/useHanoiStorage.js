import { createActiveLevelStorage } from '../storage.js'

export function useHanoiStorage() {
  return createActiveLevelStorage('hanoi:active')
}
