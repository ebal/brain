import { ref, computed } from 'vue'
import { generateRound } from './generator.js'
import { calculateScore, calculateStars } from './scoring.js'
import { getLevelConfig, FLAGS_LEVELS } from '../../constants/flags/levels.js'

const TIMER_TICK_MS = 250
const FEEDBACK_CORRECT_MS = 1200 // SPEC §12: "roughly 1-1.5s" — enough to register, not a lesson
const FEEDBACK_WRONG_MS = 1800 // more to compare (two flags, two names), still brief per SPEC §12

// SPEC §11/§13/§24: a self-paced, no-hard-timer question loop (unlike the
// reaction-time games in this suite) — status is 'playing' (choices shown,
// input open) -> 'feedback' (locked, showing correct/incorrect result) ->
// next question, or 'finished' after the level's questionCount. A
// performance.now() count-up timer runs from the first question through
// the last (SPEC §13), pausing across backgrounding exactly like every
// other timed game's useXGame.js (see whackamole/lightsout for the same
// pause/resume shape) — but unlike those, an unanswered question is never
// scored on pause (SPEC §24): status simply freezes mid-'playing'.
export function useFlagsGame() {
  const status = ref('idle') // idle | playing | feedback | paused | finished
  const level = ref(null)
  const isPractice = ref(false)
  const questionIndex = ref(0)
  const totalQuestions = ref(0)
  const currentQuestion = ref(null) // { country, choices, correctIndex }
  const selectedIndex = ref(null)
  const lastAnswer = ref(null) // { correct, correctCode, selectedCode } | null
  const correctCount = ref(0)
  const currentStreak = ref(0)
  const bestStreak = ref(0)
  const elapsedTime = ref(0)

  let questions = []
  let perQuestionLog = []
  let statusBeforePause = null
  let feedbackTimeoutId = null
  let elapsedTimerId = null
  let lastResumeTime = 0

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

  function loadQuestion(index) {
    questionIndex.value = index
    currentQuestion.value = questions[index]
    selectedIndex.value = null
    lastAnswer.value = null
    status.value = 'playing'
  }

  function startRound(levelNumber, generatedQuestions, practice) {
    questions = generatedQuestions
    perQuestionLog = []
    level.value = levelNumber
    isPractice.value = practice
    totalQuestions.value = questions.length
    correctCount.value = 0
    currentStreak.value = 0
    bestStreak.value = 0
    elapsedTime.value = 0
    startElapsedTimer()
    loadQuestion(0)
  }

  // SPEC §7/§26: real play uses no seed (fresh each attempt); learningState
  // (from useFlagsStats().getLearningState()) feeds SPEC §15's weak-country
  // review weighting.
  function begin(levelNumber, learningState) {
    const config = getLevelConfig(levelNumber)
    startRound(levelNumber, generateRound(config, undefined, learningState), false)
  }

  // SPEC §16: Practice Weak Flags — same question/feedback engine, targets
  // drawn from the caller's weak-country pool (padded with the full dataset
  // via generateRound's own weighting if there are fewer than questionCount
  // weak entries), distractorTier fixed at 4 (confusion-heavy, since a
  // weak flag's most useful distractors are its known confusions).
  // Deliberately does not touch level/unlock state — see useFlagsStats.js's
  // recordCompletion(level=null, ...) short-circuit.
  function beginPractice(countryPool, learningState) {
    const config = { countryPool, distractorTier: 4, questionCount: Math.min(10, Math.max(4, countryPool.length)) }
    startRound(null, generateRound(config, undefined, learningState), true)
  }

  function selectAnswer(index) {
    if (status.value !== 'playing' || !currentQuestion.value) return
    const q = currentQuestion.value
    const correct = index === q.correctIndex
    const selectedCode = q.choices[index]

    selectedIndex.value = index
    lastAnswer.value = { correct, correctCode: q.country, selectedCode: correct ? null : selectedCode }

    correctCount.value += correct ? 1 : 0
    currentStreak.value = correct ? currentStreak.value + 1 : 0
    bestStreak.value = Math.max(bestStreak.value, currentStreak.value)

    perQuestionLog.push({
      countryCode: q.country,
      correct,
      wrongCode: correct ? null : selectedCode,
      timestamp: Date.now(),
    })

    status.value = 'feedback'
    feedbackTimeoutId = setTimeout(advance, correct ? FEEDBACK_CORRECT_MS : FEEDBACK_WRONG_MS)
  }

  function advance() {
    clearTimeout(feedbackTimeoutId)
    feedbackTimeoutId = null
    if (questionIndex.value + 1 >= questions.length) {
      finish()
    } else {
      loadQuestion(questionIndex.value + 1)
    }
  }

  function finish() {
    clearTimeout(feedbackTimeoutId)
    feedbackTimeoutId = null
    stopElapsedTimer()
    status.value = 'finished'
  }

  // SPEC §24: backgrounding pauses the timer and hides choices without
  // scoring whatever's in flight — a question mid-'playing' just freezes
  // (nothing to undo); a question mid-'feedback' has its auto-advance timer
  // cancelled and replays that same feedback in full on resume, so a missed
  // wrong-answer comparison isn't silently cut short.
  function pause() {
    if (status.value !== 'playing' && status.value !== 'feedback') return
    statusBeforePause = status.value
    clearTimeout(feedbackTimeoutId)
    feedbackTimeoutId = null
    stopElapsedTimer()
    status.value = 'paused'
  }

  function resumeFromPause() {
    if (status.value !== 'paused') return
    const resumeTo = statusBeforePause
    statusBeforePause = null
    status.value = resumeTo
    startElapsedTimer()
    if (resumeTo === 'feedback') {
      const correct = lastAnswer.value?.correct
      feedbackTimeoutId = setTimeout(advance, correct ? FEEDBACK_CORRECT_MS : FEEDBACK_WRONG_MS)
    }
  }

  function reset() {
    clearTimeout(feedbackTimeoutId)
    feedbackTimeoutId = null
    stopElapsedTimer()
    status.value = 'idle'
    questions = []
    perQuestionLog = []
  }

  // SPEC §24: reload-survivable snapshot (opaque to the caller — GameScreen
  // just round-trips this through useFlagsStorage.js), used in addition to
  // the tab-hidden pause/resume above.
  function snapshot() {
    return {
      level: level.value,
      isPractice: isPractice.value,
      questions,
      questionIndex: questionIndex.value,
      correctCount: correctCount.value,
      currentStreak: currentStreak.value,
      bestStreak: bestStreak.value,
      elapsedTime: elapsedTime.value,
      perQuestionLog,
    }
  }

  function resumeFromSave(saved) {
    questions = saved.questions
    perQuestionLog = saved.perQuestionLog
    level.value = saved.level
    isPractice.value = saved.isPractice
    totalQuestions.value = questions.length
    correctCount.value = saved.correctCount
    currentStreak.value = saved.currentStreak
    bestStreak.value = saved.bestStreak
    elapsedTime.value = saved.elapsedTime
    loadQuestion(saved.questionIndex)
    startElapsedTimer()
  }

  const hasNextLevel = computed(() => level.value != null && level.value < FLAGS_LEVELS.length)

  const results = computed(() => {
    const total = totalQuestions.value
    const correct = correctCount.value
    return {
      level: level.value,
      isPractice: isPractice.value,
      correctCount: correct,
      totalCount: total,
      accuracy: total ? (correct / total) * 100 : 0,
      bestStreak: bestStreak.value,
      score: calculateScore({ correctCount: correct }),
      stars: calculateStars({ correctCount: correct, totalCount: total }),
      duration: elapsedTime.value,
      perQuestionLog: [...perQuestionLog],
      missedCodes: [...new Set(perQuestionLog.filter((q) => !q.correct).map((q) => q.countryCode))],
    }
  })

  return {
    status,
    level,
    isPractice,
    questionIndex,
    totalQuestions,
    currentQuestion,
    selectedIndex,
    lastAnswer,
    correctCount,
    currentStreak,
    bestStreak,
    elapsedTime,
    hasNextLevel,
    results,
    begin,
    beginPractice,
    selectAnswer,
    pause,
    resumeFromPause,
    reset,
    snapshot,
    resumeFromSave,
  }
}
