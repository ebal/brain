<template>
  <div class="about">
    <h1>How to Play</h1>

    <p class="intro">
      Watch the letters as they appear one at a time. Tap anywhere on the game area whenever your
      target letter appears. Do not tap for other letters.
    </p>

    <p class="intro">
      Every outcome is one of four kinds:
    </p>

    <div class="outcome-table">
      <div class="outcome-row"><span class="outcome-case">Target + tap</span><span class="outcome-result hit">Hit</span></div>
      <div class="outcome-row"><span class="outcome-case">Target + no tap</span><span class="outcome-result miss">Miss</span></div>
      <div class="outcome-row"><span class="outcome-case">Other + tap</span><span class="outcome-result falseAlarm">False Alarm</span></div>
      <div class="outcome-row"><span class="outcome-case">Other + no tap</span><span class="outcome-result correctRejection">Correct Rejection</span></div>
    </div>

    <p class="intro">
      Your target letter changes every round and never repeats the one from your last round. A
      false alarm costs more than a miss — the game rewards watching carefully and responding
      deliberately, not tapping often and hoping to catch a target.
    </p>

    <p class="intro">
      Target Tap is inspired by sustained-attention and target-detection tasks used in cognitive
      research, but it's a game, not a clinical or diagnostic test.
    </p>

    <h2>Try it yourself</h2>
    <p class="intro">Slower and unscored — just get a feel for watching and tapping before playing for real.</p>

    <div class="demo">
      <p class="demo-target">TARGET: <strong>{{ practiceTarget }}</strong></p>
      <button
        class="demo-surface"
        :disabled="practiceDone"
        aria-label="Practice tap area — tap when you see your target letter"
        @click="practiceTap"
      >
        <span v-if="!practiceDone" class="demo-letter" aria-hidden="true">{{ practiceLetter }}</span>
        <div v-if="practiceFeedback" class="demo-feedback-icon" :class="practiceFeedback" aria-live="polite">
          {{ practiceFeedback === 'hit' ? '✓' : practiceFeedback === 'falseAlarm' ? '✕' : '' }}
        </div>
      </button>
      <p class="demo-caption">
        <template v-if="practiceDone">That's the practice stream — start over to try again.</template>
        <template v-else-if="practiceFeedback === 'hit'">Hit! That was your target.</template>
        <template v-else-if="practiceFeedback === 'falseAlarm'">False Alarm — that wasn't your target.</template>
        <template v-else-if="practiceFeedback === 'miss'">Miss — that was your target, but time ran out.</template>
        <template v-else>Tap only when you see "{{ practiceTarget }}".</template>
      </p>
      <button class="next-btn" @click="startPractice">Start Over</button>
    </div>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { selectTarget, generateTargetPositions, generateDistractors } from '../../composables/targettap/sequence.js'

defineEmits(['menu'])

const PRACTICE_TOTAL = 8
const PRACTICE_TARGET_COUNT = 2
const PRACTICE_INTERVAL_MS = 1500 // slower than any real difficulty (SPEC §31: "short untimed or slow")

const practiceTarget = ref(null)
const practiceLetters = ref([])
const practiceTargetSet = ref(new Set())
const practiceIndex = ref(-1)
const practiceLetter = ref(null)
const practiceFeedback = ref(null) // 'hit' | 'falseAlarm' | 'miss' | null
const practiceDone = ref(false)
let practiceTapped = false
let practiceTimeoutId = null
let feedbackTimeoutId = null

function presentPracticeStimulus(index) {
  clearTimeout(feedbackTimeoutId)
  if (index >= practiceLetters.value.length) {
    practiceDone.value = true
    practiceLetter.value = null
    return
  }
  practiceIndex.value = index
  practiceLetter.value = practiceLetters.value[index]
  practiceFeedback.value = null
  practiceTapped = false

  practiceTimeoutId = setTimeout(() => {
    if (!practiceTapped && practiceTargetSet.value.has(index)) {
      practiceFeedback.value = 'miss'
      feedbackTimeoutId = setTimeout(() => { practiceFeedback.value = null }, 500)
    }
    presentPracticeStimulus(index + 1)
  }, PRACTICE_INTERVAL_MS)
}

function practiceTap() {
  if (practiceDone.value || practiceTapped) return
  practiceTapped = true
  practiceFeedback.value = practiceTargetSet.value.has(practiceIndex.value) ? 'hit' : 'falseAlarm'
}

function startPractice() {
  clearTimeout(practiceTimeoutId)
  clearTimeout(feedbackTimeoutId)
  const target = selectTarget(null, Math.random)
  const positions = generateTargetPositions(PRACTICE_TOTAL, PRACTICE_TARGET_COUNT, Math.random)
  practiceTarget.value = target
  practiceLetters.value = generateDistractors(target, PRACTICE_TOTAL, positions, Math.random)
  practiceTargetSet.value = new Set(positions)
  practiceDone.value = false
  presentPracticeStimulus(0)
}

startPractice()

onUnmounted(() => {
  clearTimeout(practiceTimeoutId)
  clearTimeout(feedbackTimeoutId)
})
</script>

<style scoped>
.about {
  max-width: 640px;
  width: 100%;
}

h1 {
  text-align: center;
  margin-bottom: 1rem;
}

h2 {
  margin: 2rem 0 0.75rem;
  font-size: 1.15rem;
}

.intro {
  color: var(--text-dim);
  line-height: 1.6;
}

.outcome-table {
  background: var(--surface);
  border-radius: 12px;
  overflow: hidden;
  margin: 0.5rem 0 1rem;
}

.outcome-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
}

.outcome-row:not(:last-child) {
  border-bottom: 1px solid var(--surface-2);
}

.outcome-case {
  color: var(--text-dim);
}

.outcome-result {
  font-weight: 700;
}

.outcome-result.hit {
  color: var(--correct);
}

.outcome-result.miss {
  color: var(--wrong);
}

.outcome-result.falseAlarm {
  color: var(--wrong);
}

.outcome-result.correctRejection {
  color: var(--text-dim);
}

.demo {
  background: var(--surface);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}

.demo-target {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
}

.demo-target strong {
  color: var(--accent);
  font-size: 1.1rem;
}

.demo-surface {
  position: relative;
  width: 100%;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-2);
  border: none;
  border-radius: 12px;
  padding: 0;
  cursor: pointer;
  user-select: none;
}

.demo-surface:disabled {
  cursor: default;
}

.demo-letter {
  font-size: 3rem;
  font-weight: 800;
  color: var(--text);
}

.demo-feedback-icon {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  font-size: 1.4rem;
  font-weight: 800;
}

.demo-feedback-icon.hit {
  color: var(--correct);
}

.demo-feedback-icon.falseAlarm {
  color: var(--wrong);
}

.demo-caption {
  margin: 0;
  min-height: 1.4em;
  color: var(--text-dim);
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
}

.next-btn {
  background: var(--surface-2);
  color: var(--text);
  border: none;
  border-radius: 10px;
  padding: 0.7rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}

.back-btn {
  display: block;
  margin: 2rem auto 0;
  background: var(--accent);
  color: #10121a;
  border: none;
  border-radius: 10px;
  padding: 0.85rem 1.5rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}
</style>
