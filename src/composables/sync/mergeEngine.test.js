import { describe, it, expect, afterEach } from 'vitest'
import { mergeData, mergeAll, mergeKey, pickBest, compareByOrder, describeMerge, syncableData } from './mergeEngine.js'
import { STATS_BEST_RULES, BEST_KEY_RULES, statsRulesFor } from './mergeRules.js'
import { installFakeLocalStorage } from '../persistence/testStorage.js'
import { _resetDeviceIdCache } from '../persistence/device.js'
import { isHistoryKey } from '../../constants/storageKeys.js'
import { stableStringify } from '../persistence/ids.js'
import { useScoreHistory as stroopHistory } from '../useScoreHistory.js'
import { useBestScores as stroopBest } from '../useBestScores.js'
import { useScoreHistory as schulteHistory } from '../schulte/useScoreHistory.js'
import { useBestTimes as schulteBest } from '../schulte/useBestTimes.js'
import { useScoreHistory as nbackHistory } from '../nback/useScoreHistory.js'
import { useBestScores as nbackBest } from '../nback/useBestScores.js'
import { useSudokuStats } from '../sudoku/useSudokuStats.js'
import { useSetStats } from '../set/useSetStats.js'
import { useMemoryStats } from '../sequence-memory/useMemoryStats.js'
import { useSwitchTrailStats } from '../switchtrail/useSwitchTrailStats.js'
import { useMemoryPairsStats } from '../memorypairs/useMemoryPairsStats.js'
import { useMarbleJumpStats } from '../marblejump/useMarbleJumpStats.js'
import { useMentalRotationStats } from '../mentalrotation/useMentalRotationStats.js'
import { useNumberMatchStats } from '../numbermatch/useNumberMatchStats.js'
import { useOddOneOutStats } from '../oddoneout/useOddOneOutStats.js'
import { useTargetTapStats } from '../targettap/useTargetTapStats.js'
import { useHanoiStats } from '../hanoi/useHanoiStats.js'
import { useLightsOutStats } from '../lightsout/useLightsOutStats.js'
import { useEmojiMahjongStats } from '../emojimahjong/useEmojiMahjongStats.js'
import { useWhackAMoleStats } from '../whackamole/useWhackAMoleStats.js'
import { useFlagsStats } from '../flags/useFlagsStats.js'

// ---- simulated devices ---------------------------------------------------
// Each device is its own in-memory localStorage driven through the REAL
// game recorders, so merged states are exactly what Brain writes.

function runOnDevice(fn) {
  const { storage, restore } = installFakeLocalStorage()
  _resetDeviceIdCache()
  try {
    fn()
    const data = {}
    for (const key of Object.keys(storage)) data[key] = JSON.parse(storage[key])
    return data
  } finally {
    restore()
    _resetDeviceIdCache()
  }
}

function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Small value ranges on purpose, so ties on leading comparison fields are
// common and every tie-break level actually gets exercised.
function randomResult(rng) {
  const pick = (list) => list[Math.floor(rng() * list.length)]
  const hints = pick([0, 0, 1])
  return {
    score: pick([10, 20, 30]),
    accuracy: pick([70, 80, 90, 100]),
    avgResponseTime: pick([500, 600]),
    correct: pick([8, 9]),
    wrong: pick([0, 1]),
    errors: pick([0, 0, 1]),
    completionTime: pick([30000, 40000, 50000]),
    medianSearchTime: pick([800, 900]),
    avgSearchTime: 900,
    hits: pick([0, 5, 6]),
    misses: pick([0, 1]),
    falseAlarms: pick([0, 1]),
    correctRejections: 10,
    medianRT: pick([400, 500, 600]),
    avgRT: 500,
    mistakes: pick([0, 1, 2]),
    hints,
    clean: hints === 0,
    cleanGame: hints === 0,
    puzzleId: `p${pick([1, 2])}`,
    gameId: `g${pick([1, 2])}`,
    setsFound: 6,
    medianFindTime: pick([4000, 5000]),
    avgFindTime: 5000,
    longestSequence: pick([7, 8, 9]),
    highestLevel: 9,
    medianTapTime: pick([300, 400]),
    avgTapTime: 400,
    duration: pick([60000, 70000]),
    completed: pick([true, false]),
    targetsCompleted: 20,
    medianTransitionTime: 800,
    avgTransitionTime: 800,
    fastestTransition: 300,
    slowestTransition: 2000,
    moves: pick([7, 8, 9]),
    pairsFound: 8,
    totalPairs: 8,
    efficiency: pick([80, 90]),
    moveEfficiency: pick([70, 80, 90]),
    remainingMarbles: pick([1, 2, 3]),
    startingMarbles: 32,
    trials: pick([18, 20, 22]),
    trialsCompleted: 20,
    mode: 'timed',
    medianCorrectRT: pick([900, 1000, 1100]),
    avgCorrectRT: 1000,
    fastestCorrectRT: 700,
    slowestCorrectRT: 2000,
    cleared: pick([true, false]),
    pairsRemoved: 10,
    numbersRemaining: 0,
    addNumbersUsed: 1,
    startingCells: 27,
    undos: pick([0, 1]),
    targets: 10,
    hitRate: pick([70, 80, 90]),
    falseAlarmRate: pick([0, 10, 20, 30]),
    medianHitRT: pick([350, 400, 450]),
    avgHitRT: 400,
    fastestHitRT: 300,
    totalStimuli: 60,
    targetLetter: 'X',
    disks: 3,
    optimalMoves: 7,
    optimalReached: true,
    size: 5,
    stars: pick([1, 2, 3]),
    layoutId: 'L',
    seed: 7,
    emptyTaps: pick([0, 1]),
    correctTaps: 9,
    totalTargets: 10,
    timeLimit: 60,
    correctCount: pick([8, 9, 10]),
    totalCount: 10,
    bestStreak: pick([4, 6]),
    perQuestionLog: [
      { countryCode: 'gr', correct: rng() > 0.3, wrongCode: 'cy', timestamp: 1 },
      { countryCode: 'cy', correct: rng() > 0.3, wrongCode: 'gr', timestamp: 2 },
    ],
  }
}

