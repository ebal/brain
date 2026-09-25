// Recovery-code format (BRAIN-SYNC-SPEC §12), shared by the server (which
// generates codes) and the browser (which validates what a person types
// before sending it anywhere).
//
//   K7QM-2XRD-9HWA-TN4B-E1FJ-CZ6P-8SVC
//
// 27 random Crockford base32 symbols (135 bits from the platform CSPRNG —
// the grouping is cosmetic, the entropy is what matters) plus one check
// symbol, shown as 7 groups of 4. Crockford base32 leaves out I, L, O and U,
// and reading is forgiving: case, spaces and dashes are ignored, and I/L
// are read as 1, O as 0.
//
// The check symbol is Σ (i+1)·value(i) mod 31 over the body. 31 is prime
// and every weight is below it, so it catches any single mistyped body
// symbol and any swap of two neighbouring body symbols — except when the
// two symbols involved are 0 and Z (values 0 and 31, equal mod 31). A typo
// is thus nearly always reported locally instead of burning a rate-limited
// attempt. It is not a security feature and adds no entropy.

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const BODY_LENGTH = 27
const GROUP = 4

function checkSymbol(body) {
  let sum = 0
  for (let i = 0; i < body.length; i++) sum += (i + 1) * ALPHABET.indexOf(body[i])
  return ALPHABET[sum % 31]
}

// randomBytes(n) -> Uint8Array of n CSPRNG bytes (node:crypto's randomBytes
// on the server). Rejection sampling keeps every symbol uniformly likely.
export function generateRecoveryCode(randomBytes) {
  let body = ''
  while (body.length < BODY_LENGTH) {
    for (const byte of randomBytes(BODY_LENGTH)) {
      if (byte < 256 - (256 % 32) && body.length < BODY_LENGTH) body += ALPHABET[byte % 32]
    }
  }
  return formatRecoveryCode(body + checkSymbol(body))
}

// Canonical form (28 symbols, no separators), or null if the input can't
// be a recovery code at all.
export function normalizeRecoveryCode(input) {
  if (typeof input !== 'string') return null
  const cleaned = input.toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0')
  if (cleaned.length !== BODY_LENGTH + 1 || [...cleaned].some((c) => !ALPHABET.includes(c))) return null
  return cleaned
}

export function isValidRecoveryCode(input) {
  const code = normalizeRecoveryCode(input)
  return code !== null && checkSymbol(code.slice(0, BODY_LENGTH)) === code[BODY_LENGTH]
}

export function formatRecoveryCode(input) {
  const code = normalizeRecoveryCode(input) ?? input
  return code.match(new RegExp(`.{1,${GROUP}}`, 'g')).join('-')
}
