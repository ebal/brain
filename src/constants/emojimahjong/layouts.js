// Curated layered layout templates (Level-SPEC §7/§8/§55.8) — hand-picked
// rectangular "terrace" stacks rather than a procedural geometry generator,
// per the spec's explicit preference. Every layout below is one of the
// building blocks the 50-level campaign (constants/emojimahjong/levels.js)
// draws from — a level's `layoutId` + `seed` together fully determine its
// board (Level-SPEC §10), and several levels within a tier deliberately
// reuse the same layout shape with a different seed, since a different seed
// produces a genuinely different emoji assignment (and thus a different
// puzzle) on the same silhouette.
//
// Coordinates are grid units. Within one layer (z), adjacent tile columns
// and rows are 2 units apart. A tile stacked on the layer above is offset
// by 1 unit in x and/or y, so it overlaps ("covers") whichever tile(s) on
// the layer below sit within 1 unit in both x and y — see
// composables/emojimahjong/board.js, which relies on this exact spacing for
// its covers/left-right adjacency checks. Only x-adjacency (left/right)
// within the same layer blocks a tile; y-position never does (Level-SPEC §4).
function rect(cols, rows, z, ox = 0, oy = 0) {
  const slots = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({ x: ox + c * 2, y: oy + r * 2, z })
    }
  }
  return slots
}

function layout(id, layers) {
  return { id, slots: layers.flat() }
}

// A flat "plaza" at z0 with a tapering peak stacked above it — each peak
// layer shrinks by one column/row and shifts by the usual one grid unit
// (see the module-level spacing convention above), so the peak alone is a
// real multi-layer pyramid rather than 2-3 hand-picked rect() sizes.
//
// `peakOrigin` overrides the default centered placement with an explicit
// [x, y] origin for the peak's first (z=1) layer, so the same base/peak
// dimensions can produce a visibly different (e.g. leaning/off-center)
// board while keeping the exact tile count and layer depth.
//
// IMPORTANT constraint discovered during curation: the peak must stay
// strictly narrower than the plaza in at least one dimension. Whenever the
// peak's first layer is the same size as (or larger than) the plaza, its
// diagonal reach covers the *entire* plaza no matter how it's offset,
// sealing almost the whole board behind a single 1-to-1 covering chain down
// to one free tip tile — the generator can't find a clearing order for it
// at all. Every layout below respects this.
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

