// Pure Tower of Hanoi logic — no Vue dependency (SPEC "Architecture").
// A state is { pegs: [A, B, C] }, each peg an array of disk sizes from
// bottom to top (index 0 = bottom, last index = top). Disks are numbered
// 1..disks, 1 = smallest.
const PEG_A = 0
const PEG_B = 1
const PEG_C = 2

export function createHanoiState(disks) {
  return {
    pegs: [
      Array.from({ length: disks }, (_, i) => disks - i), // [disks, disks-1, ..., 1] — bottom to top
      [],
      [],
    ],
  }
}

export function getTopDisk(state, peg) {
  const stack = state.pegs[peg]
  return stack.length ? stack[stack.length - 1] : null
}

function pegOf(state, disk) {
  return state.pegs.findIndex((stack) => stack.includes(disk))
}

// A peg is a legal destination if it's empty, or its top disk is larger
// than the moving disk (SPEC "Core rules").
export function isLegalMove(state, from, to) {
  if (from === to) return false
  const movingDisk = getTopDisk(state, from)
  if (movingDisk === null) return false
  const destinationTop = getTopDisk(state, to)
  return destinationTop === null || destinationTop > movingDisk
}

// Does not itself check legality (SPEC lists isLegalMove/applyMove as
// separate functions) — callers check first. Returns a new state; never
// mutates the one passed in.
export function applyMove(state, from, to) {
  const pegs = state.pegs.map((stack) => [...stack])
  const disk = pegs[from].pop()
  pegs[to].push(disk)
  return { pegs }
}

// Deliberately checks the actual final ordering (largest at the bottom,
// smallest on top) rather than just `pegs[C].length === disks` — true
// regardless of how the state was constructed, not only for states reached
// through legal play.
export function isSolved(state, disks) {
  const c = state.pegs[PEG_C]
  if (c.length !== disks) return false
  for (let i = 0; i < disks; i++) {
    if (c[i] !== disks - i) return false
  }
  return true
}

export function getOptimalMoveCount(disks) {
  return 2 ** disks - 1
}

// The deterministic optimal Hanoi strategy (SPEC "Architecture" —
// `getOptimalNextMove`, "no complex AI solver is needed"), generalized to
// work from ANY legal state, not just the canonical all-on-A start:
// recursively, the largest disk not yet on `goal` must wait for every
// smaller disk to clear off of both its own peg and `goal` onto the third
// peg first — so the sub-problem "get disks 1..n-1 out of the way" is
// itself the same kind of problem, solved by recursing with that third peg
// as the new goal. Returns null once every disk is already home.
export function getOptimalNextMove(state, disks, goal = PEG_C) {
  return findNextMove(state, disks, goal)
}

function findNextMove(state, n, goal) {
  if (n === 0) return null
  const cur = pegOf(state, n)
  if (cur === goal) return findNextMove(state, n - 1, goal)

  const other = [PEG_A, PEG_B, PEG_C].find((p) => p !== cur && p !== goal)
  let smallerDisksReady = true
  for (let d = 1; d < n; d++) {
    if (pegOf(state, d) !== other) {
      smallerDisksReady = false
      break
    }
  }
  if (smallerDisksReady) return { disk: n, from: cur, to: goal }
  return findNextMove(state, n - 1, other)
}

// SPEC: optimalMoves / actualMoves × 100, capped at 100%.
export function calculateEfficiency(optimalMoves, actualMoves) {
  if (actualMoves <= 0) return 0
  return Math.min(100, (optimalMoves / actualMoves) * 100)
}

// SPEC "Stars": ★★★ exact optimum (never with a hint used — "hint-assisted
// completion cannot earn clean 3 stars"), ★★☆ within ~115% of optimum
// (rounded), ★☆☆ any other completion.
export function calculateStars({ actualMoves, optimalMoves, hints }) {
  const isOptimal = actualMoves === optimalMoves
  const withinTwoStarBand = actualMoves <= Math.round(optimalMoves * 1.15)
  if (isOptimal && hints === 0) return 3
  if (isOptimal || withinTwoStarBand) return 2
  return 1
}
