// SPEC §19's score formula. Score is secondary and only shown on Results.
import { NUMBERMATCH_DIFFICULTIES } from '../../constants/numbermatch/difficulties.js'

export function calculateNumberMatchScore({
  difficultyKey,
  pairsRemoved,
  mistakes,
  hints,
  addNumbersUsed,
  undos,
  elapsedSeconds,
  cleared,
}) {
  const config = Object.values(NUMBERMATCH_DIFFICULTIES).find((d) => d.key === difficultyKey)
  const base = config ? config.baseScore : 0
  const timePenalty = Math.floor(elapsedSeconds / 10) * 5

  let score =
    base +
    pairsRemoved * 50 -
    mistakes * 50 -
    hints * 150 -
    addNumbersUsed * 200 -
    undos * 25 -
    timePenalty

  if (cleared) score += config ? config.clearBonus : 0

  return Math.max(0, score)
}
