<template>
  <div class="about">
    <h1>How to Play</h1>

    <p class="intro">
      A mole (🐹) pops up briefly in one of the grid's holes — tap it before it disappears. Later
      levels add a distractor (🐰) — don't tap that one.
    </p>

    <p class="intro">
      Every response is one of five outcomes:
    </p>

    <div class="outcome-table">
      <div class="outcome-row"><span class="outcome-case">Mole + tap</span><span class="outcome-result hit">Hit</span></div>
      <div class="outcome-row"><span class="outcome-case">Mole + no tap</span><span class="outcome-result miss">Miss</span></div>
      <div class="outcome-row"><span class="outcome-case">Distractor + tap</span><span class="outcome-result falseAlarm">False Alarm</span></div>
      <div class="outcome-row"><span class="outcome-case">Distractor + no tap</span><span class="outcome-result correctRejection">Correct Rejection</span></div>
      <div class="outcome-row"><span class="outcome-case">Wrong/empty cell tap</span><span class="outcome-result emptyTap">Empty Tap</span></div>
    </div>

    <p class="intro">
      50 levels, starting on a small 2×2 grid with the mole only. The grid grows, the mole appears
      faster, and the distractor is introduced gradually. Completing a level — mistakes or not —
      unlocks the next one; stars measure how clean your run was, but never block progress.
    </p>

    <p class="intro">
      Whack-a-Mole is inspired by classic spatial-attention and go/no-go reaction tasks, but it's a
      game, not a clinical or diagnostic test.
    </p>

    <h2>Try it yourself</h2>
    <p class="intro">Slower and unscored — just get a feel for spotting and tapping the mole.</p>

    <div class="demo">
      <p class="demo-caption">
        <template v-if="practiceFeedback === 'hit'">Hit! Nice reflexes.</template>
        <template v-else-if="practiceFeedback === 'miss'">Miss — too slow that time.</template>
        <template v-else-if="practiceFeedback === 'empty'">That wasn't the mole's hole.</template>
        <template v-else>Tap the mole (🐹) when it appears.</template>
      </p>

      <div class="demo-grid">
        <button
          v-for="i in 4"
          :key="i - 1"
          class="demo-cell"
          :class="{ active: practiceCell === i - 1 }"
          @click="practiceTap(i - 1)"
        >
          <span v-if="practiceCell === i - 1" class="demo-emoji" aria-hidden="true">🐹</span>
        </button>
      </div>

      <button class="next-btn" @click="restartPractice">Start Over</button>
    </div>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'

defineEmits(['menu'])

const PRACTICE_GAP_MS = 1200
const PRACTICE_VISIBLE_MS = 1400 // slower than any real level (SPEC §21: "a short 2x2 practice")

const practiceCell = ref(null)
const practiceFeedback = ref(null) // 'hit' | 'miss' | 'empty' | null
let practiceTapped = false
let gapTimeoutId = null
let visibleTimeoutId = null
let feedbackTimeoutId = null

function scheduleNextMole() {
  practiceCell.value = null
  gapTimeoutId = setTimeout(showMole, PRACTICE_GAP_MS)
}

function showMole() {
  practiceCell.value = Math.floor(Math.random() * 4)
  practiceTapped = false
  visibleTimeoutId = setTimeout(() => {
    if (!practiceTapped) flashFeedback('miss')
    scheduleNextMole()
  }, PRACTICE_VISIBLE_MS)
}

function flashFeedback(kind) {
  clearTimeout(feedbackTimeoutId)
  practiceFeedback.value = kind
  feedbackTimeoutId = setTimeout(() => { practiceFeedback.value = null }, 500)
}

function practiceTap(index) {
  if (index !== practiceCell.value) {
    flashFeedback('empty')
    return
  }
  if (practiceTapped) return
  practiceTapped = true
  flashFeedback('hit')
}

function restartPractice() {
  clearTimeout(gapTimeoutId)
  clearTimeout(visibleTimeoutId)
  clearTimeout(feedbackTimeoutId)
  practiceFeedback.value = null
  scheduleNextMole()
}

restartPractice()

onUnmounted(() => {
  clearTimeout(gapTimeoutId)
  clearTimeout(visibleTimeoutId)
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

.outcome-result.emptyTap {
  color: var(--text-dim);
}

.demo {
  background: var(--surface);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.demo-caption {
  margin: 0;
  min-height: 1.4em;
  color: var(--text-dim);
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
}

.demo-grid {
  width: min(60vw, 220px);
  aspect-ratio: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.demo-cell {
  background: var(--surface-2);
  border: 2px solid var(--surface-2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.demo-cell.active {
  border-color: var(--accent);
}

.demo-emoji {
  font-size: 2.5rem;
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
