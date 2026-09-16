// Curated target/distractor letter pool (SPEC §6) — clearly distinguishable
// uppercase letters, deliberately excluding I, O and Q (easily confused
// with digits or other glyphs in a system font).
export const TARGETTAP_LETTER_POOL = ['A', 'B', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'U', 'V', 'X', 'Y']

// Per-target distractor exclusions (SPEC §11: "avoid visually confusing
// distractors for the selected target"). The pool above is already curated
// for mutual distinctiveness — spec's own examples (O vs Q, I vs L/1) refer
// to letters this pool doesn't even contain — so this stays small and
// conservative rather than fabricating confusions that don't clearly exist.
// A STARTING set, same caveat as Odd One Out's confusion-pair library: add
// or remove an entry only after real on-device font validation, never
// compensate for an unvalidated one with color/size tricks (SPEC §36/§37).
export const CONFUSION_EXCLUSIONS = {
  U: ['V'],
  V: ['U'],
  M: ['N'],
  N: ['M'],
}

// Every letter in the pool, minus the target itself and anything flagged as
// confusable with it (SPEC §11).
export function distractorPoolFor(target) {
  const excluded = new Set([target, ...(CONFUSION_EXCLUSIONS[target] || [])])
  return TARGETTAP_LETTER_POOL.filter((letter) => !excluded.has(letter))
}
