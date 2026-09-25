// Structural limits for any value that crosses a device boundary (a sync
// payload, a server response, an imported file) before it reaches the
// recursive merge code (BRAIN-SYNC-SPEC §45/§53).
//
// Real Brain data is shallow (≤ 5 levels) and small; the limits are far
// above anything the games write, and exist only so a malformed or
// malicious value is rejected as data instead of exhausting the stack or
// reshaping objects. Checked iteratively, so the check itself can't
// overflow.

export const LIMITS = {
  maxDepth: 32,
  maxNodes: 250000,
}

// Keys that would change an object's prototype (or shadow it) when
// assigned with `obj[key] = …`. Never meaningful in Brain data.
export const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function isSafeKey(key) {
  return !UNSAFE_KEYS.has(key)
}

export function withinLimits(value, { maxDepth = LIMITS.maxDepth, maxNodes = LIMITS.maxNodes } = {}) {
  const stack = [[value, 0]]
  let nodes = 0
  while (stack.length > 0) {
    const [current, depth] = stack.pop()
    if (++nodes > maxNodes) return false
    if (current === null || typeof current !== 'object') continue
    if (depth >= maxDepth) return false
    if (Array.isArray(current)) {
      for (const item of current) stack.push([item, depth + 1])
    } else {
      for (const key of Object.keys(current)) {
        if (!isSafeKey(key)) return false
        stack.push([current[key], depth + 1])
      }
    }
  }
  return true
}
