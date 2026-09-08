<template>
  <div class="about">
    <h1>How to Play</h1>

    <p class="intro">
      Numbers appear one at a time. For each one (after a short setup), decide: does it match the
      number shown <strong>N positions earlier</strong>? Not just "have I seen this before" —
      specifically N steps back.
    </p>

    <div class="rule-box">
      Press <strong>MATCH</strong> when the current number equals the one N positions back, and
      <strong>NO MATCH</strong> otherwise. The first N numbers of every round have no valid
      comparison yet, so they're shown for you to build up memory but don't need an answer.
    </div>

    <h2>A 2-back example</h2>
    <div class="example-strip">
      <div v-for="(ex, i) in EXAMPLE_2BACK" :key="i" class="example-cell">
        <div class="example-number">{{ ex }}</div>
        <div class="example-arrow" :class="{ visible: i === 2 || i === 5 }">↑<br />MATCH</div>
      </div>
    </div>
    <p class="intro">
      Position 3 ("4") matches position 1 ("4"), two steps back. Position 6 ("2") matches position
      4 ("2"), also two steps back. Every other position is not a match.
    </p>

    <h2>What gets measured</h2>
    <ul class="metrics-list">
      <li><strong>Hit</strong> — it was a real match and you correctly pressed MATCH.</li>
      <li><strong>Miss</strong> — it was a real match but you pressed NO MATCH.</li>
      <li><strong>False alarm</strong> — it wasn't a match but you pressed MATCH anyway.</li>
      <li><strong>Correct rejection</strong> — it wasn't a match and you correctly pressed NO MATCH.</li>
    </ul>
    <p class="intro">
      Score rewards hits and correct rejections, and penalizes misses and false alarms more
      heavily — a false alarm counts worse than a miss, since it discourages just mashing MATCH.
      Reaction time is tracked (average and median, correct answers only) but doesn't affect the
      score — the timer isn't even shown live during play, so you're not tempted to rush at the
      expense of accuracy.
    </p>

    <h2>Difficulty levels</h2>
    <p class="intro">
      2-back is the Classic, reference difficulty — the best one for tracking progress over time.
      Difficulty comes purely from how far back you have to remember, not from harder numbers.
      Extreme keeps the same 2-back distance but swaps numbers for consonants (C, H, K, L, Q, R,
      S, T) over a longer round — a different, less familiar pool rather than a longer memory gap.
    </p>
    <div class="difficulty-table">
      <div class="difficulty-row difficulty-row--head">
        <span>Level</span>
        <span>N</span>
        <span>Scored trials</span>
      </div>
      <div v-for="d in difficulties" :key="d.key" class="difficulty-row">
        <span>
          {{ d.label }}
          <span v-if="d.isClassic" class="classic-tag">Classic</span>
          <span v-if="d.isLetters" class="classic-tag">Letters</span>
        </span>
        <span>{{ d.n }}-back</span>
        <span>{{ d.scoredTrials }}</span>
      </div>
    </div>

    <h2>Try it yourself</h2>
    <p class="intro">Untimed, unscored — just get a feel for it before playing for real.</p>

    <div class="n-toggle">
      <button
        v-for="opt in [2, 3, 4]"
        :key="opt"
        class="n-btn"
        :class="{ active: practiceN === opt }"
        @click="practiceN = opt"
      >
        {{ opt }}-back
      </button>
    </div>

    <div class="demo">
      <div class="demo-hud">
        <span>{{ practiceN }}-BACK practice</span>
        <span>{{ practiceTally.correct }} correct · {{ practiceTally.wrong }} wrong</span>
      </div>

      <div class="stimulus-area">
        <template v-if="!practiceDone">
          <div class="number" :style="{ color: practiceColor }">{{ practiceCurrentNumber }}</div>
          <div v-if="practiceFeedback" class="feedback-icon" :class="practiceFeedback">
            {{ practiceFeedback === 'correct' ? '✓' : '✕' }}
          </div>
        </template>
        <div v-else class="done-text">Practice sequence complete!</div>
      </div>

      <p class="feedback-text">
        <template v-if="practiceDone">Nice work — try a new sequence or a different N.</template>
        <template v-else-if="practiceIsSetup">Memorizing — no answer needed yet.</template>
        <template v-else>Does this match {{ practiceN }} number{{ practiceN > 1 ? 's' : '' }} back?</template>
      </p>

      <ResponseButtons :disabled="practiceIsSetup || practiceDone" @answer="practiceAnswer" />

      <button class="next-btn" @click="newPracticeSequence">New Sequence</button>
    </div>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import ResponseButtons from './ResponseButtons.vue'
import { NBACK_DIFFICULTIES } from '../../constants/nback/difficulties.js'
import { STIMULUS_COLORS } from '../../constants/nback/colors.js'
import { generateSequence } from '../../composables/nback/sequence.js'

defineEmits(['menu'])

const difficulties = Object.values(NBACK_DIFFICULTIES)

const EXAMPLE_2BACK = [4, 7, 4, 2, 9, 2]

const PRACTICE_SCORED = 10
const SETUP_STEP_MS = 1000

