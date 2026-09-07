// Random Color variant (v2 addition, user-requested) — a single checkbox
// available across all four difficulties (including Extreme's dynamic
// repositioning), mirroring Schulte's variant pattern but with only one
// toggle since Switch Trail's "dynamic" axis is already a difficulty tier
// (Extreme), not a second independent checkbox.
//
// 'classic' intentionally keeps Switch Trail's original, pre-existing
// storage key shape (see switchtrail/useSwitchTrailStats.js) so nobody's
// already-saved plain best times/history change format.
export const SWITCHTRAIL_VARIANTS = {
  classic: { key: 'classic', label: 'Classic', colorMode: false },
  color: { key: 'color', label: 'Random Color', colorMode: true },
}

export function variantKeyFor(colorMode) {
  return colorMode ? 'color' : 'classic'
}
