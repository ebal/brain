// Curated layered layout templates (SPEC §7) — hand-picked rectangular
// "terrace" stacks rather than a procedural geometry generator, per the
// spec's explicit preference.
//
// Coordinates are grid units. Within one layer (z), adjacent tile columns
// and rows are 2 units apart. A tile stacked on the layer above is offset
// by 1 unit in x and/or y, so it overlaps ("covers") whichever tile(s) on
// the layer below sit within 1 unit in both x and y — see
// composables/emojimahjong/board.js, which relies on this exact spacing for
// its covers/left-right adjacency checks. Only x-adjacency (left/right)
// within the same layer blocks a tile; y-position never does (SPEC §4).
function rect(cols, rows, z, ox = 0, oy = 0) {
  const slots = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({ x: ox + c * 2, y: oy + r * 2, z })
    }
  }
  return slots
}

function layout(id, difficulty, layers) {
  return { id, difficulty, slots: layers.flat() }
}

// A flat "plaza" at z0 with a tapering peak stacked above it — each peak
// layer shrinks by one column/row and shifts by the usual one grid unit
// (see the module-level spacing convention above), so the peak alone is a
// real multi-layer pyramid rather than 2-3 hand-picked rect() sizes.
//
// Added after user feedback that Hard/Very Hard felt easy even at their
// hardest: the original Hard/Very Hard layouts topped out at 2-4 layers
// with 20-33% of tiles simultaneously free, which plays more like a
// visual-search task than genuine Mahjong Solitaire layering/blocking.
// plazaPeak-based layouts reach 5-6 layers with materially fewer
// simultaneously-free tiles, which is what actually creates planning
// pressure and occasional real dead-ends.
//
// `peakOrigin` overrides the default centered placement with an explicit
// [x, y] origin for the peak's first (z=1) layer, so the same base/peak
// dimensions can produce a visibly different (e.g. leaning/off-center)
// board while keeping the exact tile count and layer depth.
function plazaPeak(baseCols, baseRows, peakCols, peakRows, peakOrigin = null) {
  const plaza = rect(baseCols, baseRows, 0)
  const [ox0, oy0] = peakOrigin || [baseCols - peakCols, baseRows - peakRows]
  const layers = [plaza]
  let cols = peakCols
  let rows = peakRows
  let i = 0
  while (cols > 0 && rows > 0) {
    layers.push(rect(cols, rows, 1 + i, ox0 + i, oy0 + i))
    cols -= 1
    rows -= 1
    i += 1
  }
  return layers.flat()
}

export const EMOJIMAHJONG_LAYOUTS = [
  // Easy — 24 tiles / 12 pairs (SPEC §6): mostly flat / shallow.
  layout('easy-1', 'easy', [rect(6, 4, 0)]),
  layout('easy-2', 'easy', [rect(6, 3, 0), rect(3, 2, 1, 1, 1)]),
  layout('easy-3', 'easy', [rect(5, 4, 0), rect(2, 2, 1, 2, 2)]),

  // Medium — 36 / 18: shallow layered.
  layout('medium-1', 'medium', [rect(8, 3, 0), rect(4, 3, 1, 1, 1)]),
  layout('medium-2', 'medium', [rect(6, 4, 0), rect(4, 2, 1, 1, 1), rect(2, 2, 2, 2, 2)]),
  layout('medium-3', 'medium', [rect(9, 3, 0), rect(3, 3, 1, 3, 1)]),
  layout('medium-4', 'medium', [rect(6, 4, 0), rect(3, 4, 1, 1, 0)]),

  // Hard — 48 / 24. Redesigned (v2) as a plaza + 4-layer tapering peak (5
  // layers total) instead of the original's 2-4 flat "terrace" layers,
  // which left 21-25% of tiles free at once — plenty of visible matches, no
  // real planning pressure. hard-3/hard-4 keep the peak off-center for a
  // visibly different board at the same tile count and depth.
  layout('hard-1', 'hard', plazaPeak(6, 3, 4, 4)),
  layout('hard-2', 'hard', plazaPeak(3, 6, 4, 4)),
  layout('hard-3', 'hard', plazaPeak(6, 3, 4, 4, [0, -1])),
  layout('hard-4', 'hard', plazaPeak(6, 3, 4, 4, [4, -1])),

  // Very Hard — 64 / 32. Redesigned (v2): plaza + 4-layer peak (5 layers),
  // same reasoning as Hard — the original topped out at 4 layers with
  // 20-25% of tiles free at once.
  layout('veryhard-1', 'very-hard', plazaPeak(6, 4, 5, 4)),
  layout('veryhard-2', 'very-hard', plazaPeak(4, 6, 4, 5)),
  layout('veryhard-3', 'very-hard', plazaPeak(8, 3, 5, 4)),
  layout('veryhard-4', 'very-hard', plazaPeak(6, 4, 5, 4, [0, 0])),

  // Extreme — 80 / 40 (v2 addition, user-requested: "add a couple levels
  // more" after Very Hard turned out too easy even at its hardest).
  // A same-size base/peak (e.g. plazaPeak(5,5,5,5)) was tried here first
  // for a 6-layer peak — rejected. Whenever the peak's first layer exactly
  // matches the plaza's own size, its diagonal reach covers the *entire*
  // plaza no matter how it's offset, sealing almost the whole board behind
  // a single 1-to-1 covering chain down to one free tip tile — not just
  // "very hard", the generator can't find a clearing order for it at all.
  // Every layout below keeps the peak strictly narrower than the plaza in
  // at least one dimension, which is what actually leaves enough plaza
  // exposed to stay constructible.
  layout('extreme-1', 'extreme', plazaPeak(5, 6, 4, 6)),
  layout('extreme-2', 'extreme', plazaPeak(5, 8, 4, 5)),
  layout('extreme-3', 'extreme', plazaPeak(10, 4, 4, 5)),
  layout('extreme-4', 'extreme', plazaPeak(10, 3, 6, 4)),

  // Master — 100 / 50 (v2 addition): the largest and deepest tier, a
  // plaza + peak reaching 6 layers throughout. The top difficulty in the
  // game.
  layout('master-1', 'master', plazaPeak(6, 5, 5, 6)),
  layout('master-2', 'master', plazaPeak(5, 6, 6, 5)),
  layout('master-3', 'master', plazaPeak(9, 5, 5, 5)),
  layout('master-4', 'master', plazaPeak(6, 5, 5, 6, [0, -1])),

  // Practice — tiny 6-tile/3-pair demo for AboutPage.vue (SPEC §28). Not a
  // real difficulty, so difficulties.js's layoutIdsFor('easy'|'medium'|...)
  // never picks it up for normal play. A z0 row of 4 (ends free, middle two
  // covered) plus 2 z1 tiles stacked over the covered middle pair — small
  // enough to demonstrate both the covering rule and the left/right rule
  // in one board.
  layout('practice-1', 'practice', [rect(4, 1, 0), [{ x: 2, y: 1, z: 1 }, { x: 4, y: 1, z: 1 }]]),
]
