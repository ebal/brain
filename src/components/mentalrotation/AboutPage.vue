<template>
  <div class="about">
    <h1>How to Play</h1>

    <p class="intro">
      Look at the <strong>reference</strong> shape, then pick the candidate that's the same shape
      after it's been <strong>rotated</strong>. A mirrored or structurally different shape does not
      count, even if it looks similar at a glance.
    </p>

    <div class="example-row">
      <div class="example">
        <p class="example-label">Reference</p>
        <div class="example-box">
          <ShapeGlyph :cells="exampleReference" />
        </div>
      </div>
      <div class="example">
        <p class="example-label">Rotated — ✓ match</p>
        <div class="example-box">
          <ShapeGlyph :cells="exampleRotated" />
        </div>
      </div>
      <div class="example">
        <p class="example-label">Mirrored — ✕ not a match</p>
        <div class="example-box">
          <ShapeGlyph :cells="exampleMirrored" />
        </div>
      </div>
    </div>

    <h2>Difficulty</h2>
    <p class="intro">
      The rule never changes — difficulty comes from more candidates to compare, bigger/more complex
      shapes, and stronger mirrored or structurally-modified distractors. <strong>Easy</strong> is 2
      choices, <strong>Medium</strong> is 3, <strong>Hard</strong> and <strong>Very Hard</strong> are
      4, with Very Hard using the most complex shapes and toughest distractors.
    </p>

    <h2>Speed</h2>
    <p class="intro">
      Score rewards both correctness and speed: a correct answer is worth more the faster you find
      it, and an incorrect answer costs points — so guessing fast isn't free, but neither is taking
      forever. Accuracy and median reaction time are tracked separately from Score, since they're
      the more meaningful raw measurements.
    </p>

    <h2>Timed vs. Untimed</h2>
    <p class="intro">
      Prefer no clock? Choose <strong>Untimed</strong> from the menu instead of Timed. Same shapes
      and difficulty, but the round ends after a fixed set of questions instead of a countdown —
      no timer on screen, and Score isn't shown until you're done, so there's nothing to rush.
    </p>

    <h2>Try it yourself</h2>
    <p class="intro">Untimed, unscored — just get a feel for spotting a real rotation.</p>

    <div class="demo">
      <div class="reference-box">
        <ShapeGlyph :cells="practiceTrial.referenceCells" />
      </div>

      <p class="demo-feedback" :class="{ correct: practiceFeedback?.correct, wrong: practiceFeedback && !practiceFeedback.correct }">
        {{ practiceFeedback ? practiceFeedback.message : 'Which candidate is the reference, rotated?' }}
      </p>

      <div class="candidate-grid">
        <button
          v-for="(candidate, i) in practiceTrial.candidates"
          :key="candidate.id"
          class="candidate-card"
          :class="practiceCandidateClass(candidate)"
          :disabled="!!practiceFeedback"
          @click="practiceAnswer(candidate.id)"
        >
          <span class="candidate-letter">{{ String.fromCharCode(65 + i) }}</span>
          <ShapeGlyph :cells="candidate.cells" />
        </button>
      </div>

      <button class="next-btn" @click="newPracticeTrial">New Shape</button>
    </div>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ShapeGlyph from './ShapeGlyph.vue'
import { generateTrial } from '../../composables/mentalrotation/trialGenerator.js'
import { rotateShape, mirrorShape } from '../../composables/mentalrotation/geometry.js'
import { MENTALROTATION_SHAPES } from '../../constants/mentalrotation/shapes.js'
import { MENTALROTATION_DIFFICULTIES } from '../../constants/mentalrotation/difficulties.js'

defineEmits(['menu'])

const exampleReference = MENTALROTATION_SHAPES[0].cells
const exampleRotated = rotateShape(exampleReference, 1)
const exampleMirrored = mirrorShape(exampleReference, 'vertical')

// Practice reuses Easy's real trial generator (2 choices: one rotated match,
// one mirrored-and-rotated distractor — SPEC §26's three required example
// types, since the mirror distractor already carries a random rotation on
// top of the mirror). Never persisted: no timer, no score, no history.
const practiceTrial = ref(generateTrial(MENTALROTATION_DIFFICULTIES.easy))
const practiceFeedback = ref(null) // { correct, message } | null
const practiceSelectedId = ref(null)

function practiceCandidateClass(candidate) {
  if (!practiceFeedback.value || candidate.id !== practiceSelectedId.value) return ''
  return practiceFeedback.value.correct ? 'selected-correct' : 'selected-wrong'
}

function practiceAnswer(candidateId) {
  if (practiceFeedback.value) return
  const candidate = practiceTrial.value.candidates.find((c) => c.id === candidateId)
  practiceSelectedId.value = candidateId
  practiceFeedback.value = candidate.correct
    ? { correct: true, message: 'Correct — that\'s the reference shape, rotated.' }
    : { correct: false, message: 'Not quite — that one is mirrored, not rotated. Try again.' }
}

function newPracticeTrial() {
  practiceTrial.value = generateTrial(MENTALROTATION_DIFFICULTIES.easy)
  practiceSelectedId.value = null
  practiceFeedback.value = null
}
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

.example-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
  margin: 1rem 0 1.5rem;
}

.example {
  text-align: center;
}

.example-label {
  margin: 0 0 0.4rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-dim);
}

.example-box {
  aspect-ratio: 1;
  background: var(--stimulus-bg);
  border-radius: 12px;
  padding: 0.6rem;
}

.example-box :deep(rect) {
  fill: #10121a;
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

.reference-box {
  width: 100%;
  max-width: 160px;
  aspect-ratio: 1;
  background: var(--stimulus-bg);
  border-radius: 14px;
  padding: 0.75rem;
}

.reference-box :deep(rect) {
  fill: #10121a;
}

.demo-feedback {
  margin: 0;
  min-height: 1.4em;
  color: var(--text-dim);
  text-align: center;
  font-weight: 600;
}

.demo-feedback.correct {
  color: var(--correct);
}

.demo-feedback.wrong {
  color: var(--wrong);
}

.candidate-grid {
  width: 100%;
  max-width: 320px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.6rem;
}

.candidate-card {
  position: relative;
  aspect-ratio: 1;
  background: var(--surface-2);
  border: 3px solid transparent;
  border-radius: 12px;
  padding: 0.6rem;
  cursor: pointer;
  touch-action: manipulation;
}

.candidate-letter {
  position: absolute;
  top: 0.3rem;
  left: 0.45rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-dim);
}

.candidate-card.selected-correct {
  border-color: var(--correct);
}

.candidate-card.selected-wrong {
  border-color: var(--wrong);
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
