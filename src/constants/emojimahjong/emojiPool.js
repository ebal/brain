// Locally defined Unicode emoji pool (SPEC §10) — no remote image pack.
// 56 entries, enough for Master's 50 distinct pairs (v2's hardest tier)
// with room to spare. Chosen to be visually distinct; avoids flags,
// skin-tone variants, ZWJ sequences, and near-identical faces/hearts per
// the spec's guidance.
export const EMOJIMAHJONG_EMOJI = [
  '🐶', '🐱', '🦊', '🐼', '🐸', '🐵', '🐰', '🦁',
  '🍎', '🍋', '🍇', '🍓', '🥝', '🍒', '🍊', '🍉',
  '🚗', '🚀', '🎈', '🎲', '💎', '🎁', '🔔', '☂️',
  '🌞', '⭐', '🌙', '🌈', '🔥', '🌸', '🍀', '❄️',
  '⚽', '🏀', '🎾', '🏐', '🎯', '🥊', '🏓', '🏸',
  // Added for Extreme/Master (v2): distinct object/animal categories not
  // already represented above, so a large-pool draw never leans on two
  // near-identical shapes to tell tiles apart.
  '📷', '💻', '⌚', '🔑', '🎩', '👑', '💡', '🧸',
  '🚂', '⛵', '🏰', '🗿', '🎨', '🪁', '🧩', '🛸',
]
