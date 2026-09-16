import { ref, computed } from 'vue'
import { generateTrial, makeRng } from './generator.js'
import { calculateOddOneOutScore, calculateAccuracy, calculateRTStats } from './scoring.js'
import { ODDONEOUT_DIFFICULTIES } from '../../constants/oddoneout/difficulties.js'

const TIMER_TICK_MS = 100
const COUNTDOWN_STEP_MS = 700
const GO_DELAY_MS = 500
const ERROR_FEEDBACK_MS = 150 // SPEC §13: "suggested duration 100-200ms"

export function useOddOneOutGame() {
  const status = ref('idle') // idle | countdown | playing | paused | finished
  const countdownValue = ref(0)
  const difficulty = ref(null)
  const trial = ref(null) // { pairId, family, gridSize, base, odd, oddIndex, cells }
  const correct = ref(0)
  const wrong = ref(0)
  const elapsedTime = ref(0) // ms, counts up
  const feedback = ref(null) // 'wrong' | null
  const wrongIndex = ref(null) // which cell was last mistapped, for a per-cell flash
  const timedOut = ref(false)

  let timeLimitMs = 0
  let rng = null // persists across the round so a seeded round's trial sequence stays reproducible
  let trialStartTime = 0 // performance.now() at the moment the current trial became visible
  let wrongOnCurrentTrial = 0 // resets every newTrial() — see finish()'s "was the interrupted trial genuinely engaged" check
  let interruptedAtTimeout = false
  let correctRTs = []
  let timerId = null
  let lastResumeTime = 0
  let countdownId = null
  let goTimeoutId = null
  let feedbackTimeoutId = null

  const gridSize = computed(() => ODDONEOUT_DIFFICULTIES[difficulty.value]?.gridSize ?? 0)
  const remainingTime = computed(() => Math.max(0, timeLimitMs - elapsedTime.value))

  function clearTimerId() {
    if (timerId) {
      clearInterval(timerId)
      timerId = null
    }
  }

  function stopTimer() {
    if (timerId) {
      elapsedTime.value += performance.now() - lastResumeTime
      clearTimerId()
    }
  }

  function clearCountdownTimers() {
    clearInterval(countdownId)
    clearTimeout(goTimeoutId)
    countdownId = null
    goTimeoutId = null
  }

  function newTrial() {
    trial.value = generateTrial(difficulty.value, gridSize.value, rng)
    wrongOnCurrentTrial = 0
  }

  function runCountdown(onGo) {
    status.value = 'countdown'
    countdownValue.value = 3
    countdownId = setInterval(() => {
      countdownValue.value -= 1
      if (countdownValue.value <= 0) {
        clearInterval(countdownId)
        countdownId = null
        goTimeoutId = setTimeout(onGo, GO_DELAY_MS)
      }
    }, COUNTDOWN_STEP_MS)
  }

  function beginPlaying() {
    status.value = 'playing'
    const now = performance.now()
    lastResumeTime = now
    trialStartTime = now
    timerId = setInterval(() => {
      const tickNow = performance.now()
      elapsedTime.value += tickNow - lastResumeTime
      lastResumeTime = tickNow
      if (elapsedTime.value >= timeLimitMs) {
        elapsedTime.value = timeLimitMs
        clearTimerId()
        finish()
      }
    }, TIMER_TICK_MS)
  }

  function start(difficultyKey, seed) {
    const config = ODDONEOUT_DIFFICULTIES[difficultyKey]
    difficulty.value = difficultyKey
    timeLimitMs = config.timeLimit * 1000
    // One rng instance for the whole round so a seeded round's entire trial
    // sequence (pair choice + odd position, every trial) stays reproducible
    // (SPEC §31).
    rng = makeRng(seed)

    correct.value = 0
    wrong.value = 0
    elapsedTime.value = 0
    feedback.value = null
    wrongIndex.value = null
    timedOut.value = false
    interruptedAtTimeout = false
    correctRTs = []

    newTrial()
    runCountdown(beginPlaying)
  }

  function tap(index) {
    if (status.value !== 'playing' || !trial.value) return

    if (index === trial.value.oddIndex) {
      const now = performance.now()
      correctRTs.push(now - trialStartTime)
      correct.value += 1
      newTrial()
      trialStartTime = performance.now()
    } else {
      wrong.value += 1
      wrongOnCurrentTrial += 1
      feedback.value = 'wrong'
      wrongIndex.value = index
      clearTimeout(feedbackTimeoutId)
      feedbackTimeoutId = setTimeout(() => {
        feedback.value = null
        wrongIndex.value = null
      }, ERROR_FEEDBACK_MS)
    }
  }

  // SPEC §16/§19: the trial on screen when time runs out is never awarded as
  // correct. Whether it counts toward "Trials" at all is decided in
  // `results` below, via wrongOnCurrentTrial (captured here at the instant
  // time expired).
  function finish() {
    clearTimerId()
    clearTimeout(feedbackTimeoutId)
    interruptedAtTimeout = true
    timedOut.value = true
    status.value = 'finished'
  }

  // Handles both mid-round (playing) and mid-countdown app-hide (SPEC §24).
  function pause() {
    if (status.value === 'playing') {
      stopTimer()
    } else if (status.value === 'countdown') {
      clearCountdownTimers()
    } else {
      return
    }
    feedback.value = null
    wrongIndex.value = null
    status.value = 'paused'
  }

  // SPEC §24: resume always shows a fresh 3-2-1 and a brand-new trial — never
  // the stimulus that was on screen when the app was hidden, so there's no
  // extra study time on it. Any wrong taps already logged against that
  // discarded trial stay counted (they were genuine responses that already
  // happened before the pause); only the trial's own completion is discarded.
  function resumeFromPause() {
    if (status.value !== 'paused') return
    newTrial()
    runCountdown(beginPlaying)
  }

  function reset() {
    clearTimerId()
    clearCountdownTimers()
    clearTimeout(feedbackTimeoutId)
    status.value = 'idle'
  }

  const results = computed(() => {
    const rtStats = calculateRTStats(correctRTs)
    const accuracy = calculateAccuracy({ correct: correct.value, wrong: wrong.value })
    const score = calculateOddOneOutScore({ correct: correct.value, wrong: wrong.value })
    // A trial that was still on screen, untouched, when time ran out simply
    // never happened (SPEC §16: "do not award it" applies to the trial
    // count too) — it only joins the "Trials" total if the player had
    // genuinely engaged with it via at least one wrong tap.
    const trials = correct.value + (interruptedAtTimeout && wrongOnCurrentTrial > 0 ? 1 : 0)

    return {
      difficulty: difficulty.value,
      score,
      trials,
      correct: correct.value,
      wrong: wrong.value,
      accuracy,
      ...rtStats,
      duration: elapsedTime.value,
      timeLimit: timeLimitMs,
      timedOut: timedOut.value,
    }
  })

  return {
    status,
    countdownValue,
    difficulty,
    trial,
    gridSize,
    correct,
    wrong,
    elapsedTime,
    remainingTime,
    feedback,
    wrongIndex,
    timedOut,
    results,
    start,
    tap,
    pause,
    resumeFromPause,
    reset,
  }
}
