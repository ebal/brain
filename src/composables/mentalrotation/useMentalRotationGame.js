import { ref, computed } from 'vue'
import { generateTrial, calculateMentalRotationScore, makeRng } from './trialGenerator.js'
import { avg, median } from '../mathStats.js'

const TIMER_TICK_MS = 100
const FEEDBACK_MS = 300 // SPEC §14 suggests 250-350ms
const RECENT_SHAPE_WINDOW = 4 // SPEC §30: avoid repeats within the last 3-5 trials

export function useMentalRotationGame() {
  // idle | countdown | playing | backgrounded | finished
  const status = ref('idle')
  const countdownValue = ref(0)
  const timeLeft = ref(0)
  const totalDuration = ref(0)
  const currentTrial = ref(null)
  const feedback = ref(null) // 'correct' | 'wrong' | null
  const trials = ref([])

  let timerId = null
  let countdownId = null
  let goTimeoutId = null
  let feedbackTimeoutId = null
  let trialStartTime = 0
  let difficulty = null
  let rng = Math.random
  let recentShapeIds = []

  function startRoundTimer() {
    timerId = setInterval(() => {
      timeLeft.value = Math.max(0, +(timeLeft.value - TIMER_TICK_MS / 1000).toFixed(2))
      if (timeLeft.value <= 0) finish()
    }, TIMER_TICK_MS)
  }

  function stopRoundTimer() {
    if (timerId) {
      clearInterval(timerId)
      timerId = null
    }
  }

  function nextTrial() {
    const trial = generateTrial(difficulty, rng, recentShapeIds)
    currentTrial.value = trial
    recentShapeIds.push(trial.shapeId)
    if (recentShapeIds.length > RECENT_SHAPE_WINDOW) recentShapeIds.shift()
    trialStartTime = performance.now()
  }

  // Shared by the initial start and by SPEC §25's resume-from-background —
  // both end the same way: a 3-2-1 countdown, then a fresh trial with the
  // round timer (re)started, never consuming round time itself.
  function startCountdown(onDone) {
    status.value = 'countdown'
    countdownValue.value = 3
    countdownId = setInterval(() => {
      countdownValue.value -= 1
      if (countdownValue.value <= 0) {
        clearInterval(countdownId)
        countdownId = null
        goTimeoutId = setTimeout(onDone, 500)
      }
    }, 700)
  }

  function start(difficultyConfig, seed) {
    difficulty = difficultyConfig
    rng = makeRng(seed)
    totalDuration.value = difficultyConfig.duration
    timeLeft.value = difficultyConfig.duration
    trials.value = []
    recentShapeIds = []
    feedback.value = null
    currentTrial.value = null

    startCountdown(() => {
      status.value = 'playing'
      nextTrial()
      startRoundTimer()
    })
  }

  function answer(candidateId) {
    if (status.value !== 'playing' || !currentTrial.value) return

    const reactionTime = performance.now() - trialStartTime
    const trial = currentTrial.value
    const selected = trial.candidates.find((c) => c.id === candidateId)
    const correct = selected?.correct === true

    trials.value.push({
      shapeId: trial.shapeId,
      referenceRotation: trial.referenceRotation,
      correctRotation: trial.correctRotation,
      angularDifference: trial.angularDifference,
      candidateCount: trial.candidates.length,
      correctCandidate: trial.correctCandidateId,
      selectedCandidate: candidateId,
      correct,
      reactionTime,
    })

    feedback.value = correct ? 'correct' : 'wrong'
    currentTrial.value = null

    feedbackTimeoutId = setTimeout(() => {
      feedback.value = null
      if (status.value === 'playing' && timeLeft.value > 0) nextTrial()
    }, FEEDBACK_MS)
  }

  // SPEC §25: backgrounding pauses the timer and discards (never scores) the
  // trial in progress; resuming re-runs the 3-2-1 countdown and generates a
  // fresh trial. Handles backgrounding during the initial countdown too.
  function handleVisibilityChange() {
    if (document.hidden) {
      if (status.value === 'playing' || status.value === 'countdown') {
        stopRoundTimer()
        clearInterval(countdownId)
        countdownId = null
        clearTimeout(goTimeoutId)
        clearTimeout(feedbackTimeoutId)
        currentTrial.value = null
        feedback.value = null
        status.value = 'backgrounded'
      }
    } else if (status.value === 'backgrounded') {
      startCountdown(() => {
        status.value = 'playing'
        nextTrial()
        startRoundTimer()
      })
    }
  }

  function finish() {
    stopRoundTimer()
    clearTimeout(feedbackTimeoutId)
    currentTrial.value = null
    feedback.value = null
    status.value = 'finished'
  }

  function reset() {
    stopRoundTimer()
    clearInterval(countdownId)
    countdownId = null
    clearTimeout(goTimeoutId)
    clearTimeout(feedbackTimeoutId)
    status.value = 'idle'
    trials.value = []
    currentTrial.value = null
  }

  // Field names here match useMentalRotationStats.recordCompletion's expected
  // `result` shape directly (SPEC §17/§23), so GameScreen can forward this
  // computed straight through with no renaming step, same as every other
  // game's composable/stats pairing.
  const results = computed(() => {
    const correctTrials = trials.value.filter((t) => t.correct)
    const wrongTrials = trials.value.filter((t) => !t.correct)
    const trialsCompleted = trials.value.length
    const correct = correctTrials.length
    const wrong = wrongTrials.length
    const accuracy = trialsCompleted > 0 ? (correct / trialsCompleted) * 100 : 0
    const correctRTs = correctTrials.map((t) => t.reactionTime)

    return {
      trialsCompleted,
      correct,
      wrong,
      accuracy,
      avgRT: avg(correctRTs),
      medianRT: median(correctRTs),
      score: calculateMentalRotationScore(trials.value),
      duration: totalDuration.value,
      trials: trials.value,
    }
  })

  return {
    status,
    countdownValue,
    timeLeft,
    totalDuration,
    currentTrial,
    feedback,
    results,
    start,
    answer,
    reset,
    handleVisibilityChange,
  }
}
