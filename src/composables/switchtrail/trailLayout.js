// Board layout generation — pure, no Vue dependency (SPEC §5/§20), same
// mulberry32 seeded-PRNG shape used by set/deck.js and sudoku/sudokuGenerator.js.

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

export function makeRng(seed) {
  return typeof seed === 'number' ? mulberry32(seed) : Math.random
}

// Abstract coordinate space targets are placed into (SPEC §5) — components
// render a container whose CSS aspect-ratio is exactly WIDTH/HEIGHT, so
// scaling this into real pixels keeps every target perfectly circular
// regardless of viewport size.
export const BOARD_WIDTH = 100
export const BOARD_HEIGHT = 145
export const TARGET_RADIUS = 7.5
export const MIN_SPACING = 19 // minimum center-to-center distance
export const MARGIN = 9 // keeps targets clear of the board edge / safe areas

export const DEFAULT_BOUNDS = {
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  radius: TARGET_RADIUS,
  minSpacing: MIN_SPACING,
  margin: MARGIN,
}

const MAX_ATTEMPTS_PER_TARGET = 500
const MAX_LAYOUT_ATTEMPTS = 300

function distance(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function fits(candidate, placed, minSpacing) {
  return placed.every((p) => distance(candidate, p) >= minSpacing)
}

// Rejection sampling (SPEC §5): for each label, try random points until one
// clears every already-placed target (both `fixedPoints`, which never move,
// and the other labels being placed in this same call) by minSpacing; if a
// label can't find a spot within MAX_ATTEMPTS_PER_TARGET tries, this whole
// batch restarts (SPEC §5's "If a valid layout cannot be produced ...
// restart generation"). The rng is not reseeded between restarts, so the
// result stays a pure function of the caller's rng state (SPEC §20).
// Returns only the newly placed points, in `labels` order — one per label.
function placeTargets(labels, fixedPoints, bounds, rng) {
  const { width, height, minSpacing, margin } = { ...DEFAULT_BOUNDS, ...bounds }

  for (let attempt = 0; attempt < MAX_LAYOUT_ATTEMPTS; attempt++) {
    const placed = [...fixedPoints]
    const result = []
    let ok = true

    for (const label of labels) {
      let found = false
      for (let i = 0; i < MAX_ATTEMPTS_PER_TARGET; i++) {
        const candidate = {
          label,
          x: margin + rng() * (width - margin * 2),
          y: margin + rng() * (height - margin * 2),
        }
        if (fits(candidate, placed, minSpacing)) {
          placed.push(candidate)
          result.push(candidate)
          found = true
          break
        }
      }
      if (!found) {
        ok = false
        break
      }
    }

    if (ok) return result
  }

  throw new Error('placeTargets: could not place every target — try a larger board or smaller minSpacing')
}

export function generateTrailLayout(sequence, bounds = DEFAULT_BOUNDS, seed) {
  return placeTargets(sequence, [], bounds, makeRng(seed))
}

// Dynamic-mode support (Extreme difficulty): re-places only the targets
// still `pending`, treating every other target's current position as fixed
// — completed targets never move, and the newly reshuffled pending targets
// avoid both the fixed ones and each other. Pass the same `rng` instance the
// round's initial generateTrailLayout call used (not a fresh seed) so a
// seeded round's full sequence of reshuffles stays reproducible.
export function repositionPending(layout, bounds, rng) {
  const pending = layout.filter((t) => t.state === 'pending')
  const fixed = layout.filter((t) => t.state !== 'pending')
  if (pending.length === 0) return layout

  const replaced = placeTargets(pending.map((t) => t.label), fixed, bounds, rng)
  const byLabel = new Map(replaced.map((t) => [t.label, t]))

  return layout.map((t) => {
    const next = byLabel.get(t.label)
    return next ? { ...t, x: next.x, y: next.y } : t
  })
}

export function validateLayout(layout, sequence, bounds = DEFAULT_BOUNDS) {
  const { width, height, minSpacing, margin } = { ...DEFAULT_BOUNDS, ...bounds }
  const EPS = 1e-6

  if (layout.length !== sequence.length) return false

  const labels = new Set()
  for (const t of layout) {
    if (labels.has(t.label)) return false // duplicate
    labels.add(t.label)
    if (t.x < margin - EPS || t.x > width - margin + EPS) return false
    if (t.y < margin - EPS || t.y > height - margin + EPS) return false
  }
  for (const label of sequence) {
    if (!labels.has(label)) return false // missing
  }

  for (let i = 0; i < layout.length; i++) {
    for (let j = i + 1; j < layout.length; j++) {
      if (distance(layout[i], layout[j]) < minSpacing - EPS) return false // overlap
    }
  }

  return true
}
