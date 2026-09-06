// Property values are 0..2 internally (SPEC §3); these are only for display.
export const NUMBER_NAMES = ['One', 'Two', 'Three']
export const SHAPE_NAMES = ['Diamond', 'Oval', 'Squiggle']
export const COLOR_NAMES = ['Red', 'Green', 'Purple']
export const SHADING_NAMES = ['Solid', 'Striped', 'Open']

export const COLOR_HEX = ['#e5484d', '#2fbf71', '#b06fe0']

export const PROPERTY_NAMES = ['number', 'shape', 'color', 'shading']

export const PROPERTY_DISPLAY = {
  number: { label: 'Number', values: NUMBER_NAMES },
  shape: { label: 'Shape', values: SHAPE_NAMES },
  color: { label: 'Color', values: COLOR_NAMES },
  shading: { label: 'Shading', values: SHADING_NAMES },
}

export const SET_DIFFICULTIES = {
  easy: { key: 'easy', label: 'Easy' },
  medium: { key: 'medium', label: 'Medium' },
  hard: { key: 'hard', label: 'Hard' },
}

export const BOARD_SIZE = 12
export const DEAL_INCREMENT = 3
