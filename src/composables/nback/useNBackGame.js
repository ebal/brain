import { ref, computed } from 'vue'
import { generateSequence, validateSequence } from './sequence.js'
import { STIMULUS_COLORS } from '../../constants/nback/colors.js'

const SETUP_DISPLAY_MS = 1200
const INTER_STIMULUS_GAP_MS = 300

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

function median(arr) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

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
  let stimulusShownTime = 0
  let countdownId = null
  let goTimeoutId = null
  let advanceTimeoutId = null

  function clearTimers() {
    clearInterval(countdownId)
    clearTimeout(goTimeoutId)
    clearTimeout(advanceTimeoutId)
    countdownId = null
    goTimeoutId = null
    advanceTimeoutId = null
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
    isSetupPhase.value = currentIndex.value < n

    if (isSetupPhase.value) {
      awaitingResponse.value = false
      advanceTimeoutId = setTimeout(() => {
        currentIndex.value += 1
        presentStimulus()
      }, SETUP_DISPLAY_MS)
    } else {
      stimulusShownTime = performance.now()
      awaitingResponse.value = true
    }
  }

  function start(difficulty, seed) {
    n = difficulty.n
    scoredTrials = difficulty.scoredTrials
    sequence = generateSequence(n, scoredTrials, seed)
    validateSequence(sequence)

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

  function finish() {
    clearTimers()
    awaitingResponse.value = false
    status.value = 'finished'
  }

  function reset() {
    clearTimers()
    status.value = 'idle'
  }

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
    currentNumber,
    currentColor,
    isSetupPhase,
    scoredAnswered,
    totalScored,
    feedback,
    awaitingResponse,
    results,
    start,
    answer,
    reset,
  }
}
