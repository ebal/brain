import { describe, it, expect } from 'vitest'
import {
  mapStroopEntry,
  mapSchulteEntry,
  mapNBackEntry,
  mapSudokuEntry,
  mapSetEntry,
  mapSequenceMemoryEntry,
  getAllSessions,
} from './sessionModel.js'

describe('mapStroopEntry', () => {
  it('maps every field, leaving untracked ones null', () => {
    const entry = { score: 850, accuracy: 92.5, avgResponseTime: 640, date: '2026-01-01T00:00:00.000Z' }
    const session = mapStroopEntry(entry, 'color', 'easy')
    expect(session).toEqual({
      id: 'stroop:color:easy:2026-01-01T00:00:00.000Z',
      game: 'stroop',
      difficulty: 'easy',
      mode: 'color',
      sessionType: 'play',
      startedAt: null,
      completedAt: '2026-01-01T00:00:00.000Z',
      duration: null,
      completed: true,
      primaryMetric: 850,
      accuracy: 92.5,
      medianRT: null,
      mistakes: null,
      hints: null,
      metricVersion: 1, // no metricVersion on the raw entry -> falls back to METRIC_VERSIONS.stroop
      appVersion: null, // no appVersion on the raw entry -> stays null rather than fabricated
    })
  })

  it('an entry that already carries metricVersion/appVersion (written after this feature existed) keeps them as-is', () => {
    const entry = {
      score: 850, accuracy: 92.5, avgResponseTime: 640, date: '2026-01-01T00:00:00.000Z',
      metricVersion: 1, appVersion: '1.0.0',
    }
    const session = mapStroopEntry(entry, 'color', 'easy')
    expect(session.metricVersion).toBe(1)
    expect(session.appVersion).toBe('1.0.0')
  })

  it('produces a different id for a different mode or difficulty with the same timestamp', () => {
    const entry = { score: 1, accuracy: 1, avgResponseTime: 1, date: 'X' }
    expect(mapStroopEntry(entry, 'color', 'easy').id).not.toBe(mapStroopEntry(entry, 'word', 'easy').id)
    expect(mapStroopEntry(entry, 'color', 'easy').id).not.toBe(mapStroopEntry(entry, 'color', 'hard').id)
  })
})

describe('mapSchulteEntry', () => {
  it('maps completionTime as both duration and primaryMetric', () => {
    const entry = { completionTime: 12345, errors: 2, accuracy: 90, avgSearchTime: 500, medianSearchTime: 450, date: '2026-01-02T00:00:00.000Z' }
    const session = mapSchulteEntry(entry, 'classic')
    expect(session.game).toBe('schulte')
    expect(session.difficulty).toBe('classic')
    expect(session.primaryMetric).toBe(12345)
    expect(session.duration).toBe(12345)
    expect(session.medianRT).toBe(450)
    expect(session.mistakes).toBe(2)
    expect(session.hints).toBeNull()
    expect(session.completed).toBe(true)
  })
})

describe('mapNBackEntry', () => {
  it('sums misses and false alarms into mistakes', () => {
    const entry = { score: 700, accuracy: 88, hits: 10, misses: 2, falseAlarms: 1, correctRejections: 27, avgRT: 500, medianRT: 480, date: 'X' }
    const session = mapNBackEntry(entry, 'classic')
    expect(session.mistakes).toBe(3)
    expect(session.medianRT).toBe(480)
    expect(session.primaryMetric).toBe(700)
    expect(session.duration).toBeNull() // self-paced, no round length
  })
})

describe('mapSudokuEntry', () => {
  it('uses puzzleId for the session id when present', () => {
    const entry = { puzzleId: 'easy-1234', difficulty: 'easy', completionTime: 60000, mistakes: 1, hints: 0, cleanSolve: true, completedAt: 'X' }
    expect(mapSudokuEntry(entry).id).toBe('sudoku:easy-1234')
    expect(mapSudokuEntry(entry).primaryMetric).toBe(60000)
    expect(mapSudokuEntry(entry).hints).toBe(0)
    expect(mapSudokuEntry(entry).accuracy).toBeNull()
  })

  it('falls back to a difficulty+timestamp id when puzzleId is missing', () => {
    const entry = { difficulty: 'easy', completionTime: 1, mistakes: 0, hints: 0, completedAt: '2026-01-01T00:00:00.000Z' }
    expect(mapSudokuEntry(entry).id).toBe('sudoku:easy:2026-01-01T00:00:00.000Z')
  })
})

describe('mapSetEntry', () => {
  it('maps medianFindTime to medianRT', () => {
    const entry = { gameId: 'set-9', difficulty: 'medium', completionTime: 40000, setsFound: 6, mistakes: 2, hints: 1, avgFindTime: 6000, medianFindTime: 5500, cleanGame: false, completedAt: 'X' }
    const session = mapSetEntry(entry)
    expect(session.id).toBe('set:set-9')
    expect(session.medianRT).toBe(5500)
    expect(session.hints).toBe(1)
    expect(session.mistakes).toBe(2)
  })
})

describe('mapSequenceMemoryEntry', () => {
  it('uses longestSequence as the primary metric', () => {
    const entry = { difficulty: 'medium', highestLevel: 7, longestSequence: 8, correctTaps: 30, mistakes: 2, accuracy: 94, avgTapTime: 500, medianTapTime: 470, duration: 25000, completedAt: 'X' }
    const session = mapSequenceMemoryEntry(entry)
    expect(session.primaryMetric).toBe(8)
    expect(session.duration).toBe(25000)
    expect(session.medianRT).toBe(470)
    expect(session.hints).toBeNull() // no hint concept in this game
  })
})

describe('getAllSessions', () => {
  it('never throws even with no localStorage available, and returns an array', () => {
    // In this Node test environment there is no global localStorage — every
    // underlying getHistory()/getDerivedStats() call degrades gracefully
    // (see each composable's own try/catch), so this should return [], not throw.
    expect(() => getAllSessions()).not.toThrow()
    expect(Array.isArray(getAllSessions())).toBe(true)
  })
})
