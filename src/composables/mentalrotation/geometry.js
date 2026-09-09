// Pure shape transformation/equivalence logic (SPEC §6, §8, §9, §32) — no
// Vue, no rendering. Shapes are arrays of [row, col] integer cell pairs on a
// square lattice.

export function normalizeShape(cells) {
  const minRow = Math.min(...cells.map(([r]) => r))
  const minCol = Math.min(...cells.map(([, c]) => c))
  return cells
    .map(([r, c]) => [r - minRow, c - minCol])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
}

export function canonicalKey(cells) {
  return normalizeShape(cells)
    .map(([r, c]) => `${r},${c}`)
    .join(';')
}

// steps = number of 90° clockwise quarter-turns (0-3). (r,c) -> (c,-r) is one
// quarter-turn; normalized after every call so the result is comparable via
// canonicalKey regardless of how far the shape drifted from the origin.
export function rotateShape(cells, steps = 1) {
  let result = cells
  const n = ((steps % 4) + 4) % 4
  for (let i = 0; i < n; i++) {
    result = result.map(([r, c]) => [c, -r])
  }
  return normalizeShape(result)
}

// axis: 'vertical' mirrors left-right ((r,c)->(r,-c)), 'horizontal' mirrors
// top-bottom ((r,c)->(-r,c)). Both are exposed since SPEC §9 references
// either axis for generating a distractor, but see areReflectionEquivalent
// below for why only 'vertical' is needed for equivalence checking.
export function mirrorShape(cells, axis = 'vertical') {
  const mirrored = axis === 'horizontal'
    ? cells.map(([r, c]) => [-r, c])
    : cells.map(([r, c]) => [r, -c])
  return normalizeShape(mirrored)
}

export function areRotationEquivalent(a, b) {
  const key = canonicalKey(a)
  for (let steps = 0; steps < 4; steps++) {
    if (canonicalKey(rotateShape(b, steps)) === key) return true
  }
  return false
}

// Only mirrorShape(b, 'vertical') is swept through all 4 rotations here —
// not both axes — because horizontal-mirror equals rotate180 composed with
// vertical-mirror: mirrorH(r,c) = (-r,c); rotate180(mirrorV(r,c)) =
// rotate180(r,-c) = (-r,c). So the horizontal-mirror-then-any-rotation set is
// already a subset of "vertical-mirror then all 4 rotations."
export function areReflectionEquivalent(a, b) {
  const key = canonicalKey(a)
  const mirroredB = mirrorShape(b, 'vertical')
  for (let steps = 0; steps < 4; steps++) {
    if (canonicalKey(rotateShape(mirroredB, steps)) === key) return true
  }
  return false
}
