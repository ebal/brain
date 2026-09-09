// Pure triangular hex-lattice board logic (SPEC §4, §25) — no Vue, no
// storage. Row r (0-indexed) has r+1 cells, column c in 0..r.
//
// Six jump directions (SPEC §4), as (jumped, landing) row/col deltas:
const DIRECTIONS = [
  { name: 'E', jump: [0, 1], land: [0, 2] },
  { name: 'W', jump: [0, -1], land: [0, -2] },
  { name: 'NE', jump: [-1, 0], land: [-2, 0] },
  { name: 'NW', jump: [-1, -1], land: [-2, -2] },
  { name: 'SE', jump: [1, 1], land: [2, 2] },
  { name: 'SW', jump: [1, 0], land: [2, 0] },
]

export function cellIndex(row, col) {
  return (row * (row + 1)) / 2 + col
}

function isValidCell(n, row, col) {
  return row >= 0 && row < n && col >= 0 && col <= row
}

const boardCache = new Map()

// Board geometry for an n-row triangle: every cell plus every geometrically
// legal (start, jumped, landing) triple, independent of marble occupancy.
// Cached per n — only 4 distinct sizes exist across all difficulties, and
// this is the same shape used by solver.js's search.
export function buildBoard(n) {
  const cached = boardCache.get(n)
  if (cached) return cached

  const cells = []
  for (let row = 0; row < n; row++) {
    for (let col = 0; col <= row; col++) {
      cells.push({ row, col, idx: cellIndex(row, col) })
    }
  }
  const total = cells.length

  const moves = []
  for (const { row, col, idx: start } of cells) {
    for (const dir of DIRECTIONS) {
      const jr = row + dir.jump[0], jc = col + dir.jump[1]
      const lr = row + dir.land[0], lc = col + dir.land[1]
      if (isValidCell(n, jr, jc) && isValidCell(n, lr, lc)) {
        moves.push({ start, jumped: cellIndex(jr, jc), landing: cellIndex(lr, lc), direction: dir.name })
      }
    }
  }

  const built = { n, total, cells, moves }
  boardCache.set(n, built)
  return built
}

// puzzle: { n, emptyHoles: [[row,col], ...] } — see constants/marblejump/puzzles.js
export function createBoard(puzzle) {
  const { n, total } = buildBoard(puzzle.n)
  const occupied = new Array(total).fill(1)
  for (const [row, col] of puzzle.emptyHoles) {
    occupied[cellIndex(row, col)] = 0
  }
  return { n, occupied }
}

// state: { n, occupied: (0|1)[] }
export function getLegalMoves(state) {
  const { moves } = buildBoard(state.n)
  return moves.filter(
    ({ start, jumped, landing }) =>
      state.occupied[start] === 1 && state.occupied[jumped] === 1 && state.occupied[landing] === 0
  )
}

export function isLegalMove(state, move) {
  return getLegalMoves(state).some(
    (m) => m.start === move.start && m.jumped === move.jumped && m.landing === move.landing
  )
}

// Pure — returns a new state, does not mutate the one passed in.
export function applyMove(state, move) {
  const occupied = state.occupied.slice()
  occupied[move.start] = 0
  occupied[move.jumped] = 0
  occupied[move.landing] = 1
  return { n: state.n, occupied }
}

// Inverse of applyMove — `state` is the state AFTER `move` was applied.
export function undoMove(state, move) {
  const occupied = state.occupied.slice()
  occupied[move.start] = 1
  occupied[move.jumped] = 1
  occupied[move.landing] = 0
  return { n: state.n, occupied }
}

export function hasLegalMoves(state) {
  return getLegalMoves(state).length > 0
}

export function remainingCount(state) {
  return state.occupied.reduce((sum, v) => sum + v, 0)
}

// SPEC §13's suggested score formula.
export function calculateScore({ startingMarbles, remainingMarbles, undos, elapsedSeconds, optimalReached }) {
  const base = startingMarbles * 100
  const remainingPenalty = remainingMarbles * 250
  const undoPenalty = undos * 25
  const timePenalty = Math.floor(elapsedSeconds / 5) * 5
  const score = Math.max(0, base - remainingPenalty - undoPenalty - timePenalty)
  return optimalReached ? score + 500 : score
}
