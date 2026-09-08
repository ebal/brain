// Light/pastel palette for Schulte's Random Color variant — deliberately
// separate from the shared, more saturated palette in constants/cellColors.js
// (used by Switch Trail), per a user request for lighter Schulte cell colors.
// All nine entries have a relative luminance above textColorFor's 0.4
// threshold, so every cell consistently gets dark text.
export const SCHULTE_CELL_COLOR_PALETTE = [
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

export function randomSchulteCellColor() {
  return SCHULTE_CELL_COLOR_PALETTE[Math.floor(Math.random() * SCHULTE_CELL_COLOR_PALETTE.length)].hex
}
