// Pure, deterministic merge engine for Brain's durable progress
// (BRAIN-SYNC-SPEC §23-§27, §32, §45, §50). No storage, no network, no
// clocks — two data snapshots in, one merged snapshot out.
//
// A snapshot is the canonical `{ [storageKey]: parsedValue }` shape at
// CURRENT_SCHEMA_VERSION — the same shape as an export file's `data` and
// as persistence/migrations.js operates on. Callers migrate first.
//
// Whole-profile last-write-wins is never used. Each key is merged at its
// smallest meaningful unit, and every per-key merge is a join: commutative,
// associative and idempotent, so any number of devices merging in any order
// and any grouping converge on the same state:
//
//   history      <g>:history…        UNION by sessionId
//   bests        best-record fields   the game's own "is better" order
//                (mergeRules.js), eligibility re-checked; ties broken by
//                content, never by timestamp
//   progress     <g>:progress         completedLevels UNION; highestUnlocked
//                and star totals re-derived from the merged state
//   counters     started/completed/   MAX — never regresses, never
//                totals/streaks       double-counts (a lower bound; see
//                                     specs/BRAIN-SYNC-AUDIT.md §4.2)
//   samples      completions[]        multiset UNION
//   learning     flagsoftheworld:     per country, the more-informed
//                learning             record (more attempts) — interim,
//                                     until per-attempt events exist
//   anything else                     generic join (mergeGeneric)
//
// Device-local keys (autosaves, UI flags) are never part of a sync
// snapshot. A key missing from the result is NOT a deletion: callers
// write the keys the merge returns and leave everything else alone.

import { isGameKey, isHistoryKey } from '../../constants/storageKeys.js'
import { stableStringify } from '../persistence/ids.js'
import { statsRulesFor, BEST_KEY_RULES, LEVEL_GAMES, isDeviceLocalKey } from './mergeRules.js'

const LEARNING_KEY = 'flagsoftheworld:learning'
const LEARNING_RULE = { order: [['attempts', 'max']] }

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const same = (a, b) => stableStringify(a) === stableStringify(b)
const gameOf = (key) => key.slice(0, key.indexOf(':'))

// Deterministic tie-break for two different values: larger canonical
// serialization wins. Arbitrary but total, which is all a join needs.
function byContent(a, b) {
  return stableStringify(a) >= stableStringify(b) ? a : b
}

export function syncableData(data) {
  const out = {}
  for (const [key, value] of Object.entries(data ?? {})) {
    if (isGameKey(key) && !isDeviceLocalKey(key) && value !== undefined) out[key] = value
  }
  return out
}

// ---- bests ---------------------------------------------------------------

function compareField(direction, a, b) {
  if (direction === 'true') return (a === true) - (b === true)
  const aNum = typeof a === 'number' && Number.isFinite(a)
  const bNum = typeof b === 'number' && Number.isFinite(b)
  if (!aNum || !bNum) return aNum - bNum // a missing/invalid value always loses
  if (a === b) return 0
  return direction === 'max' ? (a > b ? 1 : -1) : (a < b ? 1 : -1)
}

// > 0 when a is the better record under `order`, < 0 when b is, 0 on a tie.
export function compareByOrder(order, a, b) {
  for (const [field, direction] of order) {
    const c = compareField(direction, a[field], b[field])
    if (c !== 0) return c
  }
  return 0
}

export function pickBest(rule, a, b) {
  const valid = (r) => isPlainObject(r) && (!rule.eligible || rule.eligible(r))
  const aOk = valid(a)
  const bOk = valid(b)
  if (!aOk && !bOk) return null
  if (!aOk) return b
  if (!bOk) return a
  const c = compareByOrder(rule.order, a, b)
  if (c > 0) return a
  if (c < 0) return b
  return byContent(a, b)
}

// ---- generic join -------------------------------------------------------

function timeOf(v) {
  return isPlainObject(v) ? String(v.completedAt ?? v.date ?? '') : ''
}

