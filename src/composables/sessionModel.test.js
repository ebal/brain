import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  mapStroopEntry,
  mapSchulteEntry,
  mapNBackEntry,
  mapSudokuEntry,
  mapSetEntry,
  mapSequenceMemoryEntry,
  mapMentalRotationEntry,
  mapNumberMatchEntry,
  getAllSessions,
} from './sessionModel.js'
import { useScoreHistory as useStroopHistory } from './useScoreHistory.js'
import { useScoreHistory as useSchulteHistory } from './schulte/useScoreHistory.js'
import { useScoreHistory as useNBackHistory } from './nback/useScoreHistory.js'
import { useSudokuStats } from './sudoku/useSudokuStats.js'
import { useSetStats } from './set/useSetStats.js'
import { useMemoryStats } from './sequence-memory/useMemoryStats.js'
import { useSwitchTrailStats } from './switchtrail/useSwitchTrailStats.js'
import { useMemoryPairsStats } from './memorypairs/useMemoryPairsStats.js'
import { useMarbleJumpStats } from './marblejump/useMarbleJumpStats.js'
import { useMentalRotationStats } from './mentalrotation/useMentalRotationStats.js'
import { useEmojiMahjongStats } from './emojimahjong/useEmojiMahjongStats.js'
import { useNumberMatchStats } from './numbermatch/useNumberMatchStats.js'
import { useOddOneOutStats } from './oddoneout/useOddOneOutStats.js'
import { useTargetTapStats } from './targettap/useTargetTapStats.js'
import { useHanoiStats } from './hanoi/useHanoiStats.js'
import { useLightsOutStats } from './lightsout/useLightsOutStats.js'
import { useWhackAMoleStats } from './whackamole/useWhackAMoleStats.js'
import { useFlagsStats } from './flags/useFlagsStats.js'

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

// Regression for a real bug: this mapper used to drop `mode` entirely, and
// getAllSessions() only ever read the 'timed' history key, so Untimed
// sessions were invisible to Activity/CSV.
describe('mapMentalRotationEntry', () => {
  it('carries mode through onto the common-shape session', () => {
    const entry = { difficulty: 'easy', mode: 'untimed', score: 500, accuracy: 90, medianRT: 600, wrong: 1, completedAt: 'X' }
    const session = mapMentalRotationEntry(entry)
    expect(session.mode).toBe('untimed')
    expect(session.id).toContain('untimed')
  })

  it('defaults to timed mode for older entries recorded before the mode field existed', () => {
    const entry = { difficulty: 'easy', score: 500, accuracy: 90, medianRT: 600, wrong: 1, completedAt: 'X' }
    expect(mapMentalRotationEntry(entry).mode).toBe('timed')
  })
})

// Regression for a real bug: Number Match had no mapper at all, so it was
// entirely invisible to Activity/CSV even though its raw localStorage keys
// were (and still are) correctly covered by Export/Import/Delete-All.
describe('mapNumberMatchEntry', () => {
  it('maps boardCleared to completed and completionTime to duration', () => {
    const entry = {
      difficulty: 'easy', boardCleared: true, score: 3200, completionTime: 42000,
      mistakes: 2, hints: 1, completedAt: 'X',
    }
    const session = mapNumberMatchEntry(entry)
    expect(session.game).toBe('numbermatch')
    expect(session.completed).toBe(true)
    expect(session.duration).toBe(42000)
    expect(session.primaryMetric).toBe(3200)
    expect(session.mistakes).toBe(2)
    expect(session.hints).toBe(1)
  })
})

