import { ref, computed } from 'vue'

const TIMER_TICK_MS = 250

function emptyBoolGrid() {
  return Array.from({ length: 9 }, () => Array(9).fill(false))
}

function emptyNumGrid() {
  return Array.from({ length: 9 }, () => Array(9).fill(0))
}

function emptyNotesGrid() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []))
}

function peerCells(row, col) {
  const peers = []
  const seen = new Set()
  const add = (r, c) => {
    if (r === row && c === col) return
    const key = r * 9 + c
    if (seen.has(key)) return
    seen.add(key)
    peers.push([r, c])
  }
  for (let i = 0; i < 9; i++) {
    add(row, i)
    add(i, col)
  }
  const br = Math.floor(row / 3) * 3
  const bc = Math.floor(col / 3) * 3
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) add(br + i, bc + j)
  return peers
}

export function useSudokuGame() {
  const status = ref('idle') // idle | playing | paused | finished
  const puzzle = ref(emptyNumGrid()) // original clues, 0 = empty
  const solution = ref(emptyNumGrid())
  const difficulty = ref(null)
  const values = ref(emptyNumGrid()) // player-entered + hinted values
  const notes = ref(emptyNotesGrid()) // array of candidate numbers per cell
  const fixedCells = ref(emptyBoolGrid())
  const hintedCells = ref(emptyBoolGrid())
  const selected = ref(null) // { row, col } | null
  const notesMode = ref(false)
  const mistakes = ref(0)
  const hints = ref(0)
  const elapsedTime = ref(0) // ms
  const moveHistory = ref([])
  const wrongFlash = ref(null) // { row, col } | null — transient incorrect-entry feedback
  const puzzleId = ref(null)
  const startedAt = ref(null)

  let timerId = null
  let lastResumeTime = 0
  let wrongFlashTimeoutId = null

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

  function start(difficultyKey, generated) {
    puzzle.value = generated.puzzle.map((row) => [...row])
    solution.value = generated.solution.map((row) => [...row])
    difficulty.value = difficultyKey
    values.value = generated.puzzle.map((row) => [...row])
    notes.value = emptyNotesGrid()
    fixedCells.value = generated.puzzle.map((row) => row.map((v) => v !== 0))
    hintedCells.value = emptyBoolGrid()
    selected.value = null
    notesMode.value = false
    mistakes.value = 0
    hints.value = 0
    elapsedTime.value = 0
    moveHistory.value = []
    wrongFlash.value = null
    puzzleId.value = `${difficultyKey}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    startedAt.value = new Date().toISOString()
    status.value = 'playing'
    startTimer()
  }

  // Restores a previously autosaved, unfinished puzzle exactly as it was.
  function resumeFromSave(saved) {
    puzzle.value = saved.puzzle
    solution.value = saved.solution
    difficulty.value = saved.difficulty
    values.value = saved.values
    notes.value = saved.notes
    fixedCells.value = saved.fixedCells
    hintedCells.value = saved.hintedCells
    mistakes.value = saved.mistakes
    hints.value = saved.hints
    elapsedTime.value = saved.elapsedTime
    moveHistory.value = saved.moveHistory
    puzzleId.value = saved.puzzleId
    startedAt.value = saved.startedAt
    selected.value = null
    notesMode.value = false
    wrongFlash.value = null
    status.value = 'playing'
    startTimer()
  }

  function selectCell(row, col) {
    if (status.value !== 'playing') return
    selected.value = { row, col }
  }

  function isEditable(row, col) {
    return !fixedCells.value[row][col] && !hintedCells.value[row][col]
  }

  function clearWrongFlash() {
    clearTimeout(wrongFlashTimeoutId)
    wrongFlashTimeoutId = null
    wrongFlash.value = null
  }

  function checkCompletion() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (values.value[r][c] !== solution.value[r][c]) return false
      }
    }
    return true
  }

  function finish() {
    stopTimer()
    status.value = 'finished'
  }

  function enterNumber(n) {
    if (status.value !== 'playing' || !selected.value) return
    const { row, col } = selected.value
    if (!isEditable(row, col)) return
    if (values.value[row][col] !== 0) return // already filled — use Erase first

    if (notesMode.value) {
      const cellNotes = notes.value[row][col]
      const idx = cellNotes.indexOf(n)
      const previousNotes = [...cellNotes]
      if (idx === -1) cellNotes.push(n)
      else cellNotes.splice(idx, 1)
      cellNotes.sort((a, b) => a - b)
      moveHistory.value.push({ type: 'note', row, col, previousNotes, newNotes: [...cellNotes] })
      return
    }

    const correct = n === solution.value[row][col]
    if (!correct) {
      mistakes.value += 1
      clearWrongFlash()
      wrongFlash.value = { row, col }
      wrongFlashTimeoutId = setTimeout(() => {
        wrongFlash.value = null
      }, 400)
      return
    }

    const previousNotesForCell = [...notes.value[row][col]]
    notes.value[row][col] = []

    const removedPeerNotes = []
    for (const [pr, pc] of peerCells(row, col)) {
      const peerNotes = notes.value[pr][pc]
      const idx = peerNotes.indexOf(n)
      if (idx !== -1) {
        peerNotes.splice(idx, 1)
        removedPeerNotes.push({ row: pr, col: pc, value: n })
      }
    }

    values.value[row][col] = n
    moveHistory.value.push({
      type: 'place',
      row,
      col,
      value: n,
      previousNotesForCell,
      removedPeerNotes,
    })

    if (checkCompletion()) finish()
  }

  function eraseCell() {
    if (status.value !== 'playing' || !selected.value) return
    const { row, col } = selected.value
    if (!isEditable(row, col)) return

    if (values.value[row][col] !== 0) {
      const previousValue = values.value[row][col]
      values.value[row][col] = 0
      moveHistory.value.push({ type: 'erase-value', row, col, previousValue })
    } else if (notes.value[row][col].length) {
      const previousNotes = [...notes.value[row][col]]
      notes.value[row][col] = []
      moveHistory.value.push({ type: 'erase-notes', row, col, previousNotes })
    }
  }

  function undo() {
    if (status.value !== 'playing') return
    const move = moveHistory.value.pop()
    if (!move) return

    switch (move.type) {
      case 'place':
        values.value[move.row][move.col] = 0
        notes.value[move.row][move.col] = [...move.previousNotesForCell]
        for (const { row, col, value } of move.removedPeerNotes) {
          if (!notes.value[row][col].includes(value)) {
            notes.value[row][col].push(value)
            notes.value[row][col].sort((a, b) => a - b)
          }
        }
        break
      case 'note':
        notes.value[move.row][move.col] = [...move.previousNotes]
        break
      case 'erase-value':
        values.value[move.row][move.col] = move.previousValue
        break
      case 'erase-notes':
        notes.value[move.row][move.col] = [...move.previousNotes]
        break
      case 'hint':
        values.value[move.row][move.col] = 0
        hintedCells.value[move.row][move.col] = false
        notes.value[move.row][move.col] = [...move.previousNotesForCell]
        for (const { row, col, value } of move.removedPeerNotes) {
          if (!notes.value[row][col].includes(value)) {
            notes.value[row][col].push(value)
            notes.value[row][col].sort((a, b) => a - b)
          }
        }
        break
    }
  }

  function useHint() {
    if (status.value !== 'playing') return

    let target = null
    if (selected.value && values.value[selected.value.row][selected.value.col] === 0) {
      target = selected.value
    } else {
      const empties = []
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        if (values.value[r][c] === 0) empties.push({ row: r, col: c })
      }
      if (!empties.length) return
      target = empties[Math.floor(Math.random() * empties.length)]
    }

    const { row, col } = target
    const n = solution.value[row][col]
    const previousNotesForCell = [...notes.value[row][col]]
    notes.value[row][col] = []

    const removedPeerNotes = []
    for (const [pr, pc] of peerCells(row, col)) {
      const peerNotes = notes.value[pr][pc]
      const idx = peerNotes.indexOf(n)
      if (idx !== -1) {
        peerNotes.splice(idx, 1)
        removedPeerNotes.push({ row: pr, col: pc, value: n })
      }
    }

    values.value[row][col] = n
    hintedCells.value[row][col] = true
    hints.value += 1
    moveHistory.value.push({ type: 'hint', row, col, previousNotesForCell, removedPeerNotes })

    if (checkCompletion()) finish()
  }

  function toggleNotesMode() {
    notesMode.value = !notesMode.value
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
    clearWrongFlash()
    status.value = 'idle'
  }

  function snapshot() {
    return {
      puzzle: puzzle.value,
      solution: solution.value,
      difficulty: difficulty.value,
      values: values.value,
      notes: notes.value,
      fixedCells: fixedCells.value,
      hintedCells: hintedCells.value,
      mistakes: mistakes.value,
      hints: hints.value,
      elapsedTime: elapsedTime.value,
      moveHistory: moveHistory.value,
      puzzleId: puzzleId.value,
      startedAt: startedAt.value,
      updatedAt: new Date().toISOString(),
    }
  }

  const results = computed(() => ({
    puzzleId: puzzleId.value,
    difficulty: difficulty.value,
    completionTime: elapsedTime.value,
    mistakes: mistakes.value,
    hints: hints.value,
    cleanSolve: hints.value === 0,
  }))

  return {
    status,
    values,
    notes,
    fixedCells,
    hintedCells,
    selected,
    notesMode,
    moveHistory,
    mistakes,
    hints,
    elapsedTime,
    wrongFlash,
    difficulty,
    results,
    start,
    resumeFromSave,
    selectCell,
    isEditable,
    enterNumber,
    eraseCell,
    undo,
    useHint,
    toggleNotesMode,
    pause,
    resumeTimer,
    reset,
    snapshot,
  }
}
