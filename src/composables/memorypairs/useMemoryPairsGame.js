import { ref, computed } from 'vue'
import { createMemoryDeck } from './memoryDeck.js'
import { calculateMemoryScore, calculateMoveEfficiency } from './scoring.js'
import { getDifficultyConfig } from '../../constants/memorypairs/difficulties.js'

const TIMER_TICK_MS = 250
const MISMATCH_DELAY_MS = 800 // SPEC §9
const COUNTDOWN_STEP_MS = 700
const GO_DELAY_MS = 500

export function useMemoryPairsGame(onChange) {
  const status = ref('idle') // idle | countdown | playing | paused | finished
  const countdownValue = ref(0)
  const difficulty = ref(null)
  const tiles = ref([]) // [{ id, emoji, state: 'facedown' | 'revealed' | 'matched' }]
  const selectedIds = ref([]) // 0, 1, or 2 (briefly, during mismatch feedback)
  const moves = ref(0)
  const mistakes = ref(0)
  const pairsFound = ref(0)
  const elapsedTime = ref(0) // ms, counts up
  const feedback = ref(null) // 'mismatch' | null
  const gameId = ref(null)
  const startedAt = ref(null)

  let pairCount = 0
  let baseScore = 0
  let timerId = null
  let lastResumeTime = 0
  let countdownId = null
  let goTimeoutId = null
  let mismatchTimeoutId = null

  const totalTiles = computed(() => tiles.value.length)

  function findTile(id) {
    return tiles.value.find((t) => t.id === id)
  }

  function startTimer() {
    lastResumeTime = performance.now()
    timerId = setInterval(() => {
      elapsedTime.value += performance.now() - lastResumeTime
      lastResumeTime = performance.now()
    }, TIMER_TICK_MS)
  }

  function stopTimer() {
    if (timerId) {
      elapsedTime.value += performance.now() - lastResumeTime
      clearInterval(timerId)
      timerId = null
    }
  }

  function runCountdown(onGo) {
    status.value = 'countdown'
    countdownValue.value = 3
    countdownId = setInterval(() => {
      countdownValue.value -= 1
      if (countdownValue.value <= 0) {
        clearInterval(countdownId)
        countdownId = null
        goTimeoutId = setTimeout(onGo, GO_DELAY_MS)
      }
    }, COUNTDOWN_STEP_MS)
  }

  function start(difficultyKey, seed) {
    const config = getDifficultyConfig(difficultyKey)
    difficulty.value = difficultyKey
    pairCount = config.pairs
    baseScore = config.baseScore
    tiles.value = createMemoryDeck(pairCount, seed)

    selectedIds.value = []
    moves.value = 0
    mistakes.value = 0
    pairsFound.value = 0
    elapsedTime.value = 0
    feedback.value = null
    gameId.value = `memorypairs-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    startedAt.value = new Date().toISOString()

    runCountdown(() => {
      status.value = 'playing'
      startTimer()
    })
  }

  function resumeFromSave(saved) {
    const config = getDifficultyConfig(saved.difficulty)
    difficulty.value = saved.difficulty
    pairCount = config.pairs
    baseScore = config.baseScore
    tiles.value = saved.tiles
    selectedIds.value = []
    moves.value = saved.moves
    mistakes.value = saved.mistakes
    pairsFound.value = saved.pairsFound
    elapsedTime.value = saved.elapsedTime
    feedback.value = null
    gameId.value = saved.gameId
    startedAt.value = saved.startedAt

    runCountdown(() => {
      status.value = 'playing'
      startTimer()
    })
  }

  function tap(tileId) {
    if (status.value !== 'playing' || feedback.value) return
    const tile = findTile(tileId)
    if (!tile || tile.state !== 'facedown') return // matched, or the already-revealed first tile (SPEC §8)

    tile.state = 'revealed'
    selectedIds.value.push(tileId)
    if (selectedIds.value.length < 2) return

    moves.value += 1
    const [a, b] = selectedIds.value.map(findTile)

    if (a.emoji === b.emoji) {
      a.state = 'matched'
      b.state = 'matched'
      pairsFound.value += 1
      selectedIds.value = []
      if (pairsFound.value >= pairCount) {
        finish()
      } else {
        onChange?.(snapshot())
      }
    } else {
      mistakes.value += 1
      feedback.value = 'mismatch'
      const wrongIds = [...selectedIds.value]
      mismatchTimeoutId = setTimeout(() => {
        for (const id of wrongIds) {
          const t = findTile(id)
          if (t?.state === 'revealed') t.state = 'facedown'
        }
        selectedIds.value = []
        feedback.value = null
        onChange?.(snapshot())
      }, MISMATCH_DELAY_MS)
    }
  }

  function finish() {
    stopTimer()
    clearTimeout(mismatchTimeoutId)
    status.value = 'finished'
  }

  // Cancels any in-flight selection without penalty and hides unmatched tile
  // faces (SPEC §22) — a partial (one-tile) selection just flips back down;
  // a pending mismatch is resolved immediately rather than waited out (its
  // Move/Mistake were already counted the instant the second tile was
  // tapped, so nothing further to penalize).
  function pause() {
    if (status.value !== 'playing') return
    stopTimer()
    clearTimeout(mismatchTimeoutId)

    for (const id of selectedIds.value) {
      const t = findTile(id)
      if (t?.state === 'revealed') t.state = 'facedown'
    }
    selectedIds.value = []
    feedback.value = null

    status.value = 'paused'
  }

  // Resume shows a fresh 3-2-1 (SPEC §22), preserving matched pairs, score,
  // moves, mistakes, and remaining board — none of that state is touched here.
  function resumeFromPause() {
    if (status.value !== 'paused') return
    runCountdown(() => {
      status.value = 'playing'
      startTimer()
    })
  }

  function reset() {
    stopTimer()
    clearInterval(countdownId)
    clearTimeout(goTimeoutId)
    clearTimeout(mismatchTimeoutId)
    status.value = 'idle'
  }

  function snapshot() {
    return {
      gameId: gameId.value,
      difficulty: difficulty.value,
      tiles: tiles.value,
      moves: moves.value,
      mistakes: mistakes.value,
      pairsFound: pairsFound.value,
      elapsedTime: elapsedTime.value,
      startedAt: startedAt.value,
      updatedAt: new Date().toISOString(),
    }
  }

  const results = computed(() => {
    const elapsedSeconds = elapsedTime.value / 1000
    const score = calculateMemoryScore({
      baseScore,
      elapsedSeconds,
      moves: moves.value,
      pairs: pairCount,
      mistakes: mistakes.value,
    })
    const moveEfficiency = calculateMoveEfficiency(pairCount, moves.value)

    return {
      gameId: gameId.value,
      difficulty: difficulty.value,
      score,
      completionTime: elapsedTime.value,
      moves: moves.value,
      mistakes: mistakes.value,
      pairsFound: pairsFound.value,
      totalPairs: pairCount,
      moveEfficiency,
    }
  })

  return {
    status,
    countdownValue,
    difficulty,
    tiles,
    moves,
    mistakes,
    pairsFound,
    totalTiles,
    elapsedTime,
    feedback,
    results,
    start,
    resumeFromSave,
    tap,
    pause,
    resumeFromPause,
    reset,
    snapshot,
  }
}
