import { ref, computed } from 'vue'
import { createHanoiState, isLegalMove, applyMove, isSolved, getOptimalMoveCount, getOptimalNextMove, calculateEfficiency, calculateStars } from './state.js'

const TIMER_TICK_MS = 250
const FEEDBACK_MS = 300

export function useHanoiGame() {
  const status = ref('idle') // idle | playing | paused | finished
  const level = ref(null)
  const disks = ref(0)
  const pegs = ref([[], [], []])
  const selectedPeg = ref(null)
  const mistakes = ref(0)
  const undos = ref(0)
  const hints = ref(0)
  const feedback = ref(null) // 'illegal' | null — brief flash, board unchanged (SPEC "Interaction")
  const hintMove = ref(null) // { disk, from, to } | null — cleared on any real move
  const elapsedTime = ref(0)

  // Snapshots taken before each successful move — history.length doubles as
  // Moves (SPEC's Undo restoring the exact previous state naturally rewinds
  // this too), same shape as marblejump/useMarbleJumpGame.js's moveHistory.
  const history = ref([])
  const moves = computed(() => history.value.length)

  let feedbackTimeoutId = null
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

  function begin(levelNumber, disksCount) {
    level.value = levelNumber
    disks.value = disksCount
    pegs.value = createHanoiState(disksCount).pegs
    selectedPeg.value = null
    mistakes.value = 0
    undos.value = 0
    hints.value = 0
    feedback.value = null
    hintMove.value = null
    elapsedTime.value = 0
    history.value = []
    status.value = 'playing'
    startTimer()
  }

  function finish() {
    stopTimer()
    status.value = 'finished'
  }

  // SPEC "Interaction": tap a peg to select, tap the same peg again to
  // deselect (free — "selection changes are not mistakes"), tap a
  // different peg to attempt a move there. Unlike Marble Jump's
  // select/jump split (where an empty landing spot and an occupied,
  // reselectable marble are mutually exclusive categories), a Hanoi peg can
  // simultaneously be an illegal destination AND have its own disks to
  // reselect — so there is no free "change your mind to a third peg"
  // affordance; deselecting first (tap the same peg) is the only free
  // selection change, matching the spec's literal 4-step interaction flow.
  function selectPeg(peg) {
    if (status.value !== 'playing') return

    if (selectedPeg.value === peg) {
      selectedPeg.value = null
      return
    }

    if (selectedPeg.value === null) {
      if (pegs.value[peg].length > 0) selectedPeg.value = peg
      return
    }

    if (isLegalMove({ pegs: pegs.value }, selectedPeg.value, peg)) {
      history.value.push(pegs.value)
      pegs.value = applyMove({ pegs: pegs.value }, selectedPeg.value, peg).pegs
      selectedPeg.value = null
      hintMove.value = null
      if (isSolved({ pegs: pegs.value }, disks.value)) finish()
    } else {
      mistakes.value += 1
      feedback.value = 'illegal'
      clearTimeout(feedbackTimeoutId)
      feedbackTimeoutId = setTimeout(() => {
        feedback.value = null
      }, FEEDBACK_MS)
    }
  }

  // SPEC "Undo / Restart / Hint": restores the exact previous state — Moves
  // (history.length) naturally rewinds with it, tracked separately from the
  // independent Undos counter. Does not rewind the timer.
  function undo() {
    if (status.value !== 'playing' || history.value.length === 0) return
    pegs.value = history.value.pop()
    selectedPeg.value = null
    hintMove.value = null
    undos.value += 1
  }

  function restart() {
    if (level.value === null) return
    begin(level.value, disks.value)
  }

  function hint() {
    if (status.value !== 'playing') return
    hints.value += 1
    hintMove.value = getOptimalNextMove({ pegs: pegs.value }, disks.value)
  }

  function pause() {
    if (status.value !== 'playing') return
    stopTimer()
    selectedPeg.value = null
    status.value = 'paused'
  }

  function resumeFromPause() {
    if (status.value !== 'paused') return
    status.value = 'playing'
    startTimer()
  }

  function reset() {
    stopTimer()
    clearTimeout(feedbackTimeoutId)
    status.value = 'idle'
  }

  // Restores a previously autosaved, unfinished level exactly as it was
  // (SPEC "Pause/autosave" — Continue restores exact disks, pegs, history,
  // moves, mistakes, undos, hints, elapsed time).
  function resumeFromSave(saved) {
    level.value = saved.level
    disks.value = saved.disks
    pegs.value = saved.pegs
    history.value = saved.history
    selectedPeg.value = null
    mistakes.value = saved.mistakes
    undos.value = saved.undos
    hints.value = saved.hints
    hintMove.value = null
    elapsedTime.value = saved.elapsedTime
    status.value = 'playing'
    startTimer()
  }

  function snapshot() {
    return {
      level: level.value,
      disks: disks.value,
      pegs: pegs.value,
      history: history.value,
      mistakes: mistakes.value,
      undos: undos.value,
      hints: hints.value,
      elapsedTime: elapsedTime.value,
      updatedAt: new Date().toISOString(),
    }
  }

  const results = computed(() => {
    const optimalMoves = getOptimalMoveCount(disks.value)
    return {
      level: level.value,
      disks: disks.value,
      moves: moves.value,
      optimalMoves,
      efficiency: calculateEfficiency(optimalMoves, moves.value),
      stars: calculateStars({ actualMoves: moves.value, optimalMoves, hints: hints.value }),
      mistakes: mistakes.value,
      undos: undos.value,
      hints: hints.value,
      duration: elapsedTime.value,
      clean: hints.value === 0 && moves.value === optimalMoves,
    }
  })

  return {
    status,
    level,
    disks,
    pegs,
    selectedPeg,
    moves,
    mistakes,
    undos,
    hints,
    feedback,
    hintMove,
    elapsedTime,
    results,
    begin,
    selectPeg,
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
