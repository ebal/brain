// Pure Lights Out board logic — no Vue dependency (SPEC "Architecture").
// A board is a flat array of 0/1, row-major, length size*size. 1 = lit (ON).

// The lowest-level primitive: flips exactly one cell. Never mutates the
// array passed in.
export function toggleCell(cells, size, r, c) {
  const next = [...cells]
  const i = r * size + c
  next[i] = next[i] ? 0 : 1
  return next
}

// Self plus valid up/down/left/right neighbours only — diagonals never
// toggle (SPEC "Core rules").
export function neighborsOf(size, r, c) {
  const cells = [[r, c]]
  if (r > 0) cells.push([r - 1, c])
  if (r < size - 1) cells.push([r + 1, c])
  if (c > 0) cells.push([r, c - 1])
  if (c < size - 1) cells.push([r, c + 1])
  return cells
}

// The actual game move: tapping (r,c) toggles itself and every valid
// orthogonal neighbour.
export function applyMove(cells, size, r, c) {
  let next = cells
  for (const [nr, nc] of neighborsOf(size, r, c)) {
    next = toggleCell(next, size, nr, nc)
  }
  return next
}

export function isSolved(cells) {
  return cells.every((v) => v === 0)
}

export function createEmptyBoard(size) {
  return Array(size * size).fill(0)
}
