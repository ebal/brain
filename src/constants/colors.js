// Ordered so each difficulty's palette is a superset of the previous one.
// First 4 (Red, Blue, Green, Yellow) match the classic Stroop (1935) color set.
export const COLOR_PALETTE = [
  { name: 'Red', hex: '#e63946' },
  { name: 'Blue', hex: '#4169e1' },
  { name: 'Green', hex: '#6b8e23' },
  { name: 'Yellow', hex: '#e6c200' },
  { name: 'Purple', hex: '#9b5de5' },
  { name: 'Orange', hex: '#f77f00' },
  { name: 'Cyan', hex: '#00a8cc' },
  { name: 'Pink', hex: '#ff6fb0' },
  { name: 'Brown', hex: '#8d5524' },
  { name: 'Black', hex: '#111111' },
]

export const DIFFICULTIES = {
  easy: { key: 'easy', label: 'Easy', colorCount: 4, duration: 30, congruentRatio: 0.5 },
  medium: { key: 'medium', label: 'Medium', colorCount: 6, duration: 60, congruentRatio: 0.35 },
  hard: { key: 'hard', label: 'Hard', colorCount: 8, duration: 60, congruentRatio: 0.2 },
  veryHard: { key: 'veryHard', label: 'Very Hard', colorCount: 10, duration: 90, congruentRatio: 0.1 },
}

export function paletteFor(colorCount) {
  return COLOR_PALETTE.slice(0, colorCount)
}

export const MODES = {
  color: {
    key: 'color',
    label: 'Color Match',
    short: 'Tap the INK COLOR — ignore the word.',
  },
  word: {
    key: 'word',
    label: 'Word Match',
    short: 'Tap what the WORD SAYS — ignore the ink color.',
  },
}
