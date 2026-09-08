// Storage for Benchmark-mode sessions, kept
// entirely separate from each game's normal play history/stats/best-scores,
// so an ordinary Play round can never silently feed a Benchmark comparison
// and vice versa. Sessions are built via sessionModel.js's mapper functions
// (same common shape as Play history) and stamped here with sessionType and
// benchmarkVersion — the one place that stamping happens, so it can't be
// forgotten at a call site.

import { BENCHMARK_VERSION, BENCHMARK_CONFIGS } from '../constants/benchmark.js'

const PREFIX = 'benchmark:history:'
const MAX_ENTRIES = 50

function keyFor(game) {
  return `${PREFIX}${game}`
}

function read(game) {
  try {
    const raw = localStorage.getItem(keyFor(game))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function write(game, entries) {
  try {
    localStorage.setItem(keyFor(game), JSON.stringify(entries))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — silently skip persistence
  }
}

export function useBenchmarkHistory() {
  function getHistory(game) {
    return read(game)
  }

  function getAllHistory() {
    const all = []
    for (const game of Object.keys(BENCHMARK_CONFIGS)) all.push(...read(game))
    return all.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
  }

  // `session` is a common-shape session object (see sessionModel.js) with
  // sessionType still 'play' — this is where it becomes a benchmark record.
  function recordBenchmarkSession(session) {
    const stamped = { ...session, sessionType: 'benchmark', benchmarkVersion: BENCHMARK_VERSION }
    const entries = read(session.game)
    entries.push(stamped)
    write(session.game, entries.slice(-MAX_ENTRIES))
    return stamped
  }

  return { getHistory, getAllHistory, recordBenchmarkSession }
}
