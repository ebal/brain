// Grid-agnostic Sudoku primitives: validity checks, a randomized full-grid
// generator, and a backtracking solver used only to verify uniqueness during
// generation (never for in-game hints or difficulty rating — see
// difficultyRater.js for the human-technique solver used for those).

const SIZE = 9
const BOX = 3

// Deterministic PRNG (mulberry32) so a seed always produces the same grid —
// mirrors the pattern already used in nback/sequence.js.
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeRng(seed) {
  return typeof seed === 'number' ? mulberry32(seed) : Math.random
}

function shuffled(arr, rng) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function emptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

export function cloneGrid(grid) {
  return grid.map((row) => [...row])
}

export function isSafe(grid, r, c, val) {
  for (let i = 0; i < SIZE; i++) {
    if (grid[r][i] === val) return false
    if (grid[i][c] === val) return false
  }
  const br = Math.floor(r / BOX) * BOX
  const bc = Math.floor(c / BOX) * BOX
  for (let i = 0; i < BOX; i++) {
    for (let j = 0; j < BOX; j++) {
      if (grid[br + i][bc + j] === val) return false
    }
  }
  return true
}

// A complete, randomly generated, valid 9x9 solution grid.
export function generateFullGrid(seed) {
  const rng = makeRng(seed)
  const grid = emptyGrid()

  function fill(pos) {
    if (pos === 81) return true
    const r = Math.floor(pos / 9)
    const c = pos % 9
    for (const val of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)) {
      if (isSafe(grid, r, c, val)) {
        grid[r][c] = val
        if (fill(pos + 1)) return true
        grid[r][c] = 0
      }
    }
    return false
  }

  fill(0)
  return grid
}

// Counts solutions up to `limit` (default 2, i.e. "is it unique?") with early
// exit once the limit is reached — used only during puzzle carving.
export function countSolutions(grid, limit = 2) {
  let count = 0
  const g = cloneGrid(grid)

  function solve(pos) {
    if (count >= limit) return
    if (pos === 81) {
      count += 1
      return
    }
    const r = Math.floor(pos / 9)
    const c = pos % 9
    if (g[r][c] !== 0) {
      solve(pos + 1)
      return
    }
    for (let val = 1; val <= 9; val++) {
      if (isSafe(g, r, c, val)) {
        g[r][c] = val
        solve(pos + 1)
        g[r][c] = 0
        if (count >= limit) return
      }
    }
  }

  solve(0)
  return count
}

export function isValidCompleteGrid(grid) {
  for (let i = 0; i < SIZE; i++) {
    if (new Set(grid[i]).size !== SIZE) return false
    if (new Set(grid.map((row) => row[i])).size !== SIZE) return false
  }
  for (let br = 0; br < BOX; br++) {
    for (let bc = 0; bc < BOX; bc++) {
      const box = new Set()
      for (let i = 0; i < BOX; i++) {
        for (let j = 0; j < BOX; j++) box.add(grid[br * BOX + i][bc * BOX + j])
      }
      if (box.size !== SIZE) return false
    }
  }
  return true
}

export { makeRng, shuffled, SIZE, BOX }
