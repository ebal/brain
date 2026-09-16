// Solver (SPEC §9, §17): given an arbitrary mid-game state (real emoji
// assignment, whatever the player has removed so far), finds a sequence of
// EMOJI-MATCHING free-pair removals that clears the rest of the board, if
// one exists. Unlike generator.js's findClearingOrder, pairs here must
// actually match — this is what powers Hint and "can this dead-end still
// be escaped via Undo" checks. Exhaustive DFS with memoization on the
// remaining-tile bitmask; a node budget keeps a pathological position from
// hanging the caller (Hint just becomes unavailable rather than the UI
// freezing — SPEC §17 only promises a hint "when the solver can establish
// that").
import { getAvailablePairs, getLayout } from './board.js'

export function solveBoard(state, { nodeBudget = 500000 } = {}) {
  const n = getLayout(state.layoutId).slots.length
  let presentMask = 0n
  for (let i = 0; i < n; i++) {
    if (!state.removed[i]) presentMask |= 1n << BigInt(i)
  }

  const unsolvable = new Set()
  let nodes = 0
  let timedOut = false

  function stateFromMask(mask) {
    const removed = new Array(n)
    for (let i = 0; i < n; i++) removed[i] = !((mask >> BigInt(i)) & 1n)
    return { layoutId: state.layoutId, removed, emoji: state.emoji }
  }

  function dfs(mask) {
    if (mask === 0n) return []
    if (unsolvable.has(mask)) return null
    nodes += 1
    if (nodes > nodeBudget) {
      timedOut = true
      return null
    }

    const pairs = getAvailablePairs(stateFromMask(mask))
    for (const [a, b] of pairs) {
      const newMask = mask & ~(1n << BigInt(a)) & ~(1n << BigInt(b))
      const rest = dfs(newMask)
      if (rest !== null) return [[a, b], ...rest]
      if (timedOut) return null
    }
    unsolvable.add(mask)
    return null
  }

  const solution = dfs(presentMask)
  return { solvable: solution !== null, solution: solution || [], timedOut }
}

// Level-SPEC §13/§32/§50: every currently-available pair that lies on AT
// LEAST ONE valid path to clearing the board — not just the single pair
// solveBoard() happens to return first. Hint only strictly needs one such
// pair (and keeps using solveBoard() directly for that, cheaper), but tests
// and future difficulty analysis want the full set. Reuses solveBoard()'s
// own memoized DFS per candidate pair, so cost is (available pairs) x
// (one solve), not a separate search algorithm.
export function getSolvableNextPairs(state) {
  const pairs = getAvailablePairs(state)
  const solvable = []
  for (const [a, b] of pairs) {
    const removed = state.removed.slice()
    removed[a] = true
    removed[b] = true
    const next = { ...state, removed }
    if (solveBoard(next).solvable) solvable.push([a, b])
  }
  return solvable
}