// Every layout below was chosen by a one-off curation script (not part of
// the shipped app) that searched rect()/plazaPeak() dimension combinations
// within each tier's target tile-count/layer-depth band (Level-SPEC §7),
// keeping only shapes composables/emojimahjong/generator.js's
// generateSolvableBoard() actually accepts (i.e. a full clearing order
// exists) — then independently re-verified by replaying each of the 50
// levels' full boards to completion using only real emoji-matching pair
// removals (composables/emojimahjong/levels.test.js re-runs this
// verification against the live code, so it also catches drift if a
// layout or level definition is ever edited).
export const EMOJIMAHJONG_LAYOUTS = [
  // Levels 1-4 — hand-designed tutorial shapes (Level-SPEC §9), not part of
  // the algorithmic tier search below: each one exists specifically to
  // teach one rule in isolation.
  layout('em-tutorial-1', rect(2, 4, 0)), // 8 tiles, 1 layer — 2 columns means every tile always has an open side: pure matching, zero blocking (Level 1)
  layout('em-tutorial-2', rect(4, 3, 0)), // 12 tiles, 1 layer — 4-wide rows introduce left/right blocking on interior columns (Level 2)
  layout('em-tutorial-3', [...rect(4, 1, 0), { x: 2, y: 1, z: 1 }, { x: 4, y: 1, z: 1 }]), // 6 tiles, 2 layers — introduces a covering tile (Level 3)
  layout('em-tutorial-4', plazaPeak(4, 3, 1, 2)), // 14 tiles, 2 layers — small enough to stay a lesson, but removal order now genuinely matters (Level 4)

  // Level 5 — the last "8-20 tiles" tier level, transitioning to normal play
  layout('em-tutorial-end-1', rect(5, 2, 0)), // 10 tiles, 1 layer
  layout('em-tutorial-end-2', rect(2, 8, 0)), // 16 tiles, 1 layer
  layout('em-tutorial-end-3', rect(5, 4, 0)), // 20 tiles, 1 layer
  layout('em-tutorial-end-4', rect(3, 4, 0)), // 12 tiles, 1 layer
  layout('em-tutorial-end-5', rect(6, 3, 0)), // 18 tiles, 1 layer
  layout('em-tutorial-end-6', rect(6, 2, 0)), // 12 tiles, 1 layer
  layout('em-tutorial-end-7', rect(4, 4, 0)), // 16 tiles, 1 layer
  layout('em-tutorial-end-8', rect(4, 2, 0)), // 8 tiles, 1 layer

  // Levels 6-10 — Simple
  layout('em-simple-1', plazaPeak(4, 4, 1, 4)), // 20 tiles, 2 layers
  layout('em-simple-2', rect(7, 4, 0)), // 28 tiles, 1 layer
  layout('em-simple-3', plazaPeak(5, 4, 1, 4)), // 24 tiles, 2 layers
  layout('em-simple-4', plazaPeak(10, 2, 4, 1)), // 24 tiles, 2 layers
  layout('em-simple-5', rect(4, 5, 0)), // 20 tiles, 1 layer
  layout('em-simple-6', plazaPeak(3, 8, 2, 1)), // 26 tiles, 2 layers
  layout('em-simple-7', plazaPeak(6, 3, 2, 1)), // 20 tiles, 2 layers
  layout('em-simple-8', plazaPeak(9, 2, 8, 1)), // 26 tiles, 2 layers

  // Levels 11-20 — Easy planning
  layout('em-easyplanning-1', plazaPeak(5, 6, 1, 4)), // 34 tiles, 2 layers
  layout('em-easyplanning-2', plazaPeak(12, 2, 12, 1)), // 36 tiles, 2 layers
  layout('em-easyplanning-3', plazaPeak(7, 3, 7, 1)), // 28 tiles, 2 layers
  layout('em-easyplanning-4', plazaPeak(3, 8, 1, 4)), // 28 tiles, 2 layers
  layout('em-easyplanning-5', plazaPeak(9, 3, 7, 1)), // 34 tiles, 2 layers
  layout('em-easyplanning-6', plazaPeak(4, 6, 1, 6)), // 30 tiles, 2 layers
  layout('em-easyplanning-7', plazaPeak(8, 4, 1, 2)), // 34 tiles, 2 layers
  layout('em-easyplanning-8', plazaPeak(11, 3, 3, 1)), // 36 tiles, 2 layers

  // Levels 21-30 — Intermediate
  layout('em-intermediate-1', plazaPeak(9, 5, 1, 3)), // 48 tiles, 2 layers
  layout('em-intermediate-2', plazaPeak(9, 4, 4, 1)), // 40 tiles, 2 layers
  layout('em-intermediate-3', plazaPeak(6, 7, 2, 1)), // 44 tiles, 2 layers
  layout('em-intermediate-4', plazaPeak(7, 4, 2, 3)), // 36 tiles, 3 layers
  layout('em-intermediate-5', plazaPeak(6, 6, 1, 6)), // 42 tiles, 2 layers
  layout('em-intermediate-6', plazaPeak(11, 3, 2, 2)), // 38 tiles, 3 layers
  layout('em-intermediate-7', plazaPeak(8, 3, 7, 2)), // 44 tiles, 3 layers
  layout('em-intermediate-8', plazaPeak(11, 3, 9, 1)), // 42 tiles, 2 layers

  // Levels 31-40 — Hard
  layout('em-hard-1', plazaPeak(8, 4, 7, 2)), // 52 tiles, 3 layers
  layout('em-hard-2', plazaPeak(9, 3, 8, 2)), // 50 tiles, 3 layers
  layout('em-hard-3', plazaPeak(4, 7, 2, 7)), // 48 tiles, 3 layers
  layout('em-hard-4', plazaPeak(5, 7, 2, 6)), // 52 tiles, 3 layers
  layout('em-hard-5', plazaPeak(3, 9, 2, 8)), // 50 tiles, 3 layers
  layout('em-hard-6', plazaPeak(7, 6, 2, 3)), // 50 tiles, 3 layers
  layout('em-hard-7', plazaPeak(11, 2, 9, 2)), // 48 tiles, 3 layers
  layout('em-hard-8', plazaPeak(12, 4, 3, 2)), // 56 tiles, 3 layers

  // Levels 41-45 — Deep dependencies
  layout('em-deep-1', plazaPeak(12, 3, 5, 3)), // 62 tiles, 4 layers
  layout('em-deep-2', plazaPeak(7, 6, 3, 3)), // 56 tiles, 4 layers
  layout('em-deep-3', plazaPeak(7, 4, 6, 3)), // 60 tiles, 4 layers
  layout('em-deep-4', plazaPeak(12, 4, 3, 2)), // 56 tiles, 3 layers
  layout('em-deep-5', plazaPeak(8, 6, 2, 5)), // 62 tiles, 3 layers
  layout('em-deep-6', plazaPeak(4, 9, 2, 7)), // 56 tiles, 3 layers
  layout('em-deep-7', plazaPeak(6, 9, 2, 3)), // 62 tiles, 3 layers
  layout('em-deep-8', plazaPeak(4, 6, 3, 6)), // 56 tiles, 4 layers

  // Levels 46-50 — Advanced (Level-SPEC §47/§48: mobile usability is a
  // level-validation requirement for this tier especially — these have NOT
  // been hand-checked on a physical iPhone; see README/investigation notes)
  layout('em-advanced-1', plazaPeak(11, 4, 3, 4)), // 64 tiles, 4 layers
  layout('em-advanced-2', plazaPeak(8, 5, 6, 3)), // 72 tiles, 4 layers
  layout('em-advanced-3', plazaPeak(5, 6, 4, 5)), // 70 tiles, 5 layers
  layout('em-advanced-4', plazaPeak(8, 5, 5, 3)), // 66 tiles, 4 layers
  layout('em-advanced-5', plazaPeak(7, 6, 4, 4)), // 72 tiles, 5 layers
  layout('em-advanced-6', plazaPeak(6, 5, 4, 5)), // 70 tiles, 5 layers
  layout('em-advanced-7', plazaPeak(7, 6, 5, 3)), // 68 tiles, 4 layers
  layout('em-advanced-8', plazaPeak(8, 6, 4, 3)), // 68 tiles, 4 layers

  // Practice — tiny 6-tile/3-pair demo for AboutPage.vue (Level-SPEC §49).
  // A z0 row of 4 (ends free, middle two covered) plus 2 z1 tiles stacked
  // over the covered middle pair — small enough to demonstrate both the
  // covering rule and the left/right rule in one board.
  layout('practice-1', [rect(4, 1, 0), [{ x: 2, y: 1, z: 1 }, { x: 4, y: 1, z: 1 }]]),
]
