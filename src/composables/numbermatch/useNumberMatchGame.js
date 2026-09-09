import { ref, computed } from 'vue'
import {
  isLegalPair,
  removePair,
  appendRemainingNumbers,
  remainingCount,
  isBoardCleared,
  findLegalPairs,
} from './board.js'
import { generateBoard } from './generator.js'
import { calculateNumberMatchScore } from './scoring.js'
import { getDifficultyConfig } from '../../constants/numbermatch/difficulties.js'

const TIMER_TICK_MS = 250
const FLASH_MS = 400

export function useNumberMatchGame() {
  const status = ref('idle') // idle | playing | paused | finished
  const difficulty = ref(null)
  const seed = ref(null)
  const startingCells = ref(0)
  const boardState = ref(null) // { cols, cells }
  const selected = ref(null) // cell index | null
  const moveHistory = ref([]) // successful removals only [{a,b,av,bv}], for Undo (SPEC §15)
  const moves = ref(0)
  const mistakes = ref(0)
  const pairsRemoved = ref(0)
  const hints = ref(0)
  const undos = ref(0)
  const addNumbersUsed = ref(0)
  const hintPair = ref(null) // [i,j] | null — SPEC §14
  const invalidFlash = ref(null) // [i,j] | null — transient
  const elapsedTime = ref(0)
  const gameId = ref(null)
  const startedAt = ref(null)
  // Whether the just-finished round ended by clearing the board (true) or
  // by running out of moves and Add Numbers (false, SPEC §13's Game Over).
  const boardCleared = ref(false)

  let timerId = null
  let lastResumeTime = 0
  let flashTimeoutId = null
  let addNumbersUses = 0

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

  function clearFlashes() {
    hintPair.value = null
    invalidFlash.value = null
    if (flashTimeoutId) {
      clearTimeout(flashTimeoutId)
      flashTimeoutId = null
    }
  }

  const remaining = computed(() => (boardState.value ? remainingCount(boardState.value) : 0))
  const addNumbersRemaining = computed(() => Math.max(0, addNumbersUses - addNumbersUsed.value))

  // SPEC §13: tiles remain but no legal pair exists, and Add Numbers is
  // still available — a nudge, not a finish. Only Game Over (no pairs, no
  // Add Numbers left) or Board Cleared end the round.
  const stalled = computed(() => {
    if (!boardState.value || status.value !== 'playing') return false
    return remaining.value > 0 && findLegalPairs(boardState.value).length === 0
  })

  function finish(cleared) {
    stopTimer()
    clearFlashes()
    status.value = 'finished'
    boardCleared.value = cleared
  }

  // SPEC §13/§14: after any board-changing action, check for Cleared, then
  // Game Over (no pairs AND no Add Numbers left). "Stalled" needs no
  // transition — it's just the `stalled` computed being true while still
  // 'playing'.
  function evaluateBoardState() {
    if (isBoardCleared(boardState.value)) {
      finish(true)
      return
    }
    if (findLegalPairs(boardState.value).length === 0 && addNumbersRemaining.value === 0) {
      finish(false)
    }
  }

  function performRemoval(i, j) {
    const av = boardState.value.cells[i]
    const bv = boardState.value.cells[j]
    boardState.value = removePair(boardState.value, i, j)
    moveHistory.value.push({ a: i, b: j, av, bv })
    moves.value += 1
    pairsRemoved.value += 1
    selected.value = null
    hintPair.value = null
    evaluateBoardState()
  }

  function performMistake(i, j) {
    moves.value += 1
    mistakes.value += 1
    selected.value = null
    invalidFlash.value = [i, j]
    if (flashTimeoutId) clearTimeout(flashTimeoutId)
    flashTimeoutId = setTimeout(() => {
      invalidFlash.value = null
    }, FLASH_MS)
  }

  // SPEC §8: tap a number to select it, tap another — legal pair removes
  // both, illegal pair gives brief feedback and counts a Mistake. Tapping
  // the selected number again deselects. Empty cells do nothing at all.
  function tapCell(i) {
    if (status.value !== 'playing') return
    if (boardState.value.cells[i] === null) return
    hintPair.value = null

    if (selected.value === i) {
      selected.value = null
      return
    }

    if (selected.value === null) {
      selected.value = i
      return
    }

    const a = selected.value
    const b = i
    if (isLegalPair(boardState.value, a, b)) {
      performRemoval(a, b)
    } else {
      performMistake(a, b)
    }
  }

  function undo() {
    if (status.value !== 'playing') return
    const move = moveHistory.value.pop()
    if (!move) return
    const cells = boardState.value.cells.slice()
    cells[move.a] = move.av
    cells[move.b] = move.bv
    boardState.value = { ...boardState.value, cells }
    undos.value += 1
    selected.value = null
    hintPair.value = null
  }

  // SPEC §14: highlights one legal pair via the same findLegalPairs() used
  // by gameplay; never removes it.
  function hint() {
    if (status.value !== 'playing') return
    const pairs = findLegalPairs(boardState.value)
    if (pairs.length === 0) return
    hintPair.value = pairs[0]
    hints.value += 1
  }

  // SPEC §11/§15: appends every remaining value in reading order as new
  // cells. Clears removal Undo history — an Undo spanning an Add Numbers
  // boundary would be ambiguous about board shape.
  function addNumbers() {
    if (status.value !== 'playing') return
    if (addNumbersRemaining.value <= 0) return
    boardState.value = appendRemainingNumbers(boardState.value)
    addNumbersUsed.value += 1
    moveHistory.value = []
    selected.value = null
    hintPair.value = null
    evaluateBoardState()
  }

  // SPEC §16: restores the exact original board.
  function restart() {
    if (!difficulty.value) return
    start(difficulty.value, seed.value)
  }

  function start(difficultyKey, gameSeed) {
    const config = getDifficultyConfig(difficultyKey)
    const resolvedSeed = gameSeed ?? (Date.now() ^ Math.floor(Math.random() * 0xffffffff))
    const board = generateBoard(config, resolvedSeed)

    difficulty.value = difficultyKey
    seed.value = resolvedSeed
    addNumbersUses = config.addNumbersUses
    startingCells.value = board.cells.length
    boardState.value = board
    selected.value = null
    moveHistory.value = []
    moves.value = 0
    mistakes.value = 0
    pairsRemoved.value = 0
    hints.value = 0
    undos.value = 0
    addNumbersUsed.value = 0
    boardCleared.value = false
    clearFlashes()
    elapsedTime.value = 0
    gameId.value = `numbermatch-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    startedAt.value = new Date().toISOString()
    status.value = 'playing'
    startTimer()
  }

  // Restores a previously autosaved, unfinished game exactly as it was
  // (SPEC §23). No selected cell is ever persisted.
  function resumeFromSave(saved) {
    difficulty.value = saved.difficulty
    seed.value = saved.seed
    addNumbersUses = getDifficultyConfig(saved.difficulty).addNumbersUses
    startingCells.value = saved.startingCells
    boardState.value = saved.boardState
    selected.value = null
    moveHistory.value = saved.moveHistory
    moves.value = saved.moves
    mistakes.value = saved.mistakes
    pairsRemoved.value = saved.pairsRemoved
    hints.value = saved.hints
    undos.value = saved.undos
    addNumbersUsed.value = saved.addNumbersUsed
    boardCleared.value = false
    clearFlashes()
    elapsedTime.value = saved.elapsedTime
    gameId.value = saved.gameId
    startedAt.value = saved.startedAt
    status.value = 'playing'
    startTimer()
  }

  function pause() {
    if (status.value !== 'playing') return
    stopTimer()
    status.value = 'paused'
  }

  function resumeTimer() {
    if (status.value !== 'paused') return
    status.value = 'playing'
    startTimer()
  }

  function reset() {
    stopTimer()
    clearFlashes()
    status.value = 'idle'
  }

  function snapshot() {
    return {
      gameId: gameId.value,
      difficulty: difficulty.value,
      seed: seed.value,
      startingCells: startingCells.value,
      boardState: boardState.value,
      moveHistory: moveHistory.value,
      moves: moves.value,
      mistakes: mistakes.value,
      pairsRemoved: pairsRemoved.value,
      hints: hints.value,
      undos: undos.value,
      addNumbersUsed: addNumbersUsed.value,
      elapsedTime: elapsedTime.value,
      startedAt: startedAt.value,
      updatedAt: new Date().toISOString(),
    }
  }

  const results = computed(() => {
    const clean = boardCleared.value && hints.value === 0
    const score = calculateNumberMatchScore({
      difficultyKey: difficulty.value,
      pairsRemoved: pairsRemoved.value,
      mistakes: mistakes.value,
      hints: hints.value,
      addNumbersUsed: addNumbersUsed.value,
      undos: undos.value,
      elapsedSeconds: elapsedTime.value / 1000,
      cleared: boardCleared.value,
    })
    return {
      difficulty: difficulty.value,
      seed: seed.value,
      cleared: boardCleared.value,
      startingCells: startingCells.value,
      numbersRemaining: remaining.value,
      pairsRemoved: pairsRemoved.value,
      moves: moves.value,
      mistakes: mistakes.value,
      addNumbersUsed: addNumbersUsed.value,
      hints: hints.value,
      undos: undos.value,
      completionTime: elapsedTime.value,
      clean,
      score,
    }
  })

  return {
    status,
    difficulty,
    boardState,
    selected,
    moveHistory,
    moves,
    mistakes,
    pairsRemoved,
    hints,
    undos,
    addNumbersUsed,
    addNumbersRemaining,
    hintPair,
    invalidFlash,
    stalled,
    remaining,
    elapsedTime,
    results,
    start,
    resumeFromSave,
    tapCell,
    undo,
    hint,
    addNumbers,
    restart,
    pause,
    resumeTimer,
    reset,
    snapshot,
  }
}