const practiceN = ref(2)
const practiceIndex = ref(0)
const practiceFeedback = ref(null)
const practiceTally = reactive({ correct: 0, wrong: 0 })

let practiceSeq = generateSequence(practiceN.value, PRACTICE_SCORED)
let setupTimeoutId = null
let answerTimeoutId = null

const practiceDone = computed(() => practiceIndex.value >= practiceSeq.numbers.length)
const practiceIsSetup = computed(() => practiceIndex.value < practiceN.value)
const practiceCurrentNumber = computed(() => practiceSeq.numbers[practiceIndex.value])
const practiceColor = ref(STIMULUS_COLORS[0])

function nextPracticeColor() {
  if (STIMULUS_COLORS.length <= 1) return STIMULUS_COLORS[0]
  let color
  do {
    color = STIMULUS_COLORS[Math.floor(Math.random() * STIMULUS_COLORS.length)]
  } while (color === practiceColor.value)
  return color
}

function scheduleSetupAdvance() {
  clearTimeout(setupTimeoutId)
  if (practiceIndex.value < practiceN.value) {
    setupTimeoutId = setTimeout(() => {
      practiceIndex.value += 1
      practiceColor.value = nextPracticeColor()
      scheduleSetupAdvance()
    }, SETUP_STEP_MS)
  }
}

function newPracticeSequence() {
  clearTimeout(setupTimeoutId)
  clearTimeout(answerTimeoutId)
  practiceSeq = generateSequence(practiceN.value, PRACTICE_SCORED)
  practiceIndex.value = 0
  practiceColor.value = nextPracticeColor()
  practiceFeedback.value = null
  practiceTally.correct = 0
  practiceTally.wrong = 0
  scheduleSetupAdvance()
}

function practiceAnswer(response) {
  if (practiceIsSetup.value || practiceDone.value || practiceFeedback.value) return
  const actualMatch = practiceSeq.isTarget[practiceIndex.value]
  const correct = (response === 'match') === actualMatch
  practiceFeedback.value = correct ? 'correct' : 'incorrect'
  if (correct) practiceTally.correct += 1
  else practiceTally.wrong += 1

  answerTimeoutId = setTimeout(() => {
    practiceFeedback.value = null
    practiceIndex.value += 1
    if (!practiceDone.value) practiceColor.value = nextPracticeColor()
  }, 300)
}

watch(practiceN, newPracticeSequence)
onMounted(scheduleSetupAdvance)
onUnmounted(() => {
  clearTimeout(setupTimeoutId)
  clearTimeout(answerTimeoutId)
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
  margin: 2rem 0 1rem;
  font-size: 1.15rem;
}

.intro {
  color: var(--text-dim);
  line-height: 1.6;
}

.rule-box {
  background: var(--surface);
  border: 1px solid var(--accent);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin: 1.25rem 0;
  line-height: 1.5;
}

.example-strip {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
  background: var(--surface);
  border-radius: 12px;
  padding: 1rem 0.5rem;
}

.example-cell {
  text-align: center;
}

.example-number {
  font-size: 1.5rem;
  font-weight: 800;
}

.example-arrow {
  margin-top: 0.35rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--accent);
  line-height: 1.3;
  visibility: hidden;
}

.example-arrow.visible {
  visibility: visible;
}

.metrics-list {
  color: var(--text-dim);
  line-height: 1.6;
  padding-left: 1.25rem;
}

.metrics-list li {
  margin-bottom: 0.5rem;
}

.metrics-list strong {
  color: var(--text);
}

.difficulty-table {
  background: var(--surface);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.difficulty-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  padding: 0.65rem 1rem;
  font-size: 0.9rem;
  align-items: center;
}

.difficulty-row:not(:last-child) {
  border-bottom: 1px solid var(--surface-2);
}

.difficulty-row--head {
  color: var(--text-dim);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.classic-tag {
  display: inline-block;
  margin-left: 0.5rem;
  background: var(--accent);
  color: #10121a;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  vertical-align: middle;
}

.n-toggle {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  background: var(--surface);
  padding: 0.35rem;
  border-radius: 12px;
  margin-bottom: 1rem;
}

.n-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  padding: 0.65rem 0.5rem;
  border-radius: 9px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
}

.n-btn.active {
  background: var(--accent);
  color: #10121a;
}

.demo {
  background: var(--surface);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.demo-hud {
  width: 100%;
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-dim);
}

.stimulus-area {
  position: relative;
  width: 100%;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-2);
  border-radius: 16px;
  user-select: none;
}

.number {
  font-size: clamp(3.5rem, 18vw, 5rem);
  font-weight: 800;
  color: var(--text);
  line-height: 1;
}

.feedback-icon {
  position: absolute;
  top: 0.6rem;
  right: 0.85rem;
  font-size: 1.5rem;
  font-weight: 800;
}

.feedback-icon.correct {
  color: var(--correct);
}

.feedback-icon.incorrect {
  color: var(--wrong);
}

.done-text {
  color: var(--correct);
  font-weight: 600;
  text-align: center;
  padding: 0 1rem;
}

.feedback-text {
  margin: 0;
  min-height: 1.4em;
  color: var(--text-dim);
  text-align: center;
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
