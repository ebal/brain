// Random Color variant (v2 addition, user-requested) — a single checkbox
// available across all four difficulties (including Extreme's dynamic
// repositioning), mirroring Schulte's variant pattern but with only one
// toggle since Switch Trail's "dynamic" axis is already a difficulty tier
// (Extreme), not a second independent checkbox.
//
// Untimed (v3 addition, user-requested — stress-free/kid-friendly play,
// same request as Mental Rotation's Timed/Untimed mode): a second
// independent checkbox, combinable with Random Color and with every
// difficulty including Extreme. The round never times out; it only ends by
// completing the trail. See useSwitchTrailGame.js for the round-end change.
//
// 'classic' intentionally keeps Switch Trail's original, pre-existing
// storage key shape (see switchtrail/useSwitchTrailStats.js) so nobody's
// already-saved plain best times/history change format.
export const SWITCHTRAIL_VARIANTS = {
  classic: { key: 'classic', label: 'Classic', colorMode: false, untimed: false },
  color: { key: 'color', label: 'Random Color', colorMode: true, untimed: false },
  untimed: { key: 'untimed', label: 'Untimed', colorMode: false, untimed: true },
  untimedColor: { key: 'untimed-color', label: 'Untimed + Color', colorMode: true, untimed: true },
}

export function variantKeyFor(colorMode, untimed) {
  if (untimed && colorMode) return 'untimed-color'
  if (untimed) return 'untimed'
  if (colorMode) return 'color'
  return 'classic'
}