// One recorder per game — the same calls each game's ResultsScreen makes.
const GAMES = {
  stroop: (r) => { stroopHistory().addEntry('color', 'medium', r); stroopBest().submitScore('color', 'medium', r) },
  schulte: (r) => { schulteHistory().addEntry('5', r); schulteBest().submitTime('5', r) },
  nback: (r) => { nbackHistory().addEntry('2', r); nbackBest().submitScore('2', r) },
  sudoku: (r) => { const s = useSudokuStats(); s.recordStart('easy'); s.recordCompletion('easy', r) },
  set: (r) => { const s = useSetStats(); s.recordStart('medium'); s.recordCompletion('medium', r) },
  'sequence-memory': (r) => { const s = useMemoryStats(); s.recordStart('normal'); s.recordCompletion('normal', r) },
  switchtrail: (r) => { const s = useSwitchTrailStats(); s.recordStart('classic'); s.recordCompletion('classic', r) },
  memorypairs: (r) => { const s = useMemoryPairsStats(); s.recordStart('easy'); s.recordCompletion('easy', r) },
  marblejump: (r) => { const s = useMarbleJumpStats(); s.recordStart('english'); s.recordCompletion('english', r) },
  mentalrotation: (r) => { const s = useMentalRotationStats(); s.recordStart('easy'); s.recordCompletion('easy', r) },
  numbermatch: (r) => { const s = useNumberMatchStats(); s.recordStart('easy'); s.recordCompletion('easy', r) },
  oddoneout: (r) => { const s = useOddOneOutStats(); s.recordStart('easy'); s.recordCompletion('easy', r) },
  targettap: (r) => { const s = useTargetTapStats(); s.recordStart('easy'); s.recordCompletion('easy', r) },
  hanoi: (r, level = 1) => { const s = useHanoiStats(); s.recordStart(level); s.recordCompletion(level, r) },
  lightsout: (r, level = 1) => { const s = useLightsOutStats(); s.recordStart(level); s.recordCompletion(level, r) },
  emojimahjong: (r, level = 1) => { const s = useEmojiMahjongStats(); s.recordStart(level); s.recordCompletion(level, r) },
  whackamole: (r, level = 1) => { const s = useWhackAMoleStats(); s.recordStart(level); s.recordCompletion(level, r) },
  flagsoftheworld: (r, level = 1) => { const s = useFlagsStats(); s.recordStart(level); s.recordCompletion(level, r) },
}

// Every best-record value in a snapshot, keyed `storageKey.field`, with the
// informational `date` stripped (it's never part of a comparison).
function bestsOf(data) {
  const out = {}
  const strip = (r) => (r && typeof r === 'object' ? Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'date')) : r)
  for (const [key, value] of Object.entries(data)) {
    const game = key.slice(0, key.indexOf(':'))
    if (key.startsWith(`${game}:best:`)) out[key] = strip(value)
    const rules = key.startsWith(`${game}:stats:`) ? statsRulesFor(game, key.slice(`${game}:stats:`.length)) : null
    if (rules) for (const field of Object.keys(rules)) out[`${key}.${field}`] = strip(value[field])
  }
  return out
}

