import { createActiveLevelStorage } from '../storage.js'

export function useEmojiMahjongStorage() {
  return createActiveLevelStorage('emojimahjong:active')
}
