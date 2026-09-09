import { ref, computed } from 'vue'
import {
  buildBoard,
  createBoard,
  getLegalMoves,
  applyMove,
  undoMove,
  hasLegalMoves,
  remainingCount,
  calculateScore,
} from './board.js'
import { MARBLEJUMP_PUZZLES } from '../../constants/marblejump/puzzles.js'

const TIMER_TICK_MS = 250

function pickPuzzle(difficultyKey, puzzleId) {
  const pool = MARBLEJUMP_PUZZLES.filter((p) => p.difficulty === difficultyKey)
  if (puzzleId) return pool.find((p) => p.id === puzzleId) || pool[0]
  return pool[Math.floor(Math.random() * pool.length)]
}

export function useMarbleJumpGame() {
  const status = ref('idle') // idle | playing | paused | finished
  const puzzle = ref(null)
  const difficulty = ref(null)
  const boardState = ref({ n: 0, occupied: [] })
  const selected = ref(null) // hole idx | null
  const moveHistory = ref([]) // applied moves, for undo (SPEC §14)
  const undos = ref(0)
  const hints = ref(0) // no in-game hint in v1 (SPEC §16), kept for schema/result shape
  const lastMove = ref(null) // most recent move — 'last-move' board highlight (SPEC §23)
  const elapsedTime = ref(0)
  const gameId = ref(null)
  const startedAt = ref(null)

  let timerId = null
  let lastResumeTime = 0

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

  const legalMovesFromSelected = computed(() => {
    if (selected.value === null) return []
    return getLegalMoves(boardState.value).filter((m) => m.start === selected.value)
  })
  const legalDestinations = computed(() => legalMovesFromSelected.value.map((m) => m.landing))
  const moves = computed(() => moveHistory.value.length)

  function finish() {
    stopTimer()
    status.value = 'finished'
  }

  function performMove(move) {
    boardState.value = applyMove(boardState.value, move)
    moveHistory.value.push(move)
    lastMove.value = move
    selected.value = null
    if (!hasLegalMoves(boardState.value)) finish()
  }

  // SPEC §7: tap a marble to select, tap a highlighted landing to jump,
  // tap the selected marble again to deselect. Selecting a different
  // movable marble just changes the selection (not a mistake). A marble
  // with zero legal jumps, or an otherwise-irrelevant empty hole, is a
  // harmless no-op tap.
  function selectHole(idx) {
    if (status.value !== 'playing') return

    if (selected.value === idx) {
      selected.value = null
      return
    }

    if (selected.value !== null && legalDestinations.value.includes(idx)) {
      const move = legalMovesFromSelected.value.find((m) => m.landing === idx)
      performMove(move)
      return
    }

    if (boardState.value.occupied[idx] === 1) {
      const hasMove = getLegalMoves(boardState.value).some((m) => m.start === idx)
      if (hasMove) selected.value = idx
    }
  }

  function undo() {
    if (status.value !== 'playing') return
    const move = moveHistory.value.pop()
    if (!move) return
    boardState.value = undoMove(boardState.value, move)
    undos.value += 1
    selected.value = null
    lastMove.value = moveHistory.value[moveHistory.value.length - 1] || null
  }

  // SPEC §15: restores the exact original puzzle configuration.
  function restart() {
    if (!puzzle.value) return
    boardState.value = createBoard(puzzle.value)
    selected.value = null
    moveHistory.value = []
    undos.value = 0
    lastMove.value = null
    elapsedTime.value = 0
    if (status.value === 'paused') stopTimer()
    status.value = 'playing'
    startTimer()
  }

  function start(difficultyKey, puzzleId) {
    const chosen = pickPuzzle(difficultyKey, puzzleId)
    puzzle.value = chosen
    difficulty.value = difficultyKey
    boardState.value = createBoard(chosen)
    selected.value = null
    moveHistory.value = []
    undos.value = 0
    hints.value = 0
    lastMove.value = null
    elapsedTime.value = 0
    gameId.value = `marblejump-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    startedAt.value = new Date().toISOString()
    status.value = 'playing'
    startTimer()
  }

  // Restores a previously autosaved, unfinished puzzle exactly as it was.
  function resumeFromSave(saved) {
    puzzle.value = saved.puzzle
    difficulty.value = saved.difficulty
    boardState.value = saved.boardState
    selected.value = null
    moveHistory.value = saved.moveHistory
    undos.value = saved.undos
    hints.value = saved.hints
    lastMove.value = saved.moveHistory.length ? saved.moveHistory[saved.moveHistory.length - 1] : null
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
    status.value = 'idle'
  }

  function snapshot() {
    return {
      gameId: gameId.value,
      puzzle: puzzle.value,
      difficulty: difficulty.value,
      boardState: boardState.value,
      moveHistory: moveHistory.value,
      undos: undos.value,
      hints: hints.value,
      elapsedTime: elapsedTime.value,
      startedAt: startedAt.value,
      updatedAt: new Date().toISOString(),
    }
  }

  const results = computed(() => {
    const startingMarbles = puzzle.value ? buildBoard(puzzle.value.n).total - puzzle.value.emptyHoles.length : 0
    const remainingMarbles = remainingCount(boardState.value)
    const optimalReached = puzzle.value ? remainingMarbles === puzzle.value.optimalRemaining : false
    const clean = hints.value === 0
    const score = calculateScore({
      startingMarbles,
      remainingMarbles,
      undos: undos.value,
      elapsedSeconds: elapsedTime.value / 1000,
      optimalReached,
    })
    return {
      puzzleId: puzzle.value?.id ?? null,
      difficulty: difficulty.value,
      startingMarbles,
      remainingMarbles,
      moves: moveHistory.value.length,
      completionTime: elapsedTime.value,
      undos: undos.value,
      hints: hints.value,
      clean,
      optimalReached,
      score,
    }
  })

  return {
    status,
    puzzle,
    difficulty,
    boardState,
    selected,
    legalDestinations,
    lastMove,
    moves,
    undos,
    hints,
    elapsedTime,
    results,
    start,
    resumeFromSave,
    selectHole,
    undo,
    restart,
    pause,
    resumeTimer,
    reset,
    snapshot,
  }
}
