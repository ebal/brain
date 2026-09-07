// Common session-metadata model (IMPROVEMENT-PLAN.md Phase 3) — a shared
// shape for "a session happened," used only to support suite-wide views
// (a future Activity/Statistics dashboard, Benchmark/Baseline comparisons).
// Each game keeps writing and reading its own detailed history exactly as it
// always has; nothing here replaces that.
//
// Deliberately derive-on-demand rather than stored: the mapper functions
// below are pure (entry in, common-shape session out), so a session record
// can never drift out of sync with the per-game history it was derived from,
// and there is no second write path to keep consistent.
//
// Fields not tracked by a given game's history are left null rather than
// guessed — e.g. Stroop's history only ever stored avgResponseTime, never a
// median, so mapStroopEntry's medianRT is null, not a fabricated value.

import { DIFFICULTIES as STROOP_DIFFICULTIES, MODES as STROOP_MODES } from '../constants/colors.js'
import { SCHULTE_DIFFICULTIES } from '../constants/schulte/difficulties.js'
import { NBACK_DIFFICULTIES } from '../constants/nback/difficulties.js'
import { SWITCHTRAIL_DIFFICULTIES } from '../constants/switchtrail/difficulties.js'
import { SWITCHTRAIL_VARIANTS } from '../constants/switchtrail/variants.js'
import { useScoreHistory as useStroopHistory } from './useScoreHistory.js'
import { useScoreHistory as useSchulteHistory } from './schulte/useScoreHistory.js'
import { useScoreHistory as useNBackHistory } from './nback/useScoreHistory.js'
import { useSudokuStats } from './sudoku/useSudokuStats.js'
import { useSetStats } from './set/useSetStats.js'
import { useMemoryStats } from './sequence-memory/useMemoryStats.js'
import { useSwitchTrailStats } from './switchtrail/useSwitchTrailStats.js'

export function mapStroopEntry(entry, mode, difficultyKey) {
  return {
    id: `stroop:${mode}:${difficultyKey}:${entry.date}`,
    game: 'stroop',
    difficulty: difficultyKey,
    mode,
    sessionType: 'play',
    startedAt: null,
    completedAt: entry.date,
    duration: null, // fixed by difficulty config, not stored per-entry
    completed: true,
    primaryMetric: entry.score,
    accuracy: entry.accuracy,
    medianRT: null, // history stores avgResponseTime only, never a median
    mistakes: null, // history stores accuracy only, not a raw wrong-count
    hints: null, // Stroop has no hint concept
  }
}

export function mapSchulteEntry(entry, difficultyKey) {
  return {
    id: `schulte:${difficultyKey}:${entry.date}`,
    game: 'schulte',
    difficulty: difficultyKey,
    sessionType: 'play',
    startedAt: null,
    completedAt: entry.date,
    duration: entry.completionTime,
    completed: true,
    primaryMetric: entry.completionTime,
    accuracy: entry.accuracy,
    medianRT: entry.medianSearchTime,
    mistakes: entry.errors,
    hints: null, // Schulte has no hint concept
  }
}

export function mapNBackEntry(entry, difficultyKey) {
  return {
    id: `nback:${difficultyKey}:${entry.date}`,
    game: 'nback',
    difficulty: difficultyKey,
    sessionType: 'play',
    startedAt: null,
    completedAt: entry.date,
    duration: null, // self-paced — no round-length concept
    completed: true,
    primaryMetric: entry.score,
    accuracy: entry.accuracy,
    medianRT: entry.medianRT,
    mistakes: entry.misses + entry.falseAlarms,
    hints: null, // N-Back has no hint concept
  }
}

export function mapSudokuEntry(entry) {
  return {
    id: entry.puzzleId ? `sudoku:${entry.puzzleId}` : `sudoku:${entry.difficulty}:${entry.completedAt}`,
    game: 'sudoku',
    difficulty: entry.difficulty,
    sessionType: 'play',
    startedAt: null,
    completedAt: entry.completedAt,
    duration: entry.completionTime,
    completed: true,
    primaryMetric: entry.completionTime,
    accuracy: null, // Sudoku's history doesn't store an accuracy percentage
    medianRT: null,
    mistakes: entry.mistakes,
    hints: entry.hints,
  }
}

