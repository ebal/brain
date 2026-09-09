// SPEC §21's score formula. Only cleared boards receive a final score.
import { EMOJIMAHJONG_DIFFICULTIES } from '../../constants/emojimahjong/difficulties.js'

export function calculateEmojiMahjongScore({ difficultyKey, elapsedSeconds, mistakes, hints, undos }) {
  const config = Object.values(EMOJIMAHJONG_DIFFICULTIES).find((d) => d.key === difficultyKey)
  const base = config ? config.baseScore : 0
  const timePenalty = Math.floor(elapsedSeconds / 5) * 5
  const score = base - timePenalty - mistakes * 50 - hints * 250 - undos * 25
  return Math.max(0, score)
}
