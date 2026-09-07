// Data export / import / delete (IMPROVEMENT-PLAN.md Phase 4) — the one
// place a cross-game shared utility genuinely earns its keep, since backup
// and recovery need to see every game's localStorage keys at once.

import { getAllSessions } from './sessionModel.js'

const GAME_PREFIXES = ['stroop:', 'schulte:', 'nback:', 'sudoku:', 'set:', 'sequence-memory:', 'switchtrail:']
export const SCHEMA_VERSION = 1

function safeGet(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // localStorage unavailable or quota exceeded — caller sees this in the
    // returned write count rather than a thrown error mid-import.
    return false
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // nothing to remove if localStorage isn't available in the first place
  }
}

function safeParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function ownKeys() {
  try {
    return Object.keys(localStorage).filter((key) => GAME_PREFIXES.some((p) => key.startsWith(p)))
  } catch {
    return []
  }
}

export function buildExport() {
  const data = {}
  for (const key of ownKeys()) {
    const value = safeParse(safeGet(key))
    if (value !== null) data[key] = value
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: __APP_VERSION__,
    data,
  }
}

// A short summary for confirming an import before it's applied — how many
// keys, broken down per game.
export function describeExport(exported) {
  const keys = Object.keys(exported?.data || {})
  const byGame = {}
  for (const prefix of GAME_PREFIXES) {
    const game = prefix.slice(0, -1)
    byGame[game] = keys.filter((k) => k.startsWith(prefix)).length
  }
  return { totalKeys: keys.length, byGame }
}

// Throws a specific, user-readable Error on any problem; returns the list of
// recognized keys on success. Never writes anything — validation only.
export function validateImportFile(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('This file is not a valid export — expected a JSON object.')
  }
  if (typeof parsed.schemaVersion !== 'number') {
    throw new Error('This file has no schemaVersion — it may not be an export from this app.')
  }
  if (parsed.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `This file was exported by a newer version of the app (schema ${parsed.schemaVersion}; ` +
      `this app reads up to schema ${SCHEMA_VERSION}). Update the app before importing it.`
    )
  }
  if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
    throw new Error('This file is missing its data section.')
  }
  const keys = Object.keys(parsed.data).filter((k) => GAME_PREFIXES.some((p) => k.startsWith(p)))
  if (keys.length === 0) {
    throw new Error('This file does not contain any recognizable game data.')
  }
  return keys
}

// Merge policy: history (array-valued keys) are concatenated, de-duplicated
// by exact content match, and re-sorted chronologically — safe, since two
// history lists can only ever grow the combined record. Non-array keys
// (stats/best/active — single objects whose fields need per-game tie-break
// rules, e.g. "is this completion time actually better") keep the LOCAL
// value whenever one already exists: incoming data only fills a gap where
// nothing local exists yet. This never discards local data on merge, at the
// cost of not picking the objectively-better side of a conflict — a fully
// domain-aware merge is out of scope for this pass (see IMPROVEMENT-PLAN.md).
export function mergeValue(existing, incoming) {
  if (existing === null || existing === undefined) return incoming
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    const seen = new Set()
    const combined = []
    for (const entry of [...existing, ...incoming]) {
      const fingerprint = JSON.stringify(entry)
      if (seen.has(fingerprint)) continue
      seen.add(fingerprint)
      combined.push(entry)
    }
    combined.sort((a, b) => new Date(a.completedAt || a.date || 0) - new Date(b.completedAt || b.date || 0))
    return combined
  }
  return existing
}

export function applyImport(parsed, mode) {
  const incomingKeys = validateImportFile(parsed)

  if (mode === 'replace') {
    for (const key of ownKeys()) safeRemove(key)
    let written = 0
    for (const key of incomingKeys) {
      if (safeSet(key, parsed.data[key])) written += 1
    }
    return { mode, keysWritten: written, keysAttempted: incomingKeys.length }
  }

  if (mode === 'merge') {
    let written = 0
    for (const key of incomingKeys) {
      const existing = safeParse(safeGet(key))
      const merged = mergeValue(existing, parsed.data[key])
      if (safeSet(key, merged)) written += 1
    }
    return { mode, keysWritten: written, keysAttempted: incomingKeys.length }
  }

  throw new Error(`Unknown import mode: ${mode}`)
}

export function deleteAllData() {
  const keys = ownKeys()
  for (const key of keys) safeRemove(key)
  return { keysDeleted: keys.length }
}

// Rough approximation of what this app's data actually occupies — key +
// value string lengths (UTF-16 code units, same unit localStorage's own
// quota is measured in), not exact bytes, but close enough for "how much am
// I using" context.
export function storageFootprintChars() {
  let total = 0
  for (const key of ownKeys()) {
    total += key.length + (safeGet(key) || '').length
  }
  return total
}

const CSV_COLUMNS = ['game', 'difficulty', 'mode', 'completedAt', 'primaryMetric', 'accuracy', 'medianRT', 'mistakes', 'hints', 'duration']

export function csvEscape(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

// A flattened, spreadsheet-friendly view across every game's history, built
// on top of the common session model (sessionModel.js) rather than
// reimplementing per-game field access here.
export function buildHistoryCSV() {
  const rows = getAllSessions()
  const header = CSV_COLUMNS.join(',')
  const lines = rows.map((row) => CSV_COLUMNS.map((col) => csvEscape(row[col])).join(','))
  return [header, ...lines].join('\n')
}