export function mapSetEntry(entry) {
  return {
    id: entry.gameId ? `set:${entry.gameId}` : `set:${entry.difficulty}:${entry.completedAt}`,
    game: 'set',
    difficulty: entry.difficulty,
    sessionType: 'play',
    startedAt: null,
    completedAt: entry.completedAt,
    duration: entry.completionTime,
    completed: true,
    primaryMetric: entry.completionTime,
    accuracy: null, // SET's history doesn't store an accuracy percentage
    medianRT: entry.medianFindTime,
    mistakes: entry.mistakes,
    hints: entry.hints,
  }
}

export function mapSequenceMemoryEntry(entry) {
  return {
    id: `sequence-memory:${entry.difficulty}:${entry.completedAt}`,
    game: 'sequence-memory',
    difficulty: entry.difficulty,
    sessionType: 'play',
    startedAt: null,
    completedAt: entry.completedAt,
    duration: entry.duration,
    completed: true,
    primaryMetric: entry.longestSequence,
    accuracy: entry.accuracy,
    medianRT: entry.medianTapTime,
    mistakes: entry.mistakes,
    hints: null, // Sequence Memory has no hint concept
  }
}

// mode here is a Switch Trail variant key ('classic' | 'color', see
// constants/switchtrail/variants.js) — named `mode` to match mapStroopEntry's
// parameter, since both feed the same common session-shape `mode` field.
export function mapSwitchTrailEntry(entry, mode = 'classic') {
  return {
    id: `switchtrail:${mode}:${entry.difficulty}:${entry.completedAt}`,
    game: 'switchtrail',
    difficulty: entry.difficulty,
    mode,
    sessionType: 'play',
    startedAt: null,
    completedAt: entry.completedAt,
    duration: entry.completionTime,
    completed: entry.completed,
    primaryMetric: entry.score,
    accuracy: entry.accuracy,
    medianRT: entry.medianTransitionTime,
    mistakes: entry.errors,
    hints: null, // Switch Trail has no hint concept
  }
}

// Touches localStorage (via each game's own history/stats composable) to
// aggregate every session across all six games into one common-shape list,
// sorted oldest first. Nothing here is unit-tested directly — correctness
// follows from the pure mapper functions above (which are) plus each game's
// already-established getHistory()/getDerivedStats() reads.
export function getAllSessions() {
  const sessions = []

  const stroopHistory = useStroopHistory()
  for (const mode of Object.keys(STROOP_MODES)) {
    for (const difficultyKey of Object.keys(STROOP_DIFFICULTIES)) {
      for (const entry of stroopHistory.getHistory(mode, difficultyKey)) {
        sessions.push(mapStroopEntry(entry, mode, difficultyKey))
      }
    }
  }

  const schulteHistory = useSchulteHistory()
  for (const difficultyKey of Object.keys(SCHULTE_DIFFICULTIES)) {
    for (const entry of schulteHistory.getHistory(difficultyKey)) {
      sessions.push(mapSchulteEntry(entry, difficultyKey))
    }
  }

  const nbackHistory = useNBackHistory()
  for (const difficultyKey of Object.keys(NBACK_DIFFICULTIES)) {
    for (const entry of nbackHistory.getHistory(difficultyKey)) {
      sessions.push(mapNBackEntry(entry, difficultyKey))
    }
  }

  const sudokuStats = useSudokuStats()
  for (const entry of sudokuStats.getHistory('all')) sessions.push(mapSudokuEntry(entry))

  const setStats = useSetStats()
  for (const entry of setStats.getHistory('all')) sessions.push(mapSetEntry(entry))

  const memoryStats = useMemoryStats()
  for (const entry of memoryStats.getHistory('all')) sessions.push(mapSequenceMemoryEntry(entry))

  const switchTrailStats = useSwitchTrailStats()
  for (const variant of Object.values(SWITCHTRAIL_VARIANTS)) {
    for (const difficultyKey of Object.keys(SWITCHTRAIL_DIFFICULTIES)) {
      for (const entry of switchTrailStats.getHistory(difficultyKey, variant.key)) {
        sessions.push(mapSwitchTrailEntry(entry, variant.key))
      }
    }
  }

  sessions.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
  return sessions
}
