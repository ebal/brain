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

  // Hard — 48 / 24: more blocking / layers.
  layout('hard-1', 'hard', [rect(8, 4, 0), rect(4, 4, 1, 1, 1)]),
  layout('hard-2', 'hard', [rect(6, 5, 0), rect(4, 3, 1, 1, 1), rect(3, 2, 2, 2, 2)]),
  layout('hard-3', 'hard', [rect(8, 3, 0), rect(6, 2, 1, 1, 1), rect(4, 2, 2, 2, 2), rect(2, 2, 3, 3, 3)]),
  layout('hard-4', 'hard', [rect(12, 3, 0), rect(6, 2, 1, 3, 1)]),

  // Very Hard — 64 / 32: larger layered puzzle.
  layout('veryhard-1', 'very-hard', [rect(8, 6, 0), rect(4, 4, 1, 1, 1)]),
  layout('veryhard-2', 'very-hard', [rect(8, 5, 0), rect(6, 3, 1, 1, 1), rect(3, 2, 2, 2, 2)]),
  layout('veryhard-3', 'very-hard', [rect(10, 4, 0), rect(6, 2, 1, 2, 1), rect(4, 2, 2, 3, 1), rect(2, 2, 3, 4, 2)]),
  layout('veryhard-4', 'very-hard', [rect(8, 4, 0), rect(8, 2, 1, 0, 1), rect(4, 4, 2, 2, 0)]),

  // Practice — tiny 6-tile/3-pair demo for AboutPage.vue (SPEC §28). Not a
  // real difficulty, so difficulties.js's layoutIdsFor('easy'|'medium'|...)
  // never picks it up for normal play. A z0 row of 4 (ends free, middle two
  // covered) plus 2 z1 tiles stacked over the covered middle pair — small
  // enough to demonstrate both the covering rule and the left/right rule
  // in one board.
  layout('practice-1', 'practice', [rect(4, 1, 0), [{ x: 2, y: 1, z: 1 }, { x: 4, y: 1, z: 1 }]]),
]
