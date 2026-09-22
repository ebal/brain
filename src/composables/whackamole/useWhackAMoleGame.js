import { ref, computed } from 'vue'
import { generateStimulusSequence, classifyResponse } from './generator.js'
import { calculateWhackAMoleScore, calculateHitRate, calculateFalseAlarmRate, calculateRTStats, calculateStars } from './scoring.js'
import { getLevelConfig } from '../../constants/whackamole/levels.js'

const COUNTDOWN_STEP_MS = 700
const GO_DELAY_MS = 500
const FEEDBACK_MS = 200 // SPEC §13: "brief and non-blocking"
const TIMER_TICK_MS = 250

// SPEC §5-25. A level is a pre-generated, finite stream of stimuli — no
// board to clear, no win/lose condition beyond "every scheduled stimulus
// got classified" (SPEC §16). Reaction-time classification mirrors
// targettap/useTargetTapGame.js closely; the 50-level/stars/unlock shape
// mirrors hanoi and lightsout's useXGame.js. Unlike either, there's no
// autosave/Continue — SPEC §19 explicitly leaves mid-level persistence
// optional given how short a level is, and no manual Pause button (only
// the same app-hidden auto-pause every timed game already has).
export function useWhackAMoleGame() {
  const status = ref('idle') // idle | countdown | playing | paused | finished
  const countdownValue = ref(0)
  const level = ref(null)
  const gridSize = ref(0)
  const activeCell = ref(null) // index into the grid, or null during a gap
  const activeIsDistractor = ref(false)
  const stimulusIndex = ref(-1) // -1 before the first stimulus is presented
  const hits = ref(0)
  const misses = ref(0)
  const falseAlarms = ref(0)
  const correctRejections = ref(0)
  const emptyTaps = ref(0)
  const feedback = ref(null) // 'hit' | 'falseAlarm' | 'empty' | null
  const elapsedTime = ref(0)

  let config = null
  let sequence = null
  let tapped = false // has the CURRENT stimulus already received its one counted (Hit/False Alarm) response?
  let stimulusStartTime = 0
  let hitRTs = []
  let pausedAtIndex = 0
  let gapTimeoutId = null
  let visibleTimeoutId = null
  let feedbackTimeoutId = null
  let countdownId = null
  let goTimeoutId = null
  let elapsedTimerId = null
  let lastResumeTime = 0

  const totalStimuli = computed(() => sequence?.stimuli.length ?? 0)

  function clearStimulusTimers() {
    clearTimeout(gapTimeoutId)
    clearTimeout(visibleTimeoutId)
    gapTimeoutId = null
    visibleTimeoutId = null
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

  // SPEC §7's cycle: empty board -> gap -> stimulus -> response window ->
  // disappear -> next gap. `overrideGapMs` is only used by the post-pause
  // resume path (SPEC §19: "a fresh gap"), replacing the pre-generated gap
  // for this exact index rather than reusing it.
  function presentGap(index, overrideGapMs) {
    if (index >= sequence.stimuli.length) {
      finish()
      return
    }
    activeCell.value = null
    const gapMs = overrideGapMs ?? sequence.stimuli[index].gapMs
    gapTimeoutId = setTimeout(() => presentStimulus(index), gapMs)
  }

  function presentStimulus(index) {
    const stimulus = sequence.stimuli[index]
    stimulusIndex.value = index
    activeCell.value = stimulus.cell
    activeIsDistractor.value = stimulus.isDistractor
    tapped = false
    stimulusStartTime = performance.now()

    visibleTimeoutId = setTimeout(() => {
      if (!tapped) classify(stimulus, false)
      activeCell.value = null
      presentGap(index + 1)
    }, stimulus.visibleMs)
  }

  function classify(stimulus, wasTapped) {
    const outcome = classifyResponse(stimulus, wasTapped)
    if (outcome === 'hit') {
      hits.value += 1
      hitRTs.push(performance.now() - stimulusStartTime)
    } else if (outcome === 'miss') {
      misses.value += 1
    } else if (outcome === 'falseAlarm') {
      falseAlarms.value += 1
    } else {
      correctRejections.value += 1
    }
    return outcome
  }

  function showFeedback(kind) {
    clearTimeout(feedbackTimeoutId)
    feedback.value = kind
    feedbackTimeoutId = setTimeout(() => { feedback.value = null }, FEEDBACK_MS)
  }

  function begin(levelNumber) {
    config = getLevelConfig(levelNumber)
    sequence = generateStimulusSequence(config, undefined) // no seed for real play (SPEC §22)
    level.value = levelNumber
    gridSize.value = config.gridSize

    activeCell.value = null
    activeIsDistractor.value = false
    stimulusIndex.value = -1
    hits.value = 0
    misses.value = 0
    falseAlarms.value = 0
    correctRejections.value = 0
    emptyTaps.value = 0
    feedback.value = null
    elapsedTime.value = 0
    hitRTs = []
    tapped = false
    pausedAtIndex = 0

    runCountdown(() => {
      status.value = 'playing'
      startElapsedTimer()
      presentGap(0)
    })
  }

  // SPEC §11/§19's "whole occupied cell tappable, entire cell is the
  // response target." A tap on the currently active stimulus's cell
  // classifies it (Hit or False Alarm) and locks further responses for
  // that stimulus (SPEC §10: "Only one classified response may occur per
  // stimulus"). Any other tap — during a gap, or on a non-active cell
  // while a stimulus IS showing — is an Empty Tap (SPEC §4), and does NOT
  // lock out a later correct tap on the same stimulus.
  function tapCell(cellIndex) {
    if (status.value !== 'playing') return

    if (activeCell.value === null || cellIndex !== activeCell.value) {
      emptyTaps.value += 1
      showFeedback('empty')
      return
    }
    if (tapped) return // debounce: one classified response per stimulus (SPEC §10)
    tapped = true

    const stimulus = sequence.stimuli[stimulusIndex.value]
    const outcome = classify(stimulus, true)
    showFeedback(outcome === 'hit' ? 'hit' : 'falseAlarm')
  }

  function finish() {
    clearStimulusTimers()
    clearTimeout(feedbackTimeoutId)
    stopElapsedTimer()
    status.value = 'finished'
  }

  // SPEC §19: no manual Pause is required, but backgrounding the app still
  // pauses timing and discards whatever's in flight without classifying
  // it — same auto-pause-on-hidden pattern every timed game in the suite
  // uses (see targettap/lightsout's GameScreen.vue visibilitychange
  // listener, which calls this).
  function pause() {
    if (status.value === 'playing') {
      clearStimulusTimers()
      pausedAtIndex = stimulusIndex.value === -1 ? 0 : stimulusIndex.value
      stopElapsedTimer()
    } else if (status.value === 'countdown') {
      clearCountdownTimers()
    } else {
      return
    }
    clearTimeout(feedbackTimeoutId)
    feedback.value = null
    activeCell.value = null
    status.value = 'paused'
  }

  // SPEC §19: "Resume with 3-2-1, then a fresh gap/stimulus" — the exact
  // stimulus that was interrupted plays again in full (nothing from the
  // schedule is silently skipped or double-counted), but with a newly
  // rolled gap rather than replaying the original pre-generated one for
  // that slot.
  function resumeFromPause() {
    if (status.value !== 'paused') return
    runCountdown(() => {
      status.value = 'playing'
      startElapsedTimer()
      const freshGapMs = config.gapMinMs + Math.floor(Math.random() * (config.gapMaxMs - config.gapMinMs + 1))
      presentGap(pausedAtIndex, freshGapMs)
    })
  }

  function reset() {
    clearStimulusTimers()
    clearCountdownTimers()
    clearTimeout(feedbackTimeoutId)
    stopElapsedTimer()
    status.value = 'idle'
  }

  const results = computed(() => {
    const classification = {
      hits: hits.value, misses: misses.value,
      falseAlarms: falseAlarms.value, correctRejections: correctRejections.value,
      emptyTaps: emptyTaps.value,
    }
    const hitRate = calculateHitRate(classification)
    const falseAlarmRate = calculateFalseAlarmRate(classification)
    return {
      level: level.value,
      gridSize: gridSize.value,
      score: calculateWhackAMoleScore(classification),
      totalStimuli: totalStimuli.value,
      targets: config?.targetCount ?? 0,
      distractors: config?.distractorCount ?? 0,
      ...classification,
      hitRate,
      falseAlarmRate,
      ...calculateRTStats(hitRTs),
      stars: calculateStars({ hitRate, falseAlarmRate, emptyTaps: emptyTaps.value, hasDistractors: (config?.distractorCount ?? 0) > 0 }),
      duration: elapsedTime.value,
    }
  })

  return {
    status,
    countdownValue,
    level,
    gridSize,
    activeCell,
    activeIsDistractor,
    stimulusIndex,
    totalStimuli,
    elapsedTime,
    hits,
    misses,
    falseAlarms,
    correctRejections,
    emptyTaps,
    feedback,
    results,
    begin,
    tapCell,
    pause,
    resumeFromPause,
    reset,
  }
}
