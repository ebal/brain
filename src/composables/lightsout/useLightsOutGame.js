import { ref, computed } from 'vue'
import { applyMove, isSolved } from './board.js'
import { minimumMoves, getOptimalSolution } from './solver.js'
import { calculateEfficiency, calculateStars } from './scoring.js'

const TIMER_TICK_MS = 250

// Unlike Tower of Hanoi, every tap in Lights Out is always "legal" — there
// is no select-then-destination step and no illegal-move/Mistakes concept
// (SPEC "Interaction": "Tap a cell; immediately toggle it..."). Moves is
// the only outcome that matters.
export function useLightsOutGame() {
  const status = ref('idle') // idle | playing | paused | finished
  const level = ref(null)
  const size = ref(0)
  const cells = ref([])
  const undos = ref(0)
  const hints = ref(0)
  const hintCell = ref(null) // index into cells, or null
  const elapsedTime = ref(0)

  // Snapshots taken before each tap — history.length doubles as Moves, same
  // technique as hanoi/useHanoiGame.js: Undo restoring the exact previous
  // board naturally rewinds this too, tracked separately from Undos.
  const history = ref([])
  const moves = computed(() => history.value.length)

  let initialCells = []
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

  function begin(levelNumber, boardSize, startingCells) {
    level.value = levelNumber
    size.value = boardSize
    initialCells = [...startingCells]
    cells.value = [...startingCells]
    undos.value = 0
    hints.value = 0
    hintCell.value = null
    elapsedTime.value = 0
    history.value = []
    status.value = 'playing'
    startTimer()
  }

  function finish() {
    stopTimer()
    status.value = 'finished'
  }

  // SPEC "Interaction": tap a cell; immediately toggle it and its valid
  // orthogonal neighbours, increment Moves, record history, and check
  // completion. No Submit button, and — unlike Hanoi — no way to tap
  // "illegally".
  function tapCell(r, c) {
    if (status.value !== 'playing') return
    history.value.push(cells.value)
    cells.value = applyMove(cells.value, size.value, r, c)
    hintCell.value = null
    if (isSolved(cells.value)) finish()
  }

  function undo() {
    if (status.value !== 'playing' || history.value.length === 0) return
    cells.value = history.value.pop()
    hintCell.value = null
    undos.value += 1
  }

  function restart() {
    if (level.value === null) return
    begin(level.value, size.value, initialCells)
  }

  // Recomputed fresh from the CURRENT board every time (SPEC "Hint
  // highlights one recommended next cell from an optimal solution for the
  // current state") — a Lights Out solution's presses are order-
  // independent, so this is always valid regardless of taps already made.
  // Picks the first recommended cell in row-major order; does not apply it.
  function hint() {
    if (status.value !== 'playing') return
    hints.value += 1
    const solution = getOptimalSolution(cells.value, size.value)
    const index = solution ? solution.findIndex((v) => v === 1) : -1
    hintCell.value = index >= 0 ? index : null
  }

  function pause() {
    if (status.value !== 'playing') return
    stopTimer()
    status.value = 'paused'
  }

  function resumeFromPause() {
    if (status.value !== 'paused') return
    status.value = 'playing'
    startTimer()
  }

  function reset() {
    stopTimer()
    status.value = 'idle'
  }

  // Restores a previously autosaved, unfinished level exactly as it was
  // (SPEC "Pause/autosave").
  function resumeFromSave(saved) {
    level.value = saved.level
    size.value = saved.size
    initialCells = saved.initialCells
    cells.value = saved.cells
    history.value = saved.history
    undos.value = saved.undos
    hints.value = saved.hints
    hintCell.value = null
    elapsedTime.value = saved.elapsedTime
    status.value = 'playing'
    startTimer()
  }

  function snapshot() {
    return {
      level: level.value,
      size: size.value,
      initialCells,
      cells: cells.value,
      history: history.value,
      undos: undos.value,
      hints: hints.value,
      elapsedTime: elapsedTime.value,
      updatedAt: new Date().toISOString(),
    }
  }

  const results = computed(() => {
    // Re-derived from the solver rather than threaded through as a separate
    // parameter — guarantees Efficiency/Stars can never drift from what the
    // solver actually proves for this exact starting board.
    const optimalMoves = minimumMoves(initialCells, size.value) ?? 0
    return {
      level: level.value,
      size: size.value,
      moves: moves.value,
      optimalMoves,
      efficiency: calculateEfficiency(optimalMoves, moves.value),
      stars: calculateStars({ actualMoves: moves.value, optimalMoves, hints: hints.value }),
      undos: undos.value,
      hints: hints.value,
      duration: elapsedTime.value,
      clean: hints.value === 0 && moves.value === optimalMoves,
    }
  })

  return {
    status,
    level,
    size,
    cells,
    moves,
    undos,
    hints,
    hintCell,
    elapsedTime,
    results,
    begin,
    tapCell,
    undo,
    restart,
    hint,
    pause,
    resumeFromPause,
    resumeFromSave,
    reset,
    snapshot,
  }
}
