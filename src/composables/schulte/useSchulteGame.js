import { ref, computed } from 'vue'

const WRONG_FLASH_MS = 300
const ELAPSED_TICK_MS = 100

// Unbiased Fisher-Yates shuffle (SPEC §10 — not sort(() => Math.random() - 0.5)).
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

function median(arr) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function useSchulteGame() {
  const status = ref('idle') // idle | countdown | playing | finished
  const countdownValue = ref(0)
  const board = ref([]) // [{ number, state: 'pending' | 'correct' | 'wrong' }]
  const target = ref(1)
  const selections = ref([])
  const elapsedMs = ref(0)
  const completionTime = ref(0)

  let gridSize = 0
  let totalCells = 0
  let roundStartTime = 0
  let lastCorrectTime = 0
  let countdownId = null
  let goTimeoutId = null
  let elapsedId = null
  const wrongTimeouts = {}

  function clearWrongTimeouts() {
    for (const id of Object.values(wrongTimeouts)) clearTimeout(id)
    for (const key of Object.keys(wrongTimeouts)) delete wrongTimeouts[key]
  }

  function buildBoard() {
    const numbers = shuffle(Array.from({ length: totalCells }, (_, i) => i + 1))
    board.value = numbers.map((number) => ({ number, state: 'pending' }))
  }

  function start(difficulty) {
    gridSize = difficulty.gridSize
    totalCells = gridSize * gridSize
    clearWrongTimeouts()
    buildBoard()
    target.value = 1
    selections.value = []
    elapsedMs.value = 0
    completionTime.value = 0
    status.value = 'countdown'
    countdownValue.value = 3

    countdownId = setInterval(() => {
      countdownValue.value -= 1
      if (countdownValue.value <= 0) {
        clearInterval(countdownId)
        goTimeoutId = setTimeout(() => {
          status.value = 'playing'
          roundStartTime = performance.now()
          lastCorrectTime = roundStartTime
          elapsedId = setInterval(() => {
            elapsedMs.value = performance.now() - roundStartTime
          }, ELAPSED_TICK_MS)
        }, 500)
      }
    }, 700)
  }

  function select(index) {
    if (status.value !== 'playing') return
    const cell = board.value[index]
    if (!cell || cell.state === 'correct') return // ignore taps on an already-solved cell

    const now = performance.now()
    const elapsed = now - roundStartTime

    if (cell.number === target.value) {
      const interval = now - lastCorrectTime
      selections.value.push({ expected: target.value, selected: cell.number, correct: true, elapsed, interval })
      cell.state = 'correct'
      lastCorrectTime = now
      target.value += 1
      if (target.value > totalCells) {
        finish(now)
      }
    } else {
      selections.value.push({ expected: target.value, selected: cell.number, correct: false, elapsed, interval: null })
      cell.state = 'wrong'
      clearTimeout(wrongTimeouts[index])
      wrongTimeouts[index] = setTimeout(() => {
        if (board.value[index]?.state === 'wrong') board.value[index].state = 'pending'
      }, WRONG_FLASH_MS)
    }
  }

  function finish(now) {
    completionTime.value = now - roundStartTime
    clearInterval(elapsedId)
    elapsedId = null
    status.value = 'finished'
  }

  function reset() {
    clearInterval(countdownId)
    clearTimeout(goTimeoutId)
    clearInterval(elapsedId)
    clearWrongTimeouts()
    elapsedId = null
    status.value = 'idle'
  }

  const results = computed(() => {
    const correctSelections = selections.value.filter((s) => s.correct)
    const errorSelections = selections.value.filter((s) => !s.correct)
    const totalSelections = selections.value.length
    const errors = errorSelections.length
    const accuracy = totalSelections > 0 ? (correctSelections.length / totalSelections) * 100 : 0

    const intervals = correctSelections.map((s) => s.interval)
    const avgSearchTime = avg(intervals)
    const medianSearchTime = median(intervals)
    const fastestSearch = intervals.length ? Math.min(...intervals) : 0
    const slowestSearch = intervals.length ? Math.max(...intervals) : 0

    return {
      completionTime: completionTime.value,
      errors,
      accuracy,
      avgSearchTime,
      medianSearchTime,
      fastestSearch,
      slowestSearch,
      totalSelections,
    }
  })

  return {
    status,
    countdownValue,
    board,
    target,
    elapsedMs,
    results,
    start,
    select,
    reset,
  }
}
