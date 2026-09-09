import { ref, computed } from 'vue'
import { isTileFree, removePair, undoPair, isBoardCleared, isDeadEnd, remainingCount } from './board.js'
import { generateGame } from './generator.js'
import { solveBoard } from './solver.js'
import { calculateEmojiMahjongScore } from './scoring.js'

const TIMER_TICK_MS = 250
const FLASH_MS = 400

export function useEmojiMahjongGame() {
  const status = ref('idle') // idle | playing | paused | finished
  const difficulty = ref(null)
  const seed = ref(null)
  const puzzle = ref(null) // { layoutId, emoji } — the immutable original deal, for Restart
  const boardState = ref(null) // { layoutId, removed, emoji }
  const selected = ref(null) // tile index | null
  const moveHistory = ref([]) // successful removals only [{a,b}], for Undo (SPEC §15)
  const moves = ref(0)
  const mistakes = ref(0)
  const undos = ref(0)
  const hints = ref(0)
  const hintPair = ref(null) // [a,b] | null — SPEC §17, solver-backed
  const mismatchFlash = ref(null) // [a,b] | null — transient
  const blockedFlash = ref(null) // tileIdx | null — transient
  const elapsedTime = ref(0)
  const gameId = ref(null)
  const startedAt = ref(null)

  let timerId = null
  let lastResumeTime = 0
  let flashTimeoutId = null

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
    mismatchFlash.value = null
    blockedFlash.value = null
    if (flashTimeoutId) {
      clearTimeout(flashTimeoutId)
      flashTimeoutId = null
    }
  }

  // SPEC §14: a solvable starting board can still be played into a state
  // with tiles remaining but no matching free pair. This never ends the
  // game on its own — only isBoardCleared does — GameScreen shows the "No
  // available pairs" overlay while this is true and status is 'playing'.
  const deadEnd = computed(() => boardState.value !== null && isDeadEnd(boardState.value))
  const remaining = computed(() => (boardState.value ? remainingCount(boardState.value) : 0))

  function finish() {
    stopTimer()
    status.value = 'finished'
  }

  function performRemoval(a, b) {
    boardState.value = removePair(boardState.value, a, b)
    moveHistory.value.push({ a, b })
    moves.value += 1
    selected.value = null
    if (isBoardCleared(boardState.value)) finish()
  }

  function performMismatch(a, b) {
    moves.value += 1
    mistakes.value += 1
    selected.value = null
    mismatchFlash.value = [a, b]
    if (flashTimeoutId) clearTimeout(flashTimeoutId)
    flashTimeoutId = setTimeout(() => {
      mismatchFlash.value = null
    }, FLASH_MS)
  }

  function flashBlocked(i) {
    blockedFlash.value = i
    if (flashTimeoutId) clearTimeout(flashTimeoutId)
    flashTimeoutId = setTimeout(() => {
      blockedFlash.value = null
    }, FLASH_MS)
  }

  // SPEC §12: tap a free tile to select; tap another free tile — same
  // emoji removes both, different emoji gives brief mismatch feedback and
  // removes neither; tapping the selected tile again deselects; a blocked
  // tile gives subtle feedback and never becomes selected.
  function tapTile(i) {
    if (status.value !== 'playing') return
    hintPair.value = null

    if (selected.value === i) {
      selected.value = null
      return
    }

    if (!isTileFree(boardState.value, i)) {
      flashBlocked(i)
      return
    }

    if (selected.value === null) {
      selected.value = i
      return
    }

    const a = selected.value
    const b = i
    if (boardState.value.emoji[a] === boardState.value.emoji[b]) {
      performRemoval(a, b)
    } else {
      performMismatch(a, b)
    }
  }

  function undo() {
    if (status.value !== 'playing') return
    const move = moveHistory.value.pop()
    if (!move) return
    boardState.value = undoPair(boardState.value, move)
    undos.value += 1
    selected.value = null
    hintPair.value = null
  }

  // SPEC §17: solver-backed only — never suggests a move that knowingly
  // forces a dead end, since it comes straight from a full solution path.
  function hint() {
    if (status.value !== 'playing') return
    const result = solveBoard(boardState.value)
    if (!result.solvable || result.solution.length === 0) return
    hintPair.value = result.solution[0]
    hints.value += 1
  }

  // SPEC §16: restores the exact original layout and emoji assignment.
  function restart() {
    if (!puzzle.value) return
    const n = puzzle.value.emoji.length
    boardState.value = { layoutId: puzzle.value.layoutId, removed: new Array(n).fill(false), emoji: puzzle.value.emoji }
    selected.value = null
    moveHistory.value = []
    moves.value = 0
    mistakes.value = 0
    undos.value = 0
    hints.value = 0
    clearFlashes()
    elapsedTime.value = 0
    if (status.value === 'paused') stopTimer()
    status.value = 'playing'
    startTimer()
  }

  function start(difficultyKey) {
    const gameSeed = Date.now() ^ Math.floor(Math.random() * 0xffffffff)
    const { layoutId, board } = generateGame(difficultyKey, gameSeed)
    difficulty.value = difficultyKey
    seed.value = gameSeed
    puzzle.value = { layoutId, emoji: board.emoji }
    boardState.value = board
    selected.value = null
    moveHistory.value = []
    moves.value = 0
    mistakes.value = 0
    undos.value = 0
    hints.value = 0
    clearFlashes()
    elapsedTime.value = 0
    gameId.value = `emojimahjong-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    startedAt.value = new Date().toISOString()
    status.value = 'playing'
    startTimer()
  }

  // Restores a previously autosaved, unfinished game exactly as it was
  // (SPEC §25). No selected tile is ever persisted (SPEC §25's "Do not
  // persist a half-completed two-tile selection").
  function resumeFromSave(saved) {
    difficulty.value = saved.difficulty
    seed.value = saved.seed
    puzzle.value = saved.puzzle
    boardState.value = saved.boardState
    selected.value = null
    moveHistory.value = saved.moveHistory
    moves.value = saved.moves
    mistakes.value = saved.mistakes
    undos.value = saved.undos
    hints.value = saved.hints
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
      puzzle: puzzle.value,
      boardState: boardState.value,
      moveHistory: moveHistory.value,
      moves: moves.value,
      mistakes: mistakes.value,
      undos: undos.value,
      hints: hints.value,
      elapsedTime: elapsedTime.value,
      startedAt: startedAt.value,
      updatedAt: new Date().toISOString(),
    }
  }

  const results = computed(() => {
    const clean = hints.value === 0
    const score = calculateEmojiMahjongScore({
      difficultyKey: difficulty.value,
      elapsedSeconds: elapsedTime.value / 1000,
      mistakes: mistakes.value,
      hints: hints.value,
      undos: undos.value,
    })
    return {
      layoutId: puzzle.value?.layoutId ?? null,
      difficulty: difficulty.value,
      seed: seed.value,
      moves: moves.value,
      mistakes: mistakes.value,
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
    undos,
    hints,
    hintPair,
    mismatchFlash,
    blockedFlash,
    deadEnd,
    remaining,
    elapsedTime,
    results,
    start,
    resumeFromSave,
    tapTile,
    undo,
    hint,
    restart,
    pause,
    resumeTimer,
    reset,
    snapshot,
  }
}
