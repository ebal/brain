// Property values are 0..2 internally (SPEC §3); these are only for display.
export const NUMBER_NAMES = ['One', 'Two', 'Three']
export const SHAPE_NAMES = ['Diamond', 'Oval', 'Squiggle']
export const COLOR_NAMES = ['Red', 'Green', 'Purple']
export const SHADING_NAMES = ['Solid', 'Striped', 'Open']

export const COLOR_HEX = ['#e5484d', '#2fbf71', '#b06fe0']

// Optional lighter/pastel alternative to COLOR_HEX (same Red/Green/Purple
// order), reusing the palette already established for Schulte/Switch
// Trail's Random Color variants — a pure rendering choice, selectable
// per-session from the SET menu, with no effect on the deck/validator logic
// below (which only ever compares color as an index, never a hex value).
export const COLOR_HEX_LIGHT = ['#f7a8a8', '#b8e0a0', '#d6b8f5']

export const PROPERTY_NAMES = ['number', 'shape', 'color', 'shading']

export const PROPERTY_DISPLAY = {
  number: { label: 'Number', values: NUMBER_NAMES },
  shape: { label: 'Shape', values: SHAPE_NAMES },
  color: { label: 'Color', values: COLOR_NAMES },
  shading: { label: 'Shading', values: SHADING_NAMES },
}

// boardSize varies difficulty by how many cards there are to scan, not by
// changing the underlying SET rule (SPEC §5) — Easy has fewer cards to make
// the visual search itself less overwhelming, Extreme has more.
export const SET_DIFFICULTIES = {
  easy: { key: 'easy', label: 'Easy', boardSize: 9 },
  medium: { key: 'medium', label: 'Medium', boardSize: 12 },
  hard: { key: 'hard', label: 'Hard', boardSize: 12 },
  extreme: { key: 'extreme', label: 'Extreme', boardSize: 15 },
}

export const DEAL_INCREMENT = 3