function orderItems(x, y) {
  const t = timeOf(x).localeCompare(timeOf(y))
  if (t !== 0) return t
  if (typeof x === 'number' && typeof y === 'number') return x - y
  const sx = stableStringify(x)
  const sy = stableStringify(y)
  return sx < sy ? -1 : sx > sy ? 1 : 0
}

// Multiset union: each distinct item appears max(countA, countB) times.
function multisetUnion(a, b) {
  const count = (list) => {
    const m = new Map()
    for (const item of list) {
      const k = stableStringify(item)
      const slot = m.get(k)
      if (slot) slot.n += 1
      else m.set(k, { item, n: 1 })
    }
    return m
  }
  const ca = count(a)
  const cb = count(b)
  const out = []
  for (const k of new Set([...ca.keys(), ...cb.keys()])) {
    const slot = ca.get(k) ?? cb.get(k)
    const n = Math.max(ca.get(k)?.n ?? 0, cb.get(k)?.n ?? 0)
    for (let i = 0; i < n; i++) out.push(slot.item)
  }
  return out.sort(orderItems)
}

export function mergeGeneric(a, b) {
  if (a === undefined || a === null) return b === undefined ? a : b
  if (b === undefined || b === null) return a
  if (same(a, b)) return a
  if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b)
  if (typeof a === 'boolean' && typeof b === 'boolean') return a || b
  if (Array.isArray(a) && Array.isArray(b)) return multisetUnion(a, b)
  if (isPlainObject(a) && isPlainObject(b)) {
    const out = {}
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = mergeGeneric(a[k], b[k])
    return out
  }
  return byContent(a, b)
}

// ---- per-kind merges ----------------------------------------------------

export function mergeHistory(a, b) {
  const byId = new Map()
  const anonymous = [[], []]
  ;[a, b].forEach((list, side) => {
    for (const entry of list) {
      const id = isPlainObject(entry) && typeof entry.sessionId === 'string' ? entry.sessionId : null
      if (id === null) anonymous[side].push(entry)
      else byId.set(id, byId.has(id) ? byContent(byId.get(id), entry) : entry)
    }
  })
  const merged = [...byId.values(), ...multisetUnion(anonymous[0], anonymous[1])]
  return merged.sort((x, y) => orderItems(x, y) || String(x?.sessionId ?? '').localeCompare(String(y?.sessionId ?? '')))
}

function mergeRecords(rules, a, b) {
  const rest = (obj) => Object.fromEntries(Object.entries(obj).filter(([k]) => !(k in rules)))
  const out = mergeGeneric(rest(a), rest(b))
  for (const [field, rule] of Object.entries(rules)) {
    if (field in a || field in b) out[field] = pickBest(rule, a[field], b[field])
  }
  return out
}

function mergeLearning(a, b) {
  const out = {}
  for (const code of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const picked = pickBest(LEARNING_RULE, a[code], b[code])
    out[code] = picked ?? mergeGeneric(a[code], b[code])
  }
  return out
}

function kindOf(key) {
  const game = gameOf(key)
  if (isHistoryKey(key)) return { kind: 'history' }
  if (key === LEARNING_KEY) return { kind: 'learning' }
  if (key.startsWith(`${game}:stats:`)) {
    const rules = statsRulesFor(game, key.slice(`${game}:stats:`.length))
    if (rules) return { kind: 'stats', rules }
  }
  if (key.startsWith(`${game}:best:`) && BEST_KEY_RULES[game]) return { kind: 'best', rule: BEST_KEY_RULES[game] }
  return { kind: 'generic' }
}

// §45: a structurally invalid value is treated as absent — it can never
// displace a valid one.
function isValid(kind, value) {
  if (value === undefined) return false
  if (kind === 'history') return Array.isArray(value)
  if (kind === 'stats' || kind === 'learning') return isPlainObject(value)
  if (kind === 'best') return value === null || isPlainObject(value)
  return true
}

