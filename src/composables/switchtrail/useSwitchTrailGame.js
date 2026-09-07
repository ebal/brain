import { ref, computed } from 'vue'
import { createTrailSequence, getExpectedTarget } from './trailSequence.js'
import { repositionPending, makeRng } from './trailLayout.js'
import { calculateScore, calculateTransitionStats } from './scoring.js'
import { SWITCHTRAIL_DIFFICULTIES } from '../../constants/switchtrail/difficulties.js'
import { randomCellColor } from '../../constants/cellColors.js'

const TIMER_TICK_MS = 100
const COUNTDOWN_STEP_MS = 700
const GO_DELAY_MS = 500
const ERROR_FEEDBACK_MS = 300

const isLetter = (label) => /^[A-Z]$/.test(label)

export function useSwitchTrailGame() {
  const status = ref('idle') // idle | countdown | playing | paused | finished
  const countdownValue = ref(0)
  const difficulty = ref(null)
  const sequence = ref([])
  const layout = ref([]) // [{ label, x, y, state: 'pending' | 'done' }]
  const expectedIndex = ref(0)
  const errors = ref(0)
  const elapsedTime = ref(0) // ms, counts up
  const feedback = ref(null) // 'wrong' | null
  const wrongLabel = ref(null) // which on-board target was last mistapped, for a per-target flash
  const timedOut = ref(false)

  let timeLimitMs = 0
  let dynamic = false // Extreme: reshuffle every still-pending target after each correct tap
  let rng = null // persists across the round so a seeded round's reshuffles stay reproducible
  let transitions = [] // [{ duration, direction }]
  let timerId = null
  let lastResumeTime = 0
  let lastCorrectTime = 0
  let countdownId = null
  let goTimeoutId = null
  let feedbackTimeoutId = null

  const expectedTarget = computed(() => getExpectedTarget(sequence.value, expectedIndex.value))
  const remainingTime = computed(() => Math.max(0, timeLimitMs - elapsedTime.value))
  const targetsCompleted = computed(() => expectedIndex.value)
  const totalTargets = computed(() => sequence.value.length)

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
    lastCorrectTime = now
    timerId = setInterval(() => {
      const tickNow = performance.now()
      elapsedTime.value += tickNow - lastResumeTime
      lastResumeTime = tickNow
      if (elapsedTime.value >= timeLimitMs) {
        elapsedTime.value = timeLimitMs
        clearTimerId()
        finish(false)
      }
    }, TIMER_TICK_MS)
  }

  function start(difficultyKey, seed, options = {}) {
    const config = SWITCHTRAIL_DIFFICULTIES[difficultyKey]
    difficulty.value = difficultyKey
    timeLimitMs = config.timeLimit * 1000
    dynamic = !!config.dynamic
    const colorMode = !!options.colorMode
    sequence.value = createTrailSequence(config)

    // One rng instance for the whole round — the initial placement below and
    // every later reshuffle (Extreme only) all draw from it, so a seeded
    // round's entire sequence of layouts stays reproducible (SPEC §20).
    rng = makeRng(seed)
    // color is assigned once per label here (not a fixed "slot" — Switch
    // Trail has no fixed slots, positions are continuous coordinates) and
    // then simply rides along: repositionPending's `{ ...t, x, y }` spread
    // preserves any extra field on a layout entry, so a colored target keeps
    // its color through every later reshuffle with no extra code needed.
    const blank = sequence.value.map((label) => ({
      label,
      x: 0,
      y: 0,
      state: 'pending',
      color: colorMode ? randomCellColor() : null,
    }))
    layout.value = repositionPending(blank, undefined, rng)

    expectedIndex.value = 0
    errors.value = 0
    elapsedTime.value = 0
    feedback.value = null
    wrongLabel.value = null
    timedOut.value = false
    transitions = []

    runCountdown(beginPlaying)
  }

  function tap(label) {
    if (status.value !== 'playing') return
    const target = layout.value.find((t) => t.label === label)
    if (!target || target.state === 'done') return

    if (label === expectedTarget.value) {
      const now = performance.now()
      transitions.push({
        duration: now - lastCorrectTime,
        direction: isLetter(label) ? 'numberToLetter' : 'letterToNumber',
      })
      lastCorrectTime = now
      target.state = 'done'
      expectedIndex.value += 1

      if (expectedIndex.value >= sequence.value.length) {
        stopTimer()
        finish(true)
      } else if (dynamic) {
        try {
          layout.value = repositionPending(layout.value, undefined, rng)
        } catch {
          // Extremely rare dense-endgame packing failure (verified <0.1% in
          // simulation) — skip this one reshuffle rather than crash the
          // round; positions simply stay put until the next correct tap.
        }
      }
    } else {
      errors.value += 1
      feedback.value = 'wrong'
      wrongLabel.value = label
      clearTimeout(feedbackTimeoutId)
      feedbackTimeoutId = setTimeout(() => {
        feedback.value = null
        wrongLabel.value = null
      }, ERROR_FEEDBACK_MS)
    }
  }

  function finish(completed) {
    clearTimerId()
    clearTimeout(feedbackTimeoutId)
    timedOut.value = !completed
    status.value = 'finished'
  }

  // Handles both mid-round (playing) and mid-countdown app-hide (SPEC §19).
  function pause() {
    if (status.value === 'playing') {
      stopTimer()
    } else if (status.value === 'countdown') {
      clearCountdownTimers()
    } else {
      return
    }
    status.value = 'paused'
  }

  // Resume shows a fresh 3-2-1 before revealing the board again (SPEC §19),
  // preserving the exact board, sequence position, score, errors and
  // remaining time — none of that state is touched here.
  function resumeFromPause() {
    if (status.value !== 'paused') return
    runCountdown(beginPlaying)
  }

  function reset() {
    clearTimerId()
    clearCountdownTimers()
    clearTimeout(feedbackTimeoutId)
    status.value = 'idle'
  }

  const results = computed(() => {
    const completed = totalTargets.value > 0 && targetsCompleted.value >= totalTargets.value
    const remainingSeconds = remainingTime.value / 1000
    const score = calculateScore({
      correctTargets: targetsCompleted.value,
      errors: errors.value,
      completed,
      remainingSeconds,
    })
    const transitionStats = calculateTransitionStats(transitions)
    const totalTaps = targetsCompleted.value + errors.value
    const accuracy = totalTaps > 0 ? (targetsCompleted.value / totalTaps) * 100 : 0

    return {
      difficulty: difficulty.value,
      score,
      completed,
      targetsCompleted: targetsCompleted.value,
      totalTargets: totalTargets.value,
      completionTime: elapsedTime.value,
      timeLimit: timeLimitMs,
      errors: errors.value,
      accuracy,
      ...transitionStats,
    }
  })

  return {
    status,
    countdownValue,
    difficulty,
    layout,
    expectedTarget,
    errors,
    elapsedTime,
    remainingTime,
    targetsCompleted,
    totalTargets,
    feedback,
    wrongLabel,
    timedOut,
    results,
    start,
    tap,
    pause,
    resumeFromPause,
    reset,
  }
}
