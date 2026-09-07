// Random Color / Random Position variants (v2 addition, user-requested) —
// layered onto the same 6 grid sizes as Classic Schulte rather than as a
// separate game. Chosen via two independent checkboxes in MainMenu.vue
// (not a single exclusive toggle), but still stored/keyed as one of these
// four canonical variants, mirroring Stroop's `mode` dimension
// (constants/colors.js MODES / useBestScores.js / useScoreHistory.js).
//
// 'classic' intentionally keeps Schulte's original, pre-existing storage key
// shape (see schulte/useBestTimes.js and useScoreHistory.js) so nobody's
// already-saved plain-Schulte best times/history change format.
export const SCHULTE_VARIANTS = {
  classic: { key: 'classic', label: 'Classic', colorMode: false, dynamicMode: false },
  color: { key: 'color', label: 'Random Color', colorMode: true, dynamicMode: false },
  dynamic: { key: 'dynamic', label: 'Random Position', colorMode: false, dynamicMode: true },
  colorDynamic: { key: 'color-dynamic', label: 'Random Color + Position', colorMode: true, dynamicMode: true },
}

export function variantKeyFor(colorMode, dynamicMode) {
  if (colorMode && dynamicMode) return 'color-dynamic'
  if (colorMode) return 'color'
  if (dynamicMode) return 'dynamic'
  return 'classic'
}
