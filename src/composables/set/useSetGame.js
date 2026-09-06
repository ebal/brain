import { ref, computed } from 'vue'
import { createDeck, shuffleDeck, makeRng } from './deck.js'
import { isSet, firstFailingProperty } from './setValidator.js'
import { findAllSets } from './setFinder.js'
import { BOARD_SIZE, DEAL_INCREMENT } from '../../constants/set/cardProperties.js'

const TIMER_TICK_MS = 250
const VALID_FEEDBACK_MS = 500
const INVALID_FEEDBACK_MS = 1400 // longer so Easy mode's explanation is readable

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

function median(arr) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function useSetGame(onChange) {
  const status = ref('idle') // idle | playing | paused | finished
  const difficulty = ref(null)
  const deck = ref([])
  const board = ref([])
  const selected = ref([]) // card ids
  const setsFound = ref(0)
  const mistakes = ref(0)
  const hints = ref(0)
  const hintSetIds = ref(null) // [id,id,id] | null — the set currently being hinted
  const hintLevel = ref(0) // 0..3
  const feedback = ref(null) // 'valid' | 'invalid' | null
  const invalidReason = ref(null) // { property, values: [a,b,c] } | null
  const elapsedTime = ref(0)
  const setHistory = ref([])
  const gameId = ref(null)
  const startedAt = ref(null)

  let timerId = null
  let lastResumeTime = 0
  let lastFindTime = 0
  let feedbackTimeoutId = null

  const hintCardIds = computed(() => (hintSetIds.value ? hintSetIds.value.slice(0, hintLevel.value) : []))

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

  function dealCards(n) {
    const dealt = deck.value.splice(0, n)
    board.value.push(...dealt)
  }

  function clearHint() {
    hintSetIds.value = null
    hintLevel.value = 0
  }

  // Deals 3 more cards whenever the board has zero SETs, repeatedly, until
  // one exists or the deck is exhausted (SPEC §10); ends the game if the
  // deck is exhausted with no SET remaining (SPEC §4/§10).
  function ensureSetsExist() {
    while (findAllSets(board.value).length === 0 && deck.value.length > 0) {
      dealCards(Math.min(DEAL_INCREMENT, deck.value.length))
    }
    if (findAllSets(board.value).length === 0 && deck.value.length === 0) {
      finish()
    }
  }

  function start(difficultyKey, seed) {
    difficulty.value = difficultyKey
    deck.value = shuffleDeck(createDeck(), makeRng(seed))
    board.value = []
    dealCards(Math.min(BOARD_SIZE, deck.value.length))

    selected.value = []
    setsFound.value = 0
    mistakes.value = 0
    hints.value = 0
    clearHint()
    feedback.value = null
    invalidReason.value = null
    elapsedTime.value = 0
    setHistory.value = []
    gameId.value = `set-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    startedAt.value = new Date().toISOString()

    status.value = 'playing'
    ensureSetsExist() // may deal more, or (vanishingly rarely) finish immediately

    if (status.value === 'playing') {
      startTimer()
      lastFindTime = performance.now()
    }
  }

  function resumeFromSave(saved) {
    difficulty.value = saved.difficulty
    deck.value = saved.deck
    board.value = saved.board
    selected.value = saved.selected
    setsFound.value = saved.setsFound
    mistakes.value = saved.mistakes
    hints.value = saved.hints
    hintSetIds.value = saved.hintSetIds
    hintLevel.value = saved.hintLevel
    feedback.value = null
    invalidReason.value = null
    elapsedTime.value = saved.elapsedTime
    setHistory.value = saved.setHistory
    gameId.value = saved.gameId
    startedAt.value = saved.startedAt
    status.value = 'playing'
    startTimer()
    lastFindTime = performance.now()
  }

  function selectCard(id) {
    if (status.value !== 'playing' || feedback.value) return
    const idx = selected.value.indexOf(id)
    if (idx !== -1) {
      selected.value.splice(idx, 1)
      return
    }
    if (selected.value.length >= 3) return
    selected.value.push(id)
    if (selected.value.length === 3) validateSelection()
  }

  function removeFoundCards(ids) {
    board.value = board.value.filter((c) => !ids.includes(c.id))
    if (board.value.length < BOARD_SIZE && deck.value.length > 0) {
      dealCards(Math.min(BOARD_SIZE - board.value.length, deck.value.length))
    }
    clearHint()
    ensureSetsExist()
  }

  function validateSelection() {
    const cards = selected.value.map((id) => board.value.find((c) => c.id === id))
    const [ca, cb, cc] = cards

    if (isSet(ca, cb, cc)) {
      setsFound.value += 1
      const now = performance.now()
      const searchTime = now - lastFindTime
      lastFindTime = now
      setHistory.value.push({
        cards: [...selected.value],
        foundAt: elapsedTime.value,
        searchTime,
        boardSize: board.value.length,
      })
      feedback.value = 'valid'
      const foundIds = [...selected.value]
      feedbackTimeoutId = setTimeout(() => {
        feedback.value = null
        removeFoundCards(foundIds)
        selected.value = []
        // This mutates board/deck/selected asynchronously, well after the
        // click that triggered it — nothing else would persist this change
        // until the player's next action, so notify explicitly.
        onChange?.(snapshot())
      }, VALID_FEEDBACK_MS)
    } else {
      mistakes.value += 1
      feedback.value = 'invalid'
      if (difficulty.value === 'easy') {
        const prop = firstFailingProperty(ca, cb, cc)
        invalidReason.value = { property: prop, values: [ca[prop], cb[prop], cc[prop]] }
      } else {
        invalidReason.value = null
      }
      feedbackTimeoutId = setTimeout(() => {
        feedback.value = null
        invalidReason.value = null
        selected.value = []
        onChange?.(snapshot())
      }, INVALID_FEEDBACK_MS)
    }
  }

  // Progressive: 1st press reveals one card of an available SET, 2nd a
  // second card, 3rd the complete SET (SPEC §9). Resets whenever the board
  // changes (removeFoundCards/ensureSetsExist call clearHint()).
  function useHint() {
    if (status.value !== 'playing') return
    if (!hintSetIds.value) {
      const sets = findAllSets(board.value)
      if (!sets.length) return
      const chosen = sets[Math.floor(Math.random() * sets.length)]
      hintSetIds.value = chosen.map((idx) => board.value[idx].id)
    }
    if (hintLevel.value >= 3) return
    hintLevel.value += 1
    hints.value += 1
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

  function finish() {
    stopTimer()
    clearTimeout(feedbackTimeoutId)
    status.value = 'finished'
  }

  function reset() {
    stopTimer()
    clearTimeout(feedbackTimeoutId)
    status.value = 'idle'
  }

  function snapshot() {
    return {
      gameId: gameId.value,
      difficulty: difficulty.value,
      deck: deck.value,
      board: board.value,
      selected: selected.value,
      setsFound: setsFound.value,
      mistakes: mistakes.value,
      hints: hints.value,
      hintSetIds: hintSetIds.value,
      hintLevel: hintLevel.value,
      elapsedTime: elapsedTime.value,
      setHistory: setHistory.value,
      startedAt: startedAt.value,
      updatedAt: new Date().toISOString(),
    }
  }

  const results = computed(() => {
    const searchTimes = setHistory.value.map((s) => s.searchTime)
    return {
      gameId: gameId.value,
      difficulty: difficulty.value,
      completionTime: elapsedTime.value,
      setsFound: setsFound.value,
      mistakes: mistakes.value,
      hints: hints.value,
      avgFindTime: avg(searchTimes),
      medianFindTime: median(searchTimes),
      fastestFind: searchTimes.length ? Math.min(...searchTimes) : 0,
      slowestFind: searchTimes.length ? Math.max(...searchTimes) : 0,
      cleanGame: hints.value === 0,
    }
  })

  return {
    status,
    difficulty,
    board,
    selected,
    setsFound,
    mistakes,
    hints,
    hintCardIds,
    hintLevel,
    feedback,
    invalidReason,
    elapsedTime,
    deckSize: computed(() => deck.value.length),
    results,
    start,
    resumeFromSave,
    selectCard,
    useHint,
    pause,
    resumeTimer,
    reset,
    snapshot,
  }
}
