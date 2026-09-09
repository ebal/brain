// Pure board/tile geometry and state logic (SPEC §4, §9, §11) — no Vue, no
// storage, no emoji-generation concerns (see generator.js for that).
//
// A game state is `{ layoutId, removed, emoji }`: `removed`/`emoji` are
// arrays parallel to the layout's `slots`, indexed by slot position. Slot
// geometry itself is static per layout and cached below (SPEC §4: "The
// engine determines this from board geometry, not visual approximation").
import { EMOJIMAHJONG_LAYOUTS } from '../../constants/emojimahjong/layouts.js'

const geometryCache = new Map()

// Precomputes, per slot index: which slot(s) on the layer above cover it,
// and its same-layer left/right neighbor (or -1). SPEC §4's covering rule
// only ever needs "does anything at z+1 overlap me", and its horizontal
// rule only ever needs the immediate x-2/x+2 neighbor at the same z/y — so
// this is the full set of relationships isTileFree needs, computed once
// per layout rather than rescanned on every query.
function buildGeometry(layoutId) {
  const cached = geometryCache.get(layoutId)
  if (cached) return cached

  const layoutDef = EMOJIMAHJONG_LAYOUTS.find((l) => l.id === layoutId)
  if (!layoutDef) throw new Error(`Unknown Emoji Mahjong layout: ${layoutId}`)
  const { slots } = layoutDef

  const coveredBy = slots.map((s) =>
    slots
      .map((s2, j) => ({ s2, j }))
      .filter(({ s2 }) => s2.z === s.z + 1 && Math.abs(s2.x - s.x) <= 1 && Math.abs(s2.y - s.y) <= 1)
      .map(({ j }) => j)
  )
  const leftOf = slots.map((s) => slots.findIndex((s2) => s2.z === s.z && s2.y === s.y && s2.x === s.x - 2))
  const rightOf = slots.map((s) => slots.findIndex((s2) => s2.z === s.z && s2.y === s.y && s2.x === s.x + 2))

  const built = { layout: layoutDef, slots, coveredBy, leftOf, rightOf }
  geometryCache.set(layoutId, built)
  return built
}

export function getLayout(layoutId) {
  return buildGeometry(layoutId).layout
}

export function isTileFree(state, i) {
  if (state.removed[i]) return false
  const { coveredBy, leftOf, rightOf } = buildGeometry(state.layoutId)
  if (coveredBy[i].some((j) => !state.removed[j])) return false
  const leftBlocked = leftOf[i] !== -1 && !state.removed[leftOf[i]]
  const rightBlocked = rightOf[i] !== -1 && !state.removed[rightOf[i]]
  return !leftBlocked || !rightBlocked
}

export function getFreeTiles(state) {
  const { slots } = buildGeometry(state.layoutId)
  const free = []
  for (let i = 0; i < slots.length; i++) {
    if (!state.removed[i] && isTileFree(state, i)) free.push(i)
  }
  return free
}

export function getAvailablePairs(state) {
  const free = getFreeTiles(state)
  const pairs = []
  for (let a = 0; a < free.length; a++) {
    for (let b = a + 1; b < free.length; b++) {
      if (state.emoji[free[a]] === state.emoji[free[b]]) pairs.push([free[a], free[b]])
    }
  }
  return pairs
}

// Pure — returns a new state, does not mutate the one passed in.
export function removePair(state, a, b) {
  const removed = state.removed.slice()
  removed[a] = true
  removed[b] = true
  return { ...state, removed }
}

// Inverse of removePair.
export function undoPair(state, move) {
  const removed = state.removed.slice()
  removed[move.a] = false
  removed[move.b] = false
  return { ...state, removed }
}

export function isBoardCleared(state) {
  return state.removed.every(Boolean)
}

export function isDeadEnd(state) {
  return !isBoardCleared(state) && getAvailablePairs(state).length === 0
}

export function remainingCount(state) {
  return state.removed.reduce((sum, r) => sum + (r ? 0 : 1), 0)
}