// The exact regression the two bugs above should have been caught by:
// seed one real completion per game (through each game's own recordCompletion,
// not hand-built localStorage entries, so this exercises the real write
// path too) and assert every single one of them surfaces in getAllSessions().
// A minimal in-memory localStorage is installed since this environment's
// built-in global one no-ops without a --localstorage-file flag.
describe('getAllSessions (full-suite regression)', () => {
  let restore

  beforeEach(() => {
    const fake = {}
    Object.defineProperties(fake, {
      getItem: { value: (k) => (k in fake ? fake[k] : null) },
      setItem: { value: (k, v) => { fake[k] = v } },
      removeItem: { value: (k) => { delete fake[k] } },
    })
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true, writable: true })
    restore = () => Object.defineProperty(globalThis, 'localStorage', { value: original, configurable: true, writable: true })
  })

  afterEach(() => restore())

  it('every one of the 18 games appears at least once after a completion is recorded for each', () => {
    useStroopHistory().addEntry('color', 'easy', { score: 1, accuracy: 1, avgResponseTime: 1 })
    useSchulteHistory().addEntry('classic', { completionTime: 1, errors: 0, accuracy: 100, avgSearchTime: 1, medianSearchTime: 1 })
    useNBackHistory().addEntry('2', { score: 1, accuracy: 1, hits: 1, misses: 0, falseAlarms: 0, correctRejections: 1, avgRT: 1, medianRT: 1 })
    useSudokuStats().recordCompletion('easy', { completionTime: 1, mistakes: 0, hints: 0 })
    useSetStats().recordCompletion('easy', { gameId: 'x', completionTime: 1, setsFound: 1, mistakes: 0, hints: 0, avgFindTime: 1, medianFindTime: 1, cleanGame: true })
    useMemoryStats().recordCompletion('easy', { highestLevel: 1, longestSequence: 1, correctTaps: 1, mistakes: 0, accuracy: 100, avgTapTime: 1, medianTapTime: 1, duration: 1 })
    useSwitchTrailStats().recordCompletion('easy', { score: 1, completed: true, targetsCompleted: 1, totalTargets: 1, completionTime: 1, errors: 0, accuracy: 100, avgTransitionTime: 1, medianTransitionTime: 1 })
    useMemoryPairsStats().recordCompletion('easy', { score: 1, completionTime: 1, moves: 1, mistakes: 0, pairsFound: 1, totalPairs: 1, moveEfficiency: 100 })
    useMarbleJumpStats().recordCompletion('easy', { puzzleId: 'x', startingMarbles: 10, remainingMarbles: 1, moves: 9, completionTime: 1, undos: 0, hints: 0, clean: true, optimalReached: true, score: 1 })
    useMentalRotationStats().recordCompletion('easy', { mode: 'timed', score: 1, accuracy: 100, correct: 1, wrong: 0, trialsCompleted: 1, avgRT: 1, medianRT: 1, duration: 1 })
    useEmojiMahjongStats().recordCompletion(1, { level: 1, layoutId: 'x', seed: 1, tileCount: 8, moves: 4, mistakes: 0, hints: 0, undos: 0, completionTime: 1, clean: true, stars: 3, score: 1 })
    useNumberMatchStats().recordCompletion('easy', {
      difficulty: 'easy', seed: 1, cleared: true, startingCells: 18, numbersRemaining: 0, pairsRemoved: 9,
      score: 1, completionTime: 1, moves: 9, mistakes: 0, addNumbersUsed: 0, hints: 0, undos: 0, clean: true,
    })
    useOddOneOutStats().recordCompletion('easy', { score: 1, trials: 1, correct: 1, wrong: 0, accuracy: 100, avgCorrectRT: 1, medianCorrectRT: 1, fastestCorrectRT: 1, slowestCorrectRT: 1, duration: 1, timeLimit: 20, timedOut: false })
    useTargetTapStats().recordCompletion('easy', { score: 1, targetLetter: 'A', totalStimuli: 1, targets: 1, hits: 1, misses: 0, falseAlarms: 0, correctRejections: 0, accuracy: 100, hitRate: 100, falseAlarmRate: 0, avgHitRT: 1, medianHitRT: 1, fastestHitRT: 1, duration: 1 })
    useHanoiStats().recordCompletion(1, { level: 1, moves: 7, optimalMoves: 7, efficiency: 100, stars: 3, undos: 0, hints: 0, duration: 1, clean: true })
    useLightsOutStats().recordCompletion(1, { level: 1, size: 3, moves: 1, optimalMoves: 1, efficiency: 100, stars: 3, undos: 0, hints: 0, duration: 1, clean: true })
    useWhackAMoleStats().recordCompletion(1, {
      level: 1, gridSize: 2, score: 1, totalStimuli: 1, targets: 1, distractors: 0, hits: 1, misses: 0,
      falseAlarms: 0, correctRejections: 0, emptyTaps: 0, hitRate: 100, falseAlarmRate: 0,
      avgHitRT: 1, medianHitRT: 1, fastestHitRT: 1, stars: 3, duration: 1,
    })
    useFlagsStats().recordCompletion(1, {
      correctCount: 10, totalCount: 10, accuracy: 100, bestStreak: 10, score: 1000, stars: 3,
      duration: 1, perQuestionLog: [],
    })

    const games = new Set(getAllSessions().map((s) => s.game))
    const expectedGames = [
      'stroop', 'schulte', 'nback', 'sudoku', 'set', 'sequence-memory', 'switchtrail',
      'memorypairs', 'marblejump', 'mentalrotation', 'emojimahjong', 'numbermatch',
      'oddoneout', 'targettap', 'hanoi', 'lightsout', 'whackamole', 'flagsoftheworld',
    ]
    for (const game of expectedGames) {
      expect(games, `expected getAllSessions() to include a "${game}" session`).toContain(game)
    }
    expect(games.size).toBe(expectedGames.length)
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
