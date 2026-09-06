import { PROPERTY_NAMES } from '../../constants/set/cardProperties.js'

// For every property, (a + b + c) % 3 === 0 iff all-same or all-different
// (SPEC §3) — the standard SET mathematical rule, used instead of a manually
// maintained list of valid combinations.
export function isSet(a, b, c) {
  return PROPERTY_NAMES.every((p) => (a[p] + b[p] + c[p]) % 3 === 0)
}

// The unique third card that completes a's and b's SET.
export function findCompletingCard(a, b) {
  const card = {}
  for (const p of PROPERTY_NAMES) {
    card[p] = ((0 - a[p] - b[p]) % 3 + 3) % 3
  }
  return card
}

// First property (in a fixed order) that fails the all-same-or-all-different
// rule — used for Easy mode's invalid-selection explanation (SPEC §8).
// Returns null if the three cards actually form a SET.
export function firstFailingProperty(a, b, c) {
  for (const p of PROPERTY_NAMES) {
    if ((a[p] + b[p] + c[p]) % 3 !== 0) return p
  }
  return null
}
