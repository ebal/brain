<template>
  <div class="about">
    <h1>How to Play</h1>

    <p class="intro">
      Find the one number or letter that's different from all the others and tap it as quickly as
      you can. Every cell uses the exact same font, size and weight — the only thing that ever sets
      the odd one apart is the character itself.
    </p>

    <p class="intro">
      A correct tap immediately shows a new grid. A wrong tap costs points and briefly flashes red,
      but doesn't end the round — the grid stays exactly as it is, so just find the right cell and
      keep going. The challenge ends when the overall timer reaches zero, not after any single grid.
    </p>

    <p class="intro">
      Higher difficulties use larger grids and increasingly similar-looking pairs — first
      same-family look-alikes (like <strong>O</strong> vs. <strong>Q</strong>), then, only at
      Expert and Extreme, characters that can resemble each other across numbers and letters (like
      <strong>O</strong> vs. <strong>0</strong>).
    </p>

    <p class="intro">
      Odd One Out is inspired by classic visual-discrimination and visual-search tasks used in
      cognitive research, but it's a game, not a clinical or diagnostic test.
    </p>

    <h2>Try it yourself</h2>
    <p class="intro">Untimed, unscored — just get a feel for the search before playing for real.</p>

    <div class="demo">
      <p class="demo-feedback" :class="{ wrong: practiceFeedback === 'wrong', correct: practiceFeedback === 'correct', done: practiceDone }">
        <template v-if="practiceDone">Nice work! That's every example.</template>
        <template v-else-if="practiceFeedback === 'correct'">
          Correct! Everything else was "{{ lastSolvedTrial.base }}" — the odd one was "{{ lastSolvedTrial.odd }}".
        </template>
        <template v-else-if="practiceFeedback === 'wrong'">Not quite — look for the one that doesn't match. Try again.</template>
        <template v-else>Tap the odd one out.</template>
      </p>

      <div v-if="practiceTrial && !practiceDone" class="practice-grid-wrap">
        <div class="practice-grid" :style="{ '--grid-size': practiceTrial.gridSize }">
          <OddOneOutCell
            v-for="(value, i) in practiceTrial.cells"
            :key="i"
            :value="value"
            :is-wrong="practiceWrongIndex === i"
            @click="practiceTap(i)"
          />
        </div>
      </div>

      <button class="next-btn" @click="restartPractice">Start Over</button>
    </div>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import OddOneOutCell from './OddOneOutCell.vue'
import { generateTrial } from '../../composables/oddoneout/generator.js'

defineEmits(['menu'])

// SPEC §28: 5-10 untimed, unscored trials, starting simple then
// demonstrating a similar-character example — a fixed small grid throughout
// so the practice is about character discrimination, not visual search.
const PRACTICE_SIZE = 4
const PRACTICE_STEPS = ['easy', 'easy', 'hard', 'hard', 'expert', 'expert']

const practiceIndex = ref(0)
const practiceTrial = ref(null)
const lastSolvedTrial = ref(null)
const practiceFeedback = ref(null) // 'correct' | 'wrong' | null
const practiceWrongIndex = ref(null)
const practiceDone = ref(false)
let feedbackTimeoutId = null

function buildPracticeTrial() {
  clearTimeout(feedbackTimeoutId)
  const difficultyKey = PRACTICE_STEPS[practiceIndex.value]
  practiceTrial.value = generateTrial(difficultyKey, PRACTICE_SIZE, Math.random)
  practiceFeedback.value = null
  practiceWrongIndex.value = null
}

function practiceTap(index) {
  if (practiceDone.value || !practiceTrial.value) return

  if (index === practiceTrial.value.oddIndex) {
    lastSolvedTrial.value = practiceTrial.value
    practiceFeedback.value = 'correct'
    practiceIndex.value += 1
    if (practiceIndex.value >= PRACTICE_STEPS.length) {
      practiceDone.value = true
    } else {
      feedbackTimeoutId = setTimeout(buildPracticeTrial, 900)
    }
  } else {
    practiceFeedback.value = 'wrong'
    practiceWrongIndex.value = index
    feedbackTimeoutId = setTimeout(() => {
      practiceFeedback.value = null
      practiceWrongIndex.value = null
    }, 400)
  }
}

function restartPractice() {
  practiceIndex.value = 0
  practiceDone.value = false
  buildPracticeTrial()
}

buildPracticeTrial()
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

.intro strong {
  color: var(--text);
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

.demo-feedback {
  margin: 0;
  min-height: 2.6em;
  color: var(--text-dim);
  text-align: center;
  font-weight: 600;
}

.demo-feedback.wrong {
  color: var(--wrong);
}

.demo-feedback.correct,
.demo-feedback.done {
  color: var(--correct);
}

.practice-grid-wrap {
  --board-width: min(60vw, 260px);
  width: var(--board-width);
  aspect-ratio: 1;
}

.practice-grid {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(var(--grid-size), 1fr);
  grid-template-rows: repeat(var(--grid-size), 1fr);
  gap: clamp(2px, 0.8vw, 6px);
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
