import { ref, computed } from 'vue'
import { generateSequence, makeRng } from './sequence.js'
import { distractorPoolFor } from '../../constants/targettap/letterPool.js'
import { calculateTargetTapScore, calculateAccuracy, calculateHitRate, calculateFalseAlarmRate, calculateRTStats } from './scoring.js'
import { TARGETTAP_DIFFICULTIES } from '../../constants/targettap/difficulties.js'

const COUNTDOWN_STEP_MS = 700
const GO_DELAY_MS = 500
const FEEDBACK_MS = 200 // SPEC §21: "subtle and extremely brief"
const TIMER_TICK_MS = 100 // HUD elapsed-time display only — not the source of truth for advancing stimuli

export function useTargetTapGame() {
  const status = ref('idle') // idle | countdown | playing | paused | finished
  const countdownValue = ref(0)
  const difficulty = ref(null)
  const targetLetter = ref(null)
  const currentLetter = ref(null)
  const stimulusIndex = ref(-1) // -1 before the first stimulus is presented
  const hits = ref(0)
  const misses = ref(0)
  const falseAlarms = ref(0)
  const correctRejections = ref(0)
  const feedback = ref(null) // 'hit' | 'falseAlarm' | null
  const elapsedTime = ref(0) // ms, HUD display + final `duration` stat

  let sequence = null
  let tapped = false // has the CURRENT stimulus already received its one counted tap?
  let stimulusStartTime = 0
  let hitRTs = []
  let resuming = false // true while showing the synthetic post-pause buffer stimulus (SPEC §29)
  let pausedAtIndex = -1
  let stimulusTimeoutId = null
  let feedbackTimeoutId = null
  let countdownId = null
  let goTimeoutId = null
  let elapsedTimerId = null
  let lastResumeTime = 0

  const totalStimuli = computed(() => sequence?.totalStimuli ?? 0)
  // The actual planned playtime (totalStimuli * interval), not the
  // difficulty's raw configured duration — floor() in calculateTotalStimuli
  // (SPEC §9) can leave a small remainder (e.g. Medium: 56 * 800ms =
  // 44800ms of a configured 45000ms), and a HUD countdown built from the
  // raw duration would visibly stall a second short of 0 instead of
  // reaching it exactly when the round actually ends.
  const totalDuration = computed(() => totalStimuli.value * (sequence?.intervalMs ?? 0))

  function clearStimulusTimer() {
    if (stimulusTimeoutId) {
      clearTimeout(stimulusTimeoutId)
      stimulusTimeoutId = null
    }
  }

  function clearCountdownTimers() {
    clearInterval(countdownId)
    clearTimeout(goTimeoutId)
    countdownId = null
    goTimeoutId = null
  }

  function stopElapsedTimer() {
    if (elapsedTimerId) {
      elapsedTime.value += performance.now() - lastResumeTime
      clearInterval(elapsedTimerId)
      elapsedTimerId = null
    }
  }

  function startElapsedTimer() {
    lastResumeTime = performance.now()
    elapsedTimerId = setInterval(() => {
      const now = performance.now()
      elapsedTime.value += now - lastResumeTime
      lastResumeTime = now
    }, TIMER_TICK_MS)
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

  // The core metronome: a stimulus is visible for its COMPLETE interval no
  // matter what the player does (SPEC §15) — this timeout always fires and
  // always advances, tap or no tap. A tap only records a classification; it
  // never cuts the interval short.
  function presentStimulus(index) {
    if (index >= sequence.totalStimuli) {
      finish()
      return
    }
    resuming = false
    stimulusIndex.value = index
    currentLetter.value = sequence.letters[index]
    tapped = false
    stimulusStartTime = performance.now()

    stimulusTimeoutId = setTimeout(() => {
      if (!tapped) {
        if (sequence.isTarget[index]) misses.value += 1
        else correctRejections.value += 1
      }
      presentStimulus(index + 1)
    }, sequence.intervalMs)
  }

  // SPEC §29: on resume, "continue with a newly generated non-target
  // stimulus" that is never classified — a one-off buffer, not part of the
  // pre-validated sequence. Afterward, the true sequence resumes exactly at
  // the index that was interrupted (that stimulus was fully discarded, so
  // nothing in the sequence is skipped or double-counted).
  function presentResumeBuffer(resumeIndex) {
    resuming = true
    currentLetter.value = distractorPoolFor(sequence.target)[0]
    tapped = false
    stimulusStartTime = performance.now()

    stimulusTimeoutId = setTimeout(() => {
      presentStimulus(resumeIndex)
    }, sequence.intervalMs)
  }

  function start(difficultyKey, previousTarget, seed) {
    const config = TARGETTAP_DIFFICULTIES[difficultyKey]
    difficulty.value = difficultyKey
    sequence = generateSequence(config, previousTarget, seed)
    targetLetter.value = sequence.target

    stimulusIndex.value = -1
    currentLetter.value = null
    hits.value = 0
    misses.value = 0
    falseAlarms.value = 0
    correctRejections.value = 0
    feedback.value = null
    elapsedTime.value = 0
    hitRTs = []
    tapped = false
    resuming = false
    pausedAtIndex = 0

    runCountdown(() => {
      status.value = 'playing'
      startElapsedTimer()
      presentStimulus(0)
    })
  }

  function tap() {
    if (status.value !== 'playing' || tapped) return // only the first tap per stimulus interval counts (SPEC §16/§18)
    tapped = true
    if (resuming) return // the synthetic buffer stimulus is never classified (SPEC §29)

    const rt = performance.now() - stimulusStartTime
    if (sequence.isTarget[stimulusIndex.value]) {
      hits.value += 1
      hitRTs.push(rt)
      feedback.value = 'hit'
    } else {
      falseAlarms.value += 1
      feedback.value = 'falseAlarm'
    }
    clearTimeout(feedbackTimeoutId)
    feedbackTimeoutId = setTimeout(() => {
      feedback.value = null
    }, FEEDBACK_MS)
  }

  function finish() {
    clearStimulusTimer()
    clearTimeout(feedbackTimeoutId)
    stopElapsedTimer()
    status.value = 'finished'
  }

  // Handles both mid-round (playing) and mid-countdown app-hide (SPEC §29).
  // The current stimulus (real or, if this is itself interrupting a post-
  // pause resume, the synthetic buffer) is discarded uncounted, never
  // classified — stimulusIndex.value already points at the right index to
  // replay in either case, since presentResumeBuffer() never changes it.
  function pause() {
    if (status.value === 'playing') {
      clearStimulusTimer()
      clearTimeout(feedbackTimeoutId)
      stopElapsedTimer()
      pausedAtIndex = stimulusIndex.value
    } else if (status.value === 'countdown') {
      clearCountdownTimers()
      // pausedAtIndex already holds the right resume point: 0 from start()
      // for the very first countdown, or whatever an earlier pause set it
      // to if this countdown is itself a resume that got interrupted again
      // before its buffer stimulus even appeared.
    } else {
      return
    }
    feedback.value = null
    currentLetter.value = null
    status.value = 'paused'
  }

  function resumeFromPause() {
    if (status.value !== 'paused') return
    runCountdown(() => {
      status.value = 'playing'
      startElapsedTimer()
      presentResumeBuffer(pausedAtIndex)
    })
  }

  function reset() {
    clearStimulusTimer()
    clearCountdownTimers()
    clearTimeout(feedbackTimeoutId)
    stopElapsedTimer()
    status.value = 'idle'
  }

  const results = computed(() => {
    const classification = { hits: hits.value, misses: misses.value, falseAlarms: falseAlarms.value, correctRejections: correctRejections.value }
    return {
      difficulty: difficulty.value,
      targetLetter: targetLetter.value,
      score: calculateTargetTapScore(classification),
      totalStimuli: totalStimuli.value,
      targets: sequence?.targetCount ?? 0,
      ...classification,
      accuracy: calculateAccuracy(classification),
      hitRate: calculateHitRate(classification),
      falseAlarmRate: calculateFalseAlarmRate(classification),
      ...calculateRTStats(hitRTs),
      duration: elapsedTime.value,
    }
  })

  return {
    status,
    countdownValue,
    difficulty,
    targetLetter,
    currentLetter,
    stimulusIndex,
    totalStimuli,
    totalDuration,
    elapsedTime,
    hits,
    misses,
    falseAlarms,
    correctRejections,
    feedback,
    results,
    start,
    tap,
    pause,
    resumeFromPause,
    reset,
  }
}
