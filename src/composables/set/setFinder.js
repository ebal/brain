import { isSet } from './setValidator.js'

// All valid SETs currently on the board, as index triples into `cards`.
// Internal only — SPEC §10 explicitly says not to expose this during normal
// play; it's used for no-SET-detection (board expansion) and hints.
export function findAllSets(cards) {
  const sets = []
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      for (let k = j + 1; k < cards.length; k++) {
        if (isSet(cards[i], cards[j], cards[k])) sets.push([i, j, k])
      }
    }
  }
  return sets
}