function sessionIds(data) {
  return Object.entries(data).filter(([k, v]) => isHistoryKey(k) && Array.isArray(v)).flatMap(([, v]) => v.map((e) => e.sessionId))
}

// Random multi-game device, built through the real recorders.
function randomDevice(seed, sessions = 12) {
  const rng = mulberry32(seed)
  const names = Object.keys(GAMES)
  return runOnDevice(() => {
    for (let i = 0; i < sessions; i++) {
      const game = names[Math.floor(rng() * names.length)]
      GAMES[game](randomResult(rng), 1 + Math.floor(rng() * 4))
    }
  })
}

// ---- tests ---------------------------------------------------------------

describe('required 3-device scenario (BRAIN-SYNC-SPEC §51)', () => {
  const mahjong = (level, stars) => ({
    layoutId: 'L', seed: 1, tileCount: 8, moves: 4, mistakes: 0, hints: 3 - stars, undos: 0,
    completionTime: 60000 + level, clean: stars === 3, stars, score: 100 * stars,
  })
  const playCampaign = (throughLevel, overrides) => runOnDevice(() => {
    const stats = useEmojiMahjongStats()
    for (let level = 1; level <= throughLevel; level++) stats.recordCompletion(level, mahjong(level, overrides[level] ?? 1))
  })

  // Blue/iPhone at level 37 with L30 ★★★; Green/Chrome at level 29 with
  // L28 ★★★; Red/Firefox at level 39 with L37 ★★☆.
  const blue = playCampaign(36, { 30: 3 })
  const green = playCampaign(28, { 28: 3 })
  const red = playCampaign(38, { 37: 2 })

  it('each device is where the scenario says it is', () => {
    expect(blue['emojimahjong:progress'].highestUnlocked).toBe(37)
    expect(green['emojimahjong:progress'].highestUnlocked).toBe(29)
    expect(red['emojimahjong:progress'].highestUnlocked).toBe(39)
  })

  const orders = [[blue, green, red], [blue, red, green], [green, blue, red], [green, red, blue], [red, blue, green], [red, green, blue]]

  it('every merge order converges on the identical state', () => {
    const results = orders.map((o) => stableStringify(mergeAll(...o)))
    expect(new Set(results).size).toBe(1)
  })

  it('unions completions, derives progression, keeps every best star, and loses no session', () => {
    const merged = mergeAll(blue, green, red)
    const progress = merged['emojimahjong:progress']
    expect(progress.completedLevels).toEqual(Array.from({ length: 38 }, (_, i) => i + 1))
    expect(progress.highestUnlocked).toBe(39)
    expect(merged['emojimahjong:stats:30'].best.stars).toBe(3) // Blue's L30 ★★★ survives
    expect(merged['emojimahjong:stats:28'].best.stars).toBe(3) // Green's L28 ★★★ survives
    expect(merged['emojimahjong:stats:37'].best.stars).toBe(2) // Red's best L37
    // 38 levels, 3 of them at ★★★/★★ and the rest ★
    expect(progress.totalStars).toBe(38 + 2 + 2 + 1)
    expect(progress.threeStarLevels).toBe(2)
    const all = [...sessionIds(blue), ...sessionIds(green), ...sessionIds(red)]
    expect(sessionIds(merged).sort()).toEqual([...all].sort())
    expect(new Set(sessionIds(merged)).size).toBe(36 + 28 + 38)
  })

  it('summarizes what a device gains (§32)', () => {
    const merged = mergeAll(blue, green, red)
    const summary = describeMerge(green, merged)
    expect(summary.newSessions).toBe(36 + 38)
    expect(summary.newlyCompletedLevels.emojimahjong).toEqual(Array.from({ length: 10 }, (_, i) => 29 + i))
    expect(summary.improvedBests).toContain('emojimahjong:stats:30.best')
  })
})

