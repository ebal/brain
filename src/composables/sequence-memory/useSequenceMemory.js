import { ref, computed } from 'vue'
import { generateInitialSequence, extendSequence, makeRng } from './sequenceGenerator.js'
import { SEQUENCE_DIFFICULTIES } from '../../constants/sequence-memory/difficulties.js'

const TIMER_TICK_MS = 250
const INTRO_MS = 900 // "Level N / Watch..." pause before playback
const RESULT_MS = 900 // "Correct!" / "Wrong" pause before continuing
const TAP_FEEDBACK_MS = 200 // brief per-tap highlight, never persists on the board

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

function median(arr) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// onChange(snapshot) is invoked after every autosave-worthy transition that
// happens asynchronously (level complete, life lost, pause) — those occur
// well after the tap/click that triggered them, so nothing else would
// persist them until the player's next action otherwise (see SET's history
// for the exact class of bug this avoids).
export function useSequenceMemory(onChange) {
  const status = ref('idle') // idle | countdown | intro | playback | input | result | paused | finished
  const difficulty = ref(null)
  const sequence = ref([])
  const level = ref(1)
  const isRetry = ref(false) // true while replaying the same sequence after a mistake
  const livesRemaining = ref(0)
  const initialLives = ref(0)
  const countdownValue = ref(0)
  const activeCell = ref(null) // cell index currently flashing during playback
  const playerIndex = ref(0) // how many correct taps into the current sequence
  const tapFeedback = ref(null) // { cell, correct } | null — transient
  const resultType = ref(null) // 'correct' | 'wrong' | null
  const correctTaps = ref(0)
  const mistakes = ref(0)
  const tapLog = ref([])
  const highestLevel = ref(1)
  const longestSequence = ref(0)
  const elapsedTime = ref(0)
  const startedAt = ref(null)

  let rng = Math.random
  let timerId = null
  let lastResumeTime = 0
  let countdownId = null
  let phaseTimeoutId = null
  let tapFeedbackTimeoutId = null
  let playbackIndex = 0
  let inputStartTime = 0
  let lastTapTime = 0

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

  function clearPhaseTimers() {
    clearInterval(countdownId)
    clearTimeout(phaseTimeoutId)
    countdownId = null
    phaseTimeoutId = null
  }

  function playbackTiming() {
    return SEQUENCE_DIFFICULTIES[difficulty.value]
  }

  function beginPlayback() {
    status.value = 'playback'
    playbackIndex = 0
    playNextPlaybackStep()
  }

  function playNextPlaybackStep() {
    if (playbackIndex >= sequence.value.length) {
      activeCell.value = null
      status.value = 'input'
      playerIndex.value = 0
      inputStartTime = performance.now()
      lastTapTime = inputStartTime
      return
    }
    const { flashOnMs, gapMs } = playbackTiming()
    activeCell.value = sequence.value[playbackIndex]
    phaseTimeoutId = setTimeout(() => {
      activeCell.value = null
      phaseTimeoutId = setTimeout(() => {
        playbackIndex += 1
        playNextPlaybackStep()
      }, gapMs)
    }, flashOnMs)
  }

  function startIntroThenPlayback() {
    status.value = 'intro'
    phaseTimeoutId = setTimeout(beginPlayback, INTRO_MS)
  }

  function startCountdownThenPlayback() {
    status.value = 'countdown'
    countdownValue.value = 3
    countdownId = setInterval(() => {
      countdownValue.value -= 1
      if (countdownValue.value <= 0) {
        clearInterval(countdownId)
        countdownId = null
        phaseTimeoutId = setTimeout(beginPlayback, 500)
      }
    }, 700)
  }

  function start(difficultyKey, seed) {
    const config = SEQUENCE_DIFFICULTIES[difficultyKey]
    difficulty.value = difficultyKey
    rng = makeRng(seed)
    sequence.value = generateInitialSequence(rng)
    level.value = 1
    isRetry.value = false
    livesRemaining.value = config.lives
    initialLives.value = config.lives
    activeCell.value = null
    playerIndex.value = 0
    tapFeedback.value = null
    resultType.value = null
    correctTaps.value = 0
    mistakes.value = 0
    tapLog.value = []
    highestLevel.value = 1
    longestSequence.value = 0
    elapsedTime.value = 0
    startedAt.value = new Date().toISOString()

    startTimer()
    startCountdownThenPlayback()
  }

  function resumeFromSave(saved) {
    difficulty.value = saved.difficulty
    sequence.value = saved.sequence
    level.value = saved.level
    isRetry.value = saved.isRetry || false
    livesRemaining.value = saved.livesRemaining
    initialLives.value = SEQUENCE_DIFFICULTIES[saved.difficulty].lives
    correctTaps.value = saved.correctTaps
    mistakes.value = saved.mistakes
    tapLog.value = saved.tapTimes
    highestLevel.value = Math.max(saved.level, 1)
    longestSequence.value = Math.max(saved.sequence.length - 1, 0)
    elapsedTime.value = saved.elapsedTime
    startedAt.value = saved.startedAt
    activeCell.value = null
    playerIndex.value = 0
    tapFeedback.value = null
    resultType.value = null
    rng = makeRng()

    startTimer()
    // Never restore mid-playback or mid-input (SPEC §19/§20) — always
    // restart the current level cleanly from its intro.
    startIntroThenPlayback()
  }

  function tapCell(cellIndex) {
    if (status.value !== 'input') return
    const now = performance.now()
    const responseTime = now - lastTapTime
    lastTapTime = now

    const expectedIndex = playerIndex.value
    const expectedCell = sequence.value[expectedIndex]
    const correct = cellIndex === expectedCell

    tapLog.value.push({ level: level.value, sequenceIndex: expectedIndex, cell: cellIndex, correct, responseTime })

    tapFeedback.value = { cell: cellIndex, correct }
    clearTimeout(tapFeedbackTimeoutId)
    tapFeedbackTimeoutId = setTimeout(() => {
      tapFeedback.value = null
    }, TAP_FEEDBACK_MS)

    if (correct) {
      correctTaps.value += 1
      playerIndex.value += 1
      if (playerIndex.value === sequence.value.length) {
        handleLevelSuccess()
      }
    } else {
      mistakes.value += 1
      handleLevelMistake()
    }
  }

  function handleLevelSuccess() {
    status.value = 'result'
    resultType.value = 'correct'
    highestLevel.value = Math.max(highestLevel.value, level.value)
    longestSequence.value = Math.max(longestSequence.value, sequence.value.length)
    phaseTimeoutId = setTimeout(() => {
      resultType.value = null
      level.value += 1
      isRetry.value = false
      sequence.value = extendSequence(sequence.value, rng)
      startIntroThenPlayback()
      onChange?.(snapshot())
    }, RESULT_MS)
  }

  function handleLevelMistake() {
    status.value = 'result'
    resultType.value = 'wrong'
    livesRemaining.value -= 1
    phaseTimeoutId = setTimeout(() => {
      resultType.value = null
      if (livesRemaining.value <= 0) {
        finish()
      } else {
        isRetry.value = true
        startIntroThenPlayback() // retry the SAME sequence — never regenerated
      }
      onChange?.(snapshot())
    }, RESULT_MS)
  }

  // Pausing (manual or tab-hidden) always leads to restarting the CURRENT
  // level from its intro on resume — never mid-playback or mid-input
  // (SPEC §18), so interruptions like phone calls never cost a life.
  function pause() {
    if (status.value === 'idle' || status.value === 'finished' || status.value === 'paused') return
    clearPhaseTimers()
    clearTimeout(tapFeedbackTimeoutId)
    stopTimer()
    activeCell.value = null
    tapFeedback.value = null
    resultType.value = null
    status.value = 'paused'
  }

  function resumeGame() {
    if (status.value !== 'paused') return
    startTimer()
    startIntroThenPlayback()
  }

  function finish() {
    clearPhaseTimers()
    clearTimeout(tapFeedbackTimeoutId)
    stopTimer()
    status.value = 'finished'
  }

  function reset() {
    clearPhaseTimers()
    clearTimeout(tapFeedbackTimeoutId)
    stopTimer()
    status.value = 'idle'
  }

  function snapshot() {
    return {
      difficulty: difficulty.value,
      sequence: sequence.value,
      level: level.value,
      isRetry: isRetry.value,
      livesRemaining: livesRemaining.value,
      correctTaps: correctTaps.value,
      mistakes: mistakes.value,
      tapTimes: tapLog.value,
      elapsedTime: elapsedTime.value,
      phase: status.value,
      startedAt: startedAt.value,
      updatedAt: new Date().toISOString(),
    }
  }

  const results = computed(() => {
    const correctTapTimes = tapLog.value.filter((t) => t.correct).map((t) => t.responseTime)
    const totalTaps = correctTaps.value + mistakes.value
    return {
      difficulty: difficulty.value,
      highestLevel: highestLevel.value,
      longestSequence: longestSequence.value,
      correctTaps: correctTaps.value,
      mistakes: mistakes.value,
      accuracy: totalTaps > 0 ? (correctTaps.value / totalTaps) * 100 : 0,
      avgTapTime: avg(correctTapTimes),
      medianTapTime: median(correctTapTimes),
      duration: elapsedTime.value,
      livesUsed: initialLives.value - livesRemaining.value,
    }
  })

  return {
    status,
    difficulty,
    level,
    isRetry,
    livesRemaining,
    countdownValue,
    activeCell,
    playerIndex,
    sequenceLength: computed(() => sequence.value.length),
    tapFeedback,
    resultType,
    correctTaps,
    mistakes,
    elapsedTime,
    results,
    start,
    resumeFromSave,
    tapCell,
    pause,
    resumeGame,
    reset,
    snapshot,
  }
}
