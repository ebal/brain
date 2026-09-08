import { ref, computed } from 'vue'
import { generateSequence, validateSequence } from './sequence.js'
import { STIMULUS_COLORS } from '../../constants/nback/colors.js'
import { avg, median } from '../mathStats.js'

const SETUP_DISPLAY_MS = 1200
const INTER_STIMULUS_GAP_MS = 300

// Exported so the card-flip UI's CSS transition duration can stay in sync
// with the delay below that gates when the RT clock actually starts.
export const CARD_FLIP_MS = 350

export function useNBackGame() {
  const status = ref('idle') // idle | countdown | playing | finished
  const countdownValue = ref(0)
  const currentIndex = ref(0)
  const currentNumber = ref(null)
  const currentColor = ref(STIMULUS_COLORS[0])
  const isSetupPhase = ref(false)
  const scoredAnswered = ref(0)
  const totalScored = ref(0)
  const feedback = ref(null) // 'correct' | 'incorrect' | null
  const awaitingResponse = ref(false)
  const trials = ref([])

  let n = 0
  let scoredTrials = 0
  let sequence = null
  // Colors are randomized per presentation (unlike sequence.numbers, which is
  // fixed upfront) so a re-displayed card in the visible history row needs
  // its originally-assigned color recorded, not a freshly rerolled one.
  let presentedColors = []
  let stimulusShownTime = 0
  let hiddenAt = 0
  let countdownId = null
  let goTimeoutId = null
  let advanceTimeoutId = null
  let flipTimeoutId = null

  function clearTimers() {
    clearInterval(countdownId)
    clearTimeout(goTimeoutId)
    clearTimeout(advanceTimeoutId)
    clearTimeout(flipTimeoutId)
    countdownId = null
    goTimeoutId = null
    advanceTimeoutId = null
    flipTimeoutId = null
  }

  function nextStimulusColor() {
    if (STIMULUS_COLORS.length <= 1) return STIMULUS_COLORS[0]
    let color
    do {
      color = STIMULUS_COLORS[Math.floor(Math.random() * STIMULUS_COLORS.length)]
    } while (color === currentColor.value)
    return color
  }

  function presentStimulus() {
    currentNumber.value = sequence.numbers[currentIndex.value]
    currentColor.value = nextStimulusColor()
    presentedColors[currentIndex.value] = currentColor.value
    isSetupPhase.value = currentIndex.value < n
    awaitingResponse.value = false

    // The card's flip-reveal animation (CARD_FLIP_MS, driven by the
    // TransitionGroup enter transition in GameScreen.vue) runs for this same
    // duration, so the RT clock (and the setup-phase display timer) start
    // only once the flip finishes — its duration never leaks into measured RTs.
    flipTimeoutId = setTimeout(() => {
      if (isSetupPhase.value) {
        advanceTimeoutId = setTimeout(() => {
          currentIndex.value += 1
          presentStimulus()
        }, SETUP_DISPLAY_MS)
      } else {
        stimulusShownTime = performance.now()
        awaitingResponse.value = true
      }
    }, CARD_FLIP_MS)
  }

  function start(difficulty, seed) {
    n = difficulty.n
    scoredTrials = difficulty.scoredTrials
    sequence = generateSequence(n, scoredTrials, seed, difficulty.pool)
    validateSequence(sequence)
    presentedColors = []

    currentIndex.value = 0
    currentNumber.value = null
    scoredAnswered.value = 0
    totalScored.value = scoredTrials
    feedback.value = null
    awaitingResponse.value = false
    trials.value = []
    status.value = 'countdown'
    countdownValue.value = 3

    countdownId = setInterval(() => {
      countdownValue.value -= 1
      if (countdownValue.value <= 0) {
        clearInterval(countdownId)
        goTimeoutId = setTimeout(() => {
          status.value = 'playing'
          presentStimulus()
        }, 500)
      }
    }, 700)
  }

  function answer(response) {
    if (status.value !== 'playing' || isSetupPhase.value || !awaitingResponse.value) return
    awaitingResponse.value = false

    const now = performance.now()
    const rt = now - stimulusShownTime
    const actualMatch = sequence.isTarget[currentIndex.value]
    const responseMatch = response === 'match'

    let classification
    if (actualMatch && responseMatch) classification = 'hit'
    else if (actualMatch && !responseMatch) classification = 'miss'
    else if (!actualMatch && responseMatch) classification = 'falseAlarm'
    else classification = 'correctRejection'

    const correct = classification === 'hit' || classification === 'correctRejection'

    trials.value.push({
      index: currentIndex.value,
      currentNumber: currentNumber.value,
      nBackNumber: sequence.numbers[currentIndex.value - n],
      actualMatch,
      response,
      classification,
      correct,
      rt,
    })

    feedback.value = correct ? 'correct' : 'incorrect'
    scoredAnswered.value += 1

    advanceTimeoutId = setTimeout(() => {
      feedback.value = null
      if (scoredAnswered.value >= scoredTrials) {
        finish()
      } else {
        currentIndex.value += 1
        presentStimulus()
      }
    }, INTER_STIMULUS_GAP_MS)
  }

  // Backgrounding the tab doesn't pause performance.now(), so without this a
  // stimulus answered after returning from background would measure the
  // entire hidden wall-clock gap as reaction time. Shifting the anchor
  // forward by the hidden duration excludes it without needing any new
  // paused UI. Mirrors the same fix in useStroopGame.js.
  function handleVisibilityChange() {
    if (document.hidden) {
      hiddenAt = performance.now()
    } else if (hiddenAt) {
      const gap = performance.now() - hiddenAt
      if (status.value === 'playing') stimulusShownTime += gap
      hiddenAt = 0
    }
  }

  function finish() {
    clearTimers()
    awaitingResponse.value = false
    status.value = 'finished'
  }

  function reset() {
    clearTimers()
    status.value = 'idle'
  }

  // The trailing N presented cards plus the current one — lets the player
  // see the exact card N positions back next to the one they're answering,
  // rather than recalling it from memory. Deliberately a design choice made
  // for this UI: it changes what N-Back measures (visual matching, not
  // working-memory recall), by request.
  const visibleCards = computed(() => {
    if (!sequence || currentNumber.value === null) return []
    const end = currentIndex.value
    const start = Math.max(0, end - n)
    const cards = []
    for (let i = start; i <= end; i++) {
      cards.push({
        index: i,
        number: sequence.numbers[i],
        color: presentedColors[i],
        isCurrent: i === end,
      })
    }
    return cards
  })

  const results = computed(() => {
    const answered = trials.value
    const total = answered.length
    const correctTrials = answered.filter((t) => t.correct)
    const correct = correctTrials.length
    const wrong = total - correct
    const accuracy = total > 0 ? (correct / total) * 100 : 0

    const count = (cls) => answered.filter((t) => t.classification === cls).length
    const hits = count('hit')
    const misses = count('miss')
    const falseAlarms = count('falseAlarm')
    const correctRejections = count('correctRejection')

    const correctRTs = correctTrials.map((t) => t.rt)
    const avgRT = avg(correctRTs)
    const medianRT = median(correctRTs)

    const score = hits * 100 + correctRejections * 25 - misses * 50 - falseAlarms * 75

    return { total, correct, wrong, accuracy, hits, misses, falseAlarms, correctRejections, avgRT, medianRT, score }
  })

  return {
    status,
    countdownValue,
    currentIndex,
    currentNumber,
    currentColor,
    visibleCards,
    isSetupPhase,
    scoredAnswered,
    totalScored,
    feedback,
    awaitingResponse,
    results,
    start,
    answer,
    reset,
    handleVisibilityChange,
  }
}
