import { buildBoard } from './board.js'

function popcount(bigMask) {
  let n = bigMask
  let count = 0
  while (n) {
    n &= n - 1n
    count++
  }
  return count
}

// Exhaustive memoized DFS over the jump-solitaire state space for one board,
// finding the minimum reachable marble count from `state` (and one optimal
// move sequence reaching it). Dev-time tool (SPEC §21): used by
// solver.test.js to verify every shipped puzzle's optimalRemaining, and to
// vet new candidate puzzles before they're added to
// constants/marblejump/puzzles.js. Not imported by any Vue component — v1
// ships precomputed, solver-verified puzzles rather than solving live
// in-browser.
//
// Bails out (timedOut: true) past timeLimitMs so a bad/huge board can't hang
// a test run; every puzzle actually shipped resolves in well under 100ms.
export function solvePuzzle(state, { timeLimitMs = 10000 } = {}) {
  const { total, moves } = buildBoard(state.n)

  let startMask = 0n
  for (let i = 0; i < total; i++) {
    if (state.occupied[i]) startMask |= 1n << BigInt(i)
  }

  const memo = new Map()
  const t0 = Date.now()
  let bestRemaining = popcount(startMask)
  let bestPath = []
  let timedOut = false

  function dfs(mask, path) {
    if (timedOut) return
    if (Date.now() - t0 > timeLimitMs) {
      timedOut = true
      return
    }

    const remaining = popcount(mask)
    if (remaining < bestRemaining) {
      bestRemaining = remaining
      bestPath = path.slice()
      if (bestRemaining === 1) return
    }

    const key = mask.toString(36)
    const bestSeenForMask = memo.get(key)
    if (bestSeenForMask !== undefined && bestSeenForMask <= remaining) return
    memo.set(key, remaining)

    for (const move of moves) {
      const startBit = 1n << BigInt(move.start)
      const jumpedBit = 1n << BigInt(move.jumped)
      const landingBit = 1n << BigInt(move.landing)
      if ((mask & startBit) && (mask & jumpedBit) && !(mask & landingBit)) {
        path.push(move)
        dfs((mask & ~startBit & ~jumpedBit) | landingBit, path)
        path.pop()
        if (bestRemaining === 1 || timedOut) return
      }
    }
  }

  dfs(startMask, [])
  return { optimalRemaining: bestRemaining, solution: bestPath, timedOut }
}