describe('domain rules (§23/§24)', () => {
  it('stars / score / accuracy / streak: MAX', () => {
    const merged = mergeData(
      { 'whackamole:stats:1': { started: 3, completed: 2, best: { stars: 2, score: 900, medianHitRT: 300 }, completions: [] } },
      { 'whackamole:stats:1': { started: 5, completed: 1, best: { stars: 3, score: 100, medianHitRT: 900 }, completions: [] } },
    )
    expect(merged['whackamole:stats:1'].best).toEqual({ stars: 3, score: 100, medianHitRT: 900 })
    expect(merged['whackamole:stats:1'].started).toBe(5)
    expect(mergeData({ 'sudoku:stats:easy': { bestStreak: 4 } }, { 'sudoku:stats:easy': { bestStreak: 9 } })['sudoku:stats:easy'].bestStreak).toBe(9)
    expect(mergeData({ 'mentalrotation:stats:easy': { bestAccuracy: { accuracy: 95 } } }, { 'mentalrotation:stats:easy': { bestAccuracy: { accuracy: 90 } } })['mentalrotation:stats:easy'].bestAccuracy.accuracy).toBe(95)
  })

  it('completion time / moves: MIN', () => {
    expect(mergeKey('schulte:best:5', { completionTime: 20000 }, { completionTime: 18000 })).toEqual({ completionTime: 18000 })
    expect(mergeKey('hanoi:stats:3', { best: { moves: 9, hints: 0 } }, { best: { moves: 7, hints: 2 } }).best.moves).toBe(7)
  })

  it('eligible reaction time: MIN only among eligible records — a faster ineligible one is rejected', () => {
    const eligible = { medianHitRT: 420, hitRate: 90, falseAlarmRate: 10 }
    const tooManyFalseAlarms = { medianHitRT: 200, hitRate: 90, falseAlarmRate: 40 }
    const merged = mergeKey('targettap:stats:easy', { bestMedianHitRT: eligible }, { bestMedianHitRT: tooManyFalseAlarms })
    expect(merged.bestMedianHitRT).toEqual(eligible)
    expect(mergeKey('mentalrotation:stats:easy', { bestMedianRT: { medianRT: 300, accuracy: 60 } }, { bestMedianRT: { medianRT: 900, accuracy: 85 } }).bestMedianRT.medianRT).toBe(900)
  })

  it('clean bests only accept hint-free records', () => {
    const merged = mergeKey('emojimahjong:stats:4', { bestClean: { stars: 3, score: 10, hints: 1, undos: 0, time: 1 } }, { bestClean: { stars: 2, score: 5, hints: 0, undos: 0, time: 9 } })
    expect(merged.bestClean.hints).toBe(0)
  })

  it('never uses timestamps to decide the better achievement', () => {
    const older = { score: 90, date: '2020-01-01T00:00:00.000Z' }
    const newer = { score: 50, date: '2030-01-01T00:00:00.000Z' }
    expect(mergeKey('stroop:best:color:easy', older, newer)).toEqual(older)
    expect(mergeKey('stroop:best:color:easy', newer, older)).toEqual(older)
  })

  it('completed levels: OR / set union; highest unlocked never regresses', () => {
    const merged = mergeData(
      { 'hanoi:progress': { highestUnlocked: 3, completedLevels: [1, 2] } },
      { 'hanoi:progress': { highestUnlocked: 2, completedLevels: [1, 4] } },
    )
    expect(merged['hanoi:progress']).toMatchObject({ completedLevels: [1, 2, 4], highestUnlocked: 5 })
  })

  it('sessions: UNION by sessionId, duplicates harmless', () => {
    const a = [{ sessionId: 's1', completedAt: '2026-01-01' }, { sessionId: 's2', completedAt: '2026-01-03' }]
    const b = [{ sessionId: 's2', completedAt: '2026-01-03' }, { sessionId: 's3', completedAt: '2026-01-02' }]
    expect(mergeKey('sudoku:history', a, b).map((e) => e.sessionId)).toEqual(['s1', 's3', 's2'])
  })

  it('resolves a sessionId conflict (same ID, different content) deterministically', () => {
    const x = [{ sessionId: 's', score: 1 }]
    const y = [{ sessionId: 's', score: 2 }]
    expect(mergeKey('sudoku:history', x, y)).toEqual(mergeKey('sudoku:history', y, x))
    expect(mergeKey('sudoku:history', x, y)).toHaveLength(1)
  })

  it('Flags learning: keeps the more-informed per-country record (interim, until learning events exist)', () => {
    const merged = mergeKey('flagsoftheworld:learning',
      { gr: { attempts: 5, mastery: 'mastered' }, cy: { attempts: 1, mastery: 'learning' } },
      { gr: { attempts: 2, mastery: 'needs-practice' }, fr: { attempts: 3, mastery: 'learning' } })
    expect(merged).toEqual({ gr: { attempts: 5, mastery: 'mastered' }, cy: { attempts: 1, mastery: 'learning' }, fr: { attempts: 3, mastery: 'learning' } })
  })

  it('never syncs device-local keys (autosaves, UI flags) or non-Brain keys', () => {
    const merged = mergeData(
      { 'sudoku:active': { board: 1 }, 'emojimahjong:tutorialSeen': [1], 'targettap:last-target': 'X', 'brain:device': { deviceId: 'a' }, 'other:key': 1 },
      { 'sudoku:history': [] },
    )
    expect(Object.keys(merged)).toEqual(['sudoku:history'])
    expect(syncableData({ 'set:active': 1, 'set:history': [] })).toEqual({ 'set:history': [] })
  })
})

