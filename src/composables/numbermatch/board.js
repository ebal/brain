// Pure board/matching logic — no Vue, no storage.
//
// A game state is `{ cols, cells }`: `cells` is a flat, row-major array of
// length `rows * cols` (rows derived as cells.length / cols). A cell holds
// a digit 1-9, or `null` for an empty (removed) cell. Removed cells are
// never spliced out — positions stay stable for the life of the board, so
// every index keeps its meaning.
//
// v2: any two matching numbers anywhere on the board can be removed — no
// adjacency/path requirement. The original spec required a connected path
// (row/column/diagonal/reading-order), matching-style-puzzle rules
// borrowed loosely from Mahjong Solitaire. User feedback after playing:
// that felt arbitrary and confusing ("6+4 blocked, but the same 6 with a
// different 4 works fine") for what's meant to be a simple, addictive
// "Make 10" game (https://artfulmath.com/make-10-game/), where position
// never matters — only the numbers do. See Number-Match-SPEC.md §34.

export function isNumericMatch(a, b) {
  return a === b || a + b === 10
}

export function isLegalPair(state, i, j) {
  if (i === j) return false
  const a = state.cells[i]
  const b = state.cells[j]
  if (a === null || b === null) return false
  return isNumericMatch(a, b)
}

// O(n^2) over occupied cells — boards stay small enough (even after several
// Add Numbers uses) that this is instant; only called on demand (Hint,
// stall detection), never on every render.
export function findLegalPairs(state) {
  const occupied = []
  for (let i = 0; i < state.cells.length; i++) {
    if (state.cells[i] !== null) occupied.push(i)
  }
  const pairs = []
  for (let a = 0; a < occupied.length; a++) {
    for (let b = a + 1; b < occupied.length; b++) {
      const i = occupied[a]
      const j = occupied[b]
      if (isLegalPair(state, i, j)) pairs.push([i, j])
    }
  }
  return pairs
}

// Pure — returns a new state, does not mutate the one passed in.
export function removePair(state, i, j) {
  const cells = state.cells.slice()
  cells[i] = null
  cells[j] = null
  return { ...state, cells }
}

// Every currently-occupied value, in reading order, appended as new cells
// at the end of the logical board (padded to a whole number of rows so
// rendering never has a partial trailing row).
export function appendRemainingNumbers(state) {
  const remaining = state.cells.filter((v) => v !== null)
  const cells = state.cells.concat(remaining)
  const remainder = cells.length % state.cols
  if (remainder !== 0) {
    cells.push(...new Array(state.cols - remainder).fill(null))
  }
  return { ...state, cells }
}

export function remainingCount(state) {
  return state.cells.reduce((sum, v) => sum + (v === null ? 0 : 1), 0)
}

export function isBoardCleared(state) {
  return remainingCount(state) === 0
}
