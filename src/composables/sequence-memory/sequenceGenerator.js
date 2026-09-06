import { GRID_SIZE, STARTING_SEQUENCE_LENGTH } from '../../constants/sequence-memory/difficulties.js'

const ALL_CELLS = Array.from({ length: GRID_SIZE }, (_, i) => i)

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

function pickRandom(arr, rng) {
  return arr[Math.floor(rng() * arr.length)]
}

// Level 1's sequence — exactly STARTING_SEQUENCE_LENGTH cells, with no two
// consecutive steps on the same cell (SPEC §5).
export function generateInitialSequence(rng, length = STARTING_SEQUENCE_LENGTH) {
  const seq = []
  for (let i = 0; i < length; i++) {
    const prev = seq[seq.length - 1]
    const pool = prev === undefined ? ALL_CELLS : ALL_CELLS.filter((c) => c !== prev)
    seq.push(pickRandom(pool, rng))
  }
  return seq
}

// Appends exactly one new step, never a repeat of the immediately preceding
// cell — the existing sequence is otherwise left completely untouched
// (SPEC §5: "The existing sequence must remain unchanged").
export function extendSequence(seq, rng) {
  const prev = seq[seq.length - 1]
  const pool = ALL_CELLS.filter((c) => c !== prev)
  return [...seq, pickRandom(pool, rng)]
}
