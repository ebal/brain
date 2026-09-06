import { ref, computed } from 'vue'
import { paletteFor } from '../constants/colors.js'
import { avg, median } from './mathStats.js'

const INTER_TRIAL_GAP_MS = 250
const TIMER_TICK_MS = 100
const SPEED_BONUS_THRESHOLD_MS = 1000
const MIN_TRIALS_FOR_INTERFERENCE = 5

export function useStroopGame() {
  const status = ref('idle') // idle | countdown | playing | finished
  const countdownValue = ref(0)
  const timeLeft = ref(0)
  const totalDuration = ref(0)
  const currentTrial = ref(null)
  const feedback = ref(null) // 'correct' | 'wrong' | null
  const trials = ref([])
  const palette = ref([])

  let timerId = null
  let countdownId = null
  let goTimeoutId = null
  let gapTimeoutId = null
  let trialStartTime = 0
  let hiddenAt = 0
  let congruentRatio = 0.25
  let mode = 'color'

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  function generateTrial() {
    const words = palette.value
    const last = trials.value[trials.value.length - 1]
    let word, color, attempts = 0

    do {
      word = pickRandom(words)
      const congruent = Math.random() < congruentRatio
      color = congruent ? word : pickRandom(words.filter((c) => c.name !== word.name))
      attempts += 1
    } while (
      last &&
      attempts < 10 &&
      last.word === word.name &&
      last.colorName === color.name
    )

    currentTrial.value = {
      word: word.name,
      color,
      congruent: word.name === color.name,
    }
    trialStartTime = performance.now()
  }

  function startTimer() {
    timerId = setInterval(() => {
      timeLeft.value = Math.max(0, +(timeLeft.value - TIMER_TICK_MS / 1000).toFixed(2))
      if (timeLeft.value <= 0) {
        finish()
      }
    }, TIMER_TICK_MS)
  }

  function start(difficulty, gameMode = 'color') {
    palette.value = paletteFor(difficulty.colorCount)
    totalDuration.value = difficulty.duration
    timeLeft.value = difficulty.duration
    congruentRatio = difficulty.congruentRatio
    mode = gameMode
    trials.value = []
    feedback.value = null
    currentTrial.value = null
    status.value = 'countdown'
    countdownValue.value = 3

    countdownId = setInterval(() => {
      countdownValue.value -= 1
      if (countdownValue.value <= 0) {
        clearInterval(countdownId)
        goTimeoutId = setTimeout(() => {
          status.value = 'playing'
          generateTrial()
          startTimer()
        }, 500)
      }
    }, 700)
  }

  function answer(colorName) {
    if (status.value !== 'playing' || !currentTrial.value) return

    const rt = performance.now() - trialStartTime
    const target = mode === 'word' ? currentTrial.value.word : currentTrial.value.color.name
    const correct = colorName === target

    trials.value.push({
      word: currentTrial.value.word,
      colorName: currentTrial.value.color.name,
      congruent: currentTrial.value.congruent,
      answered: colorName,
      correct,
      rt,
    })

    feedback.value = correct ? 'correct' : 'wrong'
    currentTrial.value = null

    gapTimeoutId = setTimeout(() => {
      feedback.value = null
      if (status.value === 'playing' && timeLeft.value > 0) {
        generateTrial()
      }
    }, INTER_TRIAL_GAP_MS)
  }

  // Backgrounding the tab doesn't pause performance.now(), so without this a
  // trial answered after returning from background would measure the entire
  // hidden wall-clock gap as reaction time. Shifting the anchor forward by
  // the hidden duration excludes it without needing any new paused UI.
  function handleVisibilityChange() {
    if (document.hidden) {
      hiddenAt = performance.now()
    } else if (hiddenAt) {
      const gap = performance.now() - hiddenAt
      if (status.value === 'playing') trialStartTime += gap
      hiddenAt = 0
    }
  }

  function finish() {
    clearInterval(timerId)
    clearTimeout(gapTimeoutId)
    timerId = null
    currentTrial.value = null
    feedback.value = null
    status.value = 'finished'
  }

  function reset() {
    clearInterval(timerId)
    clearInterval(countdownId)
    clearTimeout(goTimeoutId)
    clearTimeout(gapTimeoutId)
    status.value = 'idle'
    trials.value = []
    currentTrial.value = null
  }

  const results = computed(() => {
    const answered = trials.value
    const correctTrials = answered.filter((t) => t.correct)
    const wrongTrials = answered.filter((t) => !t.correct)
    const total = answered.length
    const correct = correctTrials.length
    const wrong = wrongTrials.length
    const accuracy = total > 0 ? (correct / total) * 100 : 0

    const correctRTs = correctTrials.map((t) => t.rt)
    const avgResponseTime = avg(correctRTs)
    const medianResponseTime = median(correctRTs)

    const congruentRTs = correctTrials.filter((t) => t.congruent).map((t) => t.rt)
    const incongruentRTs = correctTrials.filter((t) => !t.congruent).map((t) => t.rt)
    const interference = congruentRTs.length >= MIN_TRIALS_FOR_INTERFERENCE &&
      incongruentRTs.length >= MIN_TRIALS_FOR_INTERFERENCE
      ? avg(incongruentRTs) - avg(congruentRTs)
      : null

    const speedBonusCount = correctTrials.filter((t) => t.rt < SPEED_BONUS_THRESHOLD_MS).length
    const score = Math.max(0, correct * 100 - wrong * 50 + speedBonusCount * 10)

    return { total, correct, wrong, accuracy, avgResponseTime, medianResponseTime, interference, score }
  })

  return {
    status,
    countdownValue,
    timeLeft,
    totalDuration,
    currentTrial,
    feedback,
    palette,
    results,
    start,
    answer,
    reset,
    handleVisibilityChange,
  }
}
