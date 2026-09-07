// Shared "random cell/target color" palette + contrast picker — used by any
// game's Random Color variant (currently Schulte Tables and Switch Trail).
// Reuses Stroop's hues (constants/colors.js) rather than maintaining a
// second color list, minus Black: Stroop reads that hex against the app's
// fixed dark background, but here it would BE a cell/target's own
// background and blend into the dark theme (--bg/--surface are already
// near-black), making a "randomly colored" one indistinguishable from an
// uncolored one.
import { COLOR_PALETTE } from './colors.js'

export const CELL_COLOR_PALETTE = COLOR_PALETTE.filter((c) => c.name !== 'Black')

function relativeLuminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

// WCAG-style pick: dark text on light/bright backgrounds, white text on
// dark/saturated ones — computed rather than hand-paired so the palette can
// change without needing a matching text-color table kept in sync.
export function textColorFor(hex) {
  return relativeLuminance(hex) > 0.4 ? '#10121a' : '#ffffff'
}

export function randomCellColor() {
  return CELL_COLOR_PALETTE[Math.floor(Math.random() * CELL_COLOR_PALETTE.length)].hex
}
