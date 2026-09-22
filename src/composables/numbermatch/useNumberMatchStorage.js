import { createActiveLevelStorage } from '../storage.js'

export function useNumberMatchStorage() {
  return createActiveLevelStorage('numbermatch:active')
}
