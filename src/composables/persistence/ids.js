// Identifier helpers for durable records (BRAIN-SYNC-SPEC §7, §19, §33).
//
// randomUUID() is for anything newly created: device IDs and new session
// IDs. It uses the platform CSPRNG only — crypto.randomUUID() where
// available, otherwise an RFC 9562 v4 UUID built from
// crypto.getRandomValues(). The fallback matters because randomUUID() only
// exists in secure contexts (HTTPS/localhost), and the dev server is
// routinely opened over plain http on a LAN IP (docker-compose.yml).
//
// contentUUID() is only for the one-time legacy migration: sessions
// written before IDs existed get an ID derived from their own content, so
// the same legacy entry gets the SAME ID on every device that holds a copy
// (e.g. via an old Export -> Import) and later dedupes instead of doubling.
// It is an identity hash, not a security primitive — nothing about it needs
// to be unguessable — so a small synchronous non-cryptographic 128-bit hash
// (cyrb128) is used rather than async crypto.subtle, which would make
// startup migration async and is also unavailable outside secure contexts.

export function randomUUID() {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') {
    try {
      return c.randomUUID()
    } catch {
      // insecure context in some engines — fall through
    }
  }
  const bytes = new Uint8Array(16)
  c.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // RFC 9562 variant
  return formatUUID(bytes)
}

// cyrb128 (public domain, bryc) — four interleaved 32-bit lanes.
function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  h1 ^= h2 ^ h3 ^ h4
  h2 ^= h1
  h3 ^= h1
  h4 ^= h1
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0]
}

// Deterministic RFC 9562 v8 ("custom") UUID — the version nibble alone
// tells a derived legacy ID apart from a random v4 one.
export function contentUUID(str) {
  const bytes = new Uint8Array(16)
  cyrb128(str).forEach((word, i) => {
    bytes[i * 4] = word >>> 24
    bytes[i * 4 + 1] = (word >>> 16) & 0xff
    bytes[i * 4 + 2] = (word >>> 8) & 0xff
    bytes[i * 4 + 3] = word & 0xff
  })
  bytes[6] = (bytes[6] & 0x0f) | 0x80 // version 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // RFC 9562 variant
  return formatUUID(bytes)
}

function formatUUID(bytes) {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// JSON with object keys sorted, so two structurally equal values always
// serialize identically regardless of property insertion order.
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
}
