// Random Color and Untimed variants (user-requested) — two independent
// checkboxes, combinable, mirroring switchtrail/variants.js exactly.
//
// Random Color: pure visual noise, a random background per cell, generated
// fresh every trial (constants/cellColors.js — shared with Schulte and
// Switch Trail). Uncorrelated with which cell is odd.
//
// Untimed: modeled on Mental Rotation's Timed/Untimed mode, not Switch
// Trail's — Odd One Out's trial generation is endless, so "just remove the
// timeout" has no natural stopping point the way Switch Trail's finite
// trail does. Untimed instead ends the round after a fixed number of
// correct trials (ODDONEOUT_UNTIMED_TARGET_CORRECT) — see
// useOddOneOutGame.js.
//
// 'classic' keeps Odd One Out's original, pre-existing storage key shape
// (see useOddOneOutStats.js) so nobody's already-saved stats/history change
// format now that these variants exist.
export const ODDONEOUT_UNTIMED_TARGET_CORRECT = 20

export const ODDONEOUT_VARIANTS = {
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
