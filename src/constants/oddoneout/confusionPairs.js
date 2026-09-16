// Curated confusion-pair library (SPEC §9/§30) — the ONLY source of
// base/odd character pairs the generator draws from. Never generate an
// arbitrary pair at runtime (SPEC §9): every pair a trial can use is listed
// here, with an explicit difficulty range.
//
// Difficulty axis: how visually similar `base` and `odd` are meant to be.
// - 'obvious' tier (minimumDifficulty 'easy'): clearly distinct silhouettes,
//   matching SPEC §5 Easy's "clearly different digit/letter".
// - 'confusable' tier (minimumDifficulty 'hard'+): SPEC §9's own example
//   pairs — genuinely similar shapes within the same character family.
// - 'mixed' family (minimumDifficulty 'expert'): cross-family look-alikes
//   (O/0, B/8, I/1) — SPEC §4 explicitly says these "should be introduced
//   only at higher difficulty because it can depend on the rendering font".
//
// This is a STARTING set, not a final one — SPEC §9/§27 repeatedly require
// validating every pair on the actual target font/device before trusting it
// in a scored difficulty. Nothing here has had that on-device pass yet.
// If a pair turns out unreliable, delete it from this file (or narrow its
// range) rather than compensating with color/weight/size (SPEC §26/§27).
export const CONFUSION_PAIRS = [
  // --- Numbers: obvious (Easy/Medium) ---
  { id: 'num-0-5', family: 'numbers', base: '0', odd: '5', minimumDifficulty: 'easy', maximumDifficulty: 'hard', notes: 'Round vs. open-topped digit.' },
  { id: 'num-2-4', family: 'numbers', base: '2', odd: '4', minimumDifficulty: 'easy', maximumDifficulty: 'hard', notes: 'Distinct stroke shapes.' },
  { id: 'num-0-7', family: 'numbers', base: '0', odd: '7', minimumDifficulty: 'easy', maximumDifficulty: 'hard', notes: 'Round vs. angular digit.' },
  { id: 'num-4-9', family: 'numbers', base: '4', odd: '9', minimumDifficulty: 'easy', maximumDifficulty: 'hard', notes: 'Distinct stroke shapes.' },
  { id: 'num-2-6', family: 'numbers', base: '2', odd: '6', minimumDifficulty: 'easy', maximumDifficulty: 'hard', notes: 'Distinct stroke shapes.' },
  { id: 'num-5-7', family: 'numbers', base: '5', odd: '7', minimumDifficulty: 'easy', maximumDifficulty: 'hard', notes: 'Distinct stroke shapes.' },

  // --- Numbers: confusable (Hard - Extreme) — SPEC §9 ---
  { id: 'num-6-9', family: 'numbers', base: '6', odd: '9', minimumDifficulty: 'hard', maximumDifficulty: 'extreme', notes: 'Rotationally similar loop-and-tail shape.' },
  { id: 'num-8-3', family: 'numbers', base: '8', odd: '3', minimumDifficulty: 'hard', maximumDifficulty: 'extreme', notes: 'Both built from stacked curves.' },
  { id: 'num-1-7', family: 'numbers', base: '1', odd: '7', minimumDifficulty: 'hard', maximumDifficulty: 'extreme', notes: 'Similar vertical stroke with a short flag/bar.' },

  // --- Numbers: multi-character (Hard - Extreme) — SPEC §9 ---
  { id: 'num-68-86', family: 'numbers', base: '68', odd: '86', minimumDifficulty: 'hard', maximumDifficulty: 'extreme', notes: 'Same digits, transposed order.' },
  { id: 'num-69-96', family: 'numbers', base: '69', odd: '96', minimumDifficulty: 'hard', maximumDifficulty: 'extreme', notes: 'Same digits, transposed order.' },

  // --- Letters: obvious (Easy/Medium) ---
  { id: 'letters-h-t', family: 'letters', base: 'H', odd: 'T', minimumDifficulty: 'easy', maximumDifficulty: 'hard', notes: 'Distinct stroke shapes.' },
  { id: 'letters-l-v', family: 'letters', base: 'L', odd: 'V', minimumDifficulty: 'easy', maximumDifficulty: 'hard', notes: 'Distinct stroke shapes.' },
  { id: 'letters-f-z', family: 'letters', base: 'F', odd: 'Z', minimumDifficulty: 'easy', maximumDifficulty: 'hard', notes: 'Distinct stroke shapes.' },
  { id: 'letters-k-s', family: 'letters', base: 'K', odd: 'S', minimumDifficulty: 'easy', maximumDifficulty: 'hard', notes: 'Distinct stroke shapes.' },
  { id: 'letters-d-y', family: 'letters', base: 'D', odd: 'Y', minimumDifficulty: 'easy', maximumDifficulty: 'hard', notes: 'Distinct stroke shapes.' },
  { id: 'letters-a-u', family: 'letters', base: 'A', odd: 'U', minimumDifficulty: 'easy', maximumDifficulty: 'hard', notes: 'Distinct stroke shapes.' },

  // --- Letters: confusable (Hard - Extreme) — SPEC §9 ---
  { id: 'letters-c-g', family: 'letters', base: 'C', odd: 'G', minimumDifficulty: 'hard', maximumDifficulty: 'extreme', notes: 'Same open-curve shape, G adds a short bar.' },
  { id: 'letters-m-n', family: 'letters', base: 'M', odd: 'N', minimumDifficulty: 'hard', maximumDifficulty: 'extreme', notes: 'Same vertical-stroke-plus-diagonal family.' },
  { id: 'letters-e-f', family: 'letters', base: 'E', odd: 'F', minimumDifficulty: 'hard', maximumDifficulty: 'extreme', notes: 'Same shape minus the bottom bar.' },
  { id: 'letters-p-r', family: 'letters', base: 'P', odd: 'R', minimumDifficulty: 'hard', maximumDifficulty: 'extreme', notes: 'Same bowl shape, R adds a leg.' },
  { id: 'letters-o-q', family: 'letters', base: 'O', odd: 'Q', minimumDifficulty: 'hard', maximumDifficulty: 'extreme', notes: 'Same round shape, Q adds a small tail.' },

  // --- Mixed / ambiguous characters (Expert - Extreme only) — SPEC §4/§9 ---
  { id: 'mixed-o-0', family: 'mixed', base: 'O', odd: '0', minimumDifficulty: 'expert', maximumDifficulty: 'extreme', notes: 'Letter O vs. digit zero — font-dependent, validate before trusting.' },
  { id: 'mixed-b-8', family: 'mixed', base: 'B', odd: '8', minimumDifficulty: 'expert', maximumDifficulty: 'extreme', notes: 'Letter B vs. digit eight — font-dependent, validate before trusting.' },
  { id: 'mixed-i-1', family: 'mixed', base: 'I', odd: '1', minimumDifficulty: 'expert', maximumDifficulty: 'extreme', notes: 'Letter I vs. digit one — font-dependent, validate before trusting.' },
]
