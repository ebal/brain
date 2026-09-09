// Difficulty comes from candidate count, shape complexity ceiling and
// distractor strength — not rotation-angle variety (SPEC §8 explicitly
// allows falling back to 90°-only when arbitrary 45° would complicate shape
// generation; v1 takes that option at every tier).
//
// maxCellCount is inclusive: a difficulty's shape pool is every shape in
// constants/mentalrotation/shapes.js with cellCount <= maxCellCount (SPEC
// §29 allows overlap between tiers).
//
// distractorTypes, in SPEC §11's preferred order:
//   'mirror'     — the reference mirrored across one axis, then rotated
//   'structural' — the reference with one cell moved/added/removed, then rotated
//   'mirror2'    — a second mirrored-and-rotated distractor (different axis/angle than 'mirror')
export const MENTALROTATION_DIFFICULTIES = {
  easy: {
    key: 'easy',
    label: 'Easy',
    choices: 2,
    maxCellCount: 5,
    duration: 30,
    distractorTypes: ['mirror'],
  },
  medium: {
    key: 'medium',
    label: 'Medium',
    choices: 3,
    maxCellCount: 6,
    duration: 45,
    distractorTypes: ['mirror', 'structural'],
  },
  hard: {
    key: 'hard',
    label: 'Hard',
    choices: 4,
    maxCellCount: 7,
    duration: 60,
    distractorTypes: ['mirror', 'structural', 'mirror2'],
  },
  veryHard: {
    key: 'veryHard',
    label: 'Very Hard',
    choices: 4,
    maxCellCount: 8,
    duration: 90,
    distractorTypes: ['mirror', 'structural', 'mirror2'],
  },
}
