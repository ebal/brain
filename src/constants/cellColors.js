// Shared light/pastel "random cell/target color" palette + contrast picker —
// used by any game's Random Color variant (currently Schulte Tables and
// Switch Trail). All nine entries have a relative luminance above
// textColorFor's 0.4 threshold, so every cell consistently gets dark text.
export const CELL_COLOR_PALETTE = [
  { name: 'Light Red', hex: '#f7a8a8' },
  { name: 'Light Blue', hex: '#a9c9f5' },
  { name: 'Light Green', hex: '#b8e0a0' },
  { name: 'Light Yellow', hex: '#f5e79a' },
  { name: 'Light Purple', hex: '#d6b8f5' },
  { name: 'Light Orange', hex: '#f7c896' },
  { name: 'Light Cyan', hex: '#a3e4ec' },
  { name: 'Light Pink', hex: '#f9c6de' },
  { name: 'Light Brown', hex: '#dcbe9a' },
]

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