export function mergeKey(key, a, b) {
  const spec = kindOf(key)
  const aOk = isValid(spec.kind, a)
  const bOk = isValid(spec.kind, b)
  if (!aOk && !bOk) return undefined
  if (!bOk) return a
  if (!aOk) return b
  if (same(a, b)) return a
  switch (spec.kind) {
    case 'history':
      return mergeHistory(a, b)
    case 'stats':
      return mergeRecords(spec.rules, a, b)
    case 'best':
      return pickBest(spec.rule, a, b)
    case 'learning':
      return mergeLearning(a, b)
    default:
      return mergeGeneric(a, b)
  }
}

// ---- derived campaign progress (§25) ------------------------------------

function deriveProgress(data) {
  for (const [game, { levelCount }] of Object.entries(LEVEL_GAMES)) {
    const key = `${game}:progress`
    const progress = data[key]
    if (!isPlainObject(progress)) continue
    // completedLevels itself was already merged (set union, canonically
    // sorted whenever the two sides differed) — only read here, so a
    // device's own first-completion order survives merge(A, A) untouched.
    const completed = [...new Set((progress.completedLevels ?? []).filter(Number.isInteger))].sort((x, y) => x - y)
    const derived = { ...progress }
    // Every campaign in the suite unlocks the next level on ANY completion,
    // so completion alone determines progression. MAX with the stored value
    // so a merge can never re-lock a level.
    const fromCompletion = completed.length ? Math.min(completed[completed.length - 1] + 1, levelCount) : 1
    derived.highestUnlocked = Math.max(typeof progress.highestUnlocked === 'number' ? progress.highestUnlocked : 1, fromCompletion)
    const bestStars = (level) => data[`${game}:stats:${level}`]?.best?.stars ?? 0
    if ('totalStars' in progress) derived.totalStars = completed.reduce((sum, level) => sum + bestStars(level), 0)
    if ('threeStarLevels' in progress) derived.threeStarLevels = completed.filter((level) => bestStars(level) === 3).length
    data[key] = derived
  }
  return data
}

// ---- public API ---------------------------------------------------------

export function mergeData(a, b) {
  const left = syncableData(a)
  const right = syncableData(b)
  const out = {}
  for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
    const merged = mergeKey(key, left[key], right[key])
    if (merged !== undefined) out[key] = merged
  }
  return deriveProgress(out)
}

export function mergeAll(...snapshots) {
  return snapshots.reduce((acc, s) => mergeData(acc, s), {})
}

// §32: a short, user-presentable summary of what a merge added to `before`.
export function describeMerge(before, after) {
  const idsIn = (data) => {
    const ids = new Set()
    for (const [key, value] of Object.entries(data ?? {})) {
      if (isHistoryKey(key) && Array.isArray(value)) for (const e of value) if (e?.sessionId) ids.add(e.sessionId)
    }
    return ids
  }
  const had = idsIn(before)
  const newSessions = [...idsIn(after)].filter((id) => !had.has(id)).length

  const newlyCompletedLevels = {}
  for (const game of Object.keys(LEVEL_GAMES)) {
    const was = new Set(before?.[`${game}:progress`]?.completedLevels ?? [])
    const added = (after?.[`${game}:progress`]?.completedLevels ?? []).filter((l) => !was.has(l))
    if (added.length) newlyCompletedLevels[game] = added
  }

  const improvedBests = []
  for (const [key, value] of Object.entries(after ?? {})) {
    const spec = kindOf(key)
    if (spec.kind === 'best' && !same(value, before?.[key])) improvedBests.push(key)
    if (spec.kind === 'stats' && isPlainObject(value)) {
      for (const field of Object.keys(spec.rules)) {
        if (value[field] && !same(value[field], before?.[key]?.[field])) improvedBests.push(`${key}.${field}`)
      }
    }
  }
  return { newSessions, newlyCompletedLevels, improvedBests }
}
