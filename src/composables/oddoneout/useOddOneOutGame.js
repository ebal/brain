import { ref, computed } from 'vue'
import { generateTrial, makeRng } from './generator.js'
import { calculateOddOneOutScore, calculateAccuracy, calculateRTStats } from './scoring.js'
import { ODDONEOUT_DIFFICULTIES } from '../../constants/oddoneout/difficulties.js'
import { ODDONEOUT_UNTIMED_TARGET_CORRECT } from '../../constants/oddoneout/variants.js'
import { randomCellColor } from '../../constants/cellColors.js'

const TIMER_TICK_MS = 100
const COUNTDOWN_STEP_MS = 700
const GO_DELAY_MS = 500
const ERROR_FEEDBACK_MS = 150 // SPEC §13: "suggested duration 100-200ms"

export function useOddOneOutGame() {
  const status = ref('idle') // idle | countdown | playing | paused | finished
  const countdownValue = ref(0)
  const difficulty = ref(null)
  const trial = ref(null) // { pairId, family, gridSize, base, odd, oddIndex, cells }
  const cellColors = ref([]) // [hex, ...] per cell, fresh every trial; [] when colorMode is off
  const correct = ref(0)
  const wrong = ref(0)
  const elapsedTime = ref(0) // ms, counts up
  const feedback = ref(null) // 'wrong' | null
  const wrongIndex = ref(null) // which cell was last mistapped, for a per-cell flash
  const timedOut = ref(false)
  const targetCorrect = ref(0) // untimed only: round ends after this many correct taps instead of a clock

  let timeLimitMs = 0
  let untimed = false // modeled on Mental Rotation's Untimed mode (fixed trial count), not Switch Trail's
  let colorMode = false
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
    // Fresh every trial (SPEC-equivalent to Schulte's Random Color, but
    // simpler: Odd One Out already wipes and regenerates the whole grid on
    // every correct tap, so there's no "does the color travel with a
    // repositioned cell" question to solve). Pure visual noise —
    // independent of trial.value.oddIndex, so it can never hint at the
    // answer.
    cellColors.value = colorMode ? trial.value.cells.map(() => randomCellColor()) : []
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
      // Untimed rounds keep the clock running (elapsedTime still feeds the
      // final `duration` stat) but never time out — they only end once
      // targetCorrect is reached, checked in tap() instead.
      if (!untimed && elapsedTime.value >= timeLimitMs) {
        elapsedTime.value = timeLimitMs
        clearTimerId()
        interruptedAtTimeout = true
        timedOut.value = true
        finish()
      }
    }, TIMER_TICK_MS)
  }

  function start(difficultyKey, seed, options = {}) {
    const config = ODDONEOUT_DIFFICULTIES[difficultyKey]
    difficulty.value = difficultyKey
    timeLimitMs = config.timeLimit * 1000
    untimed = !!options.untimed
    colorMode = !!options.colorMode
    targetCorrect.value = untimed ? ODDONEOUT_UNTIMED_TARGET_CORRECT : 0
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
      // Untimed ends the round the moment the target correct-count is
      // reached (Mental Rotation's exact model) — the trial that was just
      // solved counts fully; there's no "next" trial to generate.
      if (untimed && correct.value >= targetCorrect.value) {
        stopTimer()
        finish()
        return
      }
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

  // Generic wrap-up only — callers set timedOut/interruptedAtTimeout
  // themselves before calling this (SPEC §16/§19: the trial on screen when
  // time runs out is never awarded as correct; whether it counts toward
  // "Trials" at all is decided in `results` below via wrongOnCurrentTrial,
  // captured at the instant time expired). Reaching Untimed's target count
  // is a normal, non-interrupted ending — it leaves both flags at their
  // start()-initialized `false`.
  function finish() {
    clearTimerId()
    clearTimeout(feedbackTimeoutId)
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
    cellColors,
    gridSize,
    correct,
    wrong,
    elapsedTime,
    remainingTime,
    targetCorrect,
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