describe('invalid remote payload (§45)', () => {
  const local = { 'sudoku:history': [{ sessionId: 's1' }], 'hanoi:stats:1': { best: { moves: 7, hints: 0 } } }

  it('a malformed value never displaces valid local data', () => {
    const merged = mergeData(local, { 'sudoku:history': 'garbage', 'hanoi:stats:1': [1, 2, 3] })
    expect(merged).toEqual(local)
  })

  it('a malformed best record is ignored in favour of a valid one', () => {
    expect(pickBest({ order: [['moves', 'min']] }, { moves: 7 }, 'nope')).toEqual({ moves: 7 })
    expect(pickBest({ order: [['moves', 'min']] }, { moves: 7 }, { moves: 'fast' })).toEqual({ moves: 7 })
  })
})

describe('every merge rule agrees with the game\'s own recorder', () => {
  // For two results r1, r2: if the game itself keeps the same bests no
  // matter which order it records them in (i.e. its own comparison is
  // decisive, not a first-come tie), then merging device{r1} with
  // device{r2} must produce exactly those bests.
  for (const game of Object.keys(GAMES)) {
    it(game, () => {
      const rng = mulberry32(game.length * 7919)
      let checked = 0
      for (let i = 0; i < 60; i++) {
        const r1 = randomResult(rng)
        const r2 = randomResult(rng)
        const forward = bestsOf(runOnDevice(() => { GAMES[game](r1); GAMES[game](r2) }))
        const backward = bestsOf(runOnDevice(() => { GAMES[game](r2); GAMES[game](r1) }))
        if (stableStringify(forward) !== stableStringify(backward)) continue
        const merged = bestsOf(mergeData(runOnDevice(() => GAMES[game](r1)), runOnDevice(() => GAMES[game](r2))))
        expect(merged).toEqual(forward)
        checked++
      }
      expect(checked).toBeGreaterThan(10)
    })
  }

  it('covers every game that has best records', () => {
    const covered = new Set(Object.keys(GAMES))
    for (const game of [...Object.keys(STATS_BEST_RULES), ...Object.keys(BEST_KEY_RULES)]) expect(covered.has(game)).toBe(true)
  })
})

describe('algebraic properties (§50)', () => {
  const devices = Array.from({ length: 6 }, (_, i) => randomDevice(1000 + i, 25))

  it('commutative: merge(A,B) == merge(B,A)', () => {
    for (const a of devices) for (const b of devices) expect(stableStringify(mergeData(a, b))).toBe(stableStringify(mergeData(b, a)))
  })

  it('associative: merge(merge(A,B),C) == merge(A,merge(B,C))', () => {
    for (let i = 0; i < devices.length; i++) {
      for (let j = i + 1; j < devices.length; j++) {
        for (let k = j + 1; k < devices.length; k++) {
          const [a, b, c] = [devices[i], devices[j], devices[k]]
          expect(stableStringify(mergeData(mergeData(a, b), c))).toBe(stableStringify(mergeData(a, mergeData(b, c))))
        }
      }
    }
  })

  it('idempotent: merge(A,A) == A for real device state, and merge(M,M) == M for merged state', () => {
    for (const a of devices) expect(mergeData(a, a)).toEqual(syncableData(a))
    const m = mergeAll(...devices)
    expect(mergeData(m, m)).toEqual(m)
    expect(mergeData(m, devices[0])).toEqual(m) // re-merging an already-included device changes nothing
  })

  it('no progress regression: the merged state is at least as good as every input', () => {
    const merged = mergeAll(...devices)
    const mergedIds = new Set(sessionIds(merged))
    for (const device of devices) {
      for (const id of sessionIds(device)) expect(mergedIds.has(id)).toBe(true)
      for (const [key, value] of Object.entries(device)) {
        const game = key.slice(0, key.indexOf(':'))
        if (key.endsWith(':progress')) {
          expect(merged[key].highestUnlocked).toBeGreaterThanOrEqual(value.highestUnlocked)
          for (const level of value.completedLevels) expect(merged[key].completedLevels).toContain(level)
        }
        const rules = key.startsWith(`${game}:stats:`) ? statsRulesFor(game, key.slice(`${game}:stats:`.length)) : null
        for (const [field, rule] of Object.entries(rules ?? {})) {
          if (value[field]) expect(compareByOrder(rule.order, merged[key][field], value[field])).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })
})

afterEach(() => _resetDeviceIdCache())
