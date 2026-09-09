<template>
  <div class="about">
    <h1>How to Play</h1>

    <p class="intro">
      Tap the targets in alternating order: <strong>1, A, 2, B, 3, C</strong>, and so on. Finish
      the trail before time runs out. The current target you need stays visible the whole round —
      the challenge is finding it and switching quickly between numbers and letters, not
      remembering what comes next.
    </p>

    <p class="intro">
      In Easy, Medium and Hard, targets never move once a round starts. A wrong tap costs points
      and shows a brief red flash, but doesn't end the round or reset your progress — just find
      the right one and keep going. Tapping empty space between targets is never penalized.
    </p>

    <p class="intro">
      <strong>Extreme</strong> is the same 24-target, 90-second trail as Hard, with one twist:
      every remaining target jumps to a brand new random position after each correct tap. You
      can't rely on remembering where anything is — every single tap means scanning the board
      fresh.
    </p>

    <p class="intro">
      <strong>Untimed</strong> is an optional checkbox available at every difficulty (including
      Extreme, and combinable with Random Color): the round never times out — it only ends once you
      finish the whole trail. No clock on screen and Score stays hidden until you're done, so
      there's nothing to rush. Your Untimed results are tracked separately from timed rounds.
    </p>

    <p class="intro">
      <strong>Random Color</strong> is an optional checkbox available at every difficulty
      (including Extreme): each target gets a random background color when it appears. Colors
      travel with the target — if it's repositioned by Extreme's reshuffle, its color comes with
      it. It doesn't hint at numbers vs. letters; it's pure visual noise to make scanning harder,
      tracked with its own separate best score/time so it never mixes with your plain results.
    </p>

    <p class="intro">
      Switch Trail is inspired by the Trail Making task-switching paradigm used in cognitive
      research, but it's a game, not a clinical or diagnostic test.
    </p>

    <h2>Try it yourself</h2>
    <p class="intro">Untimed, unscored — just get a feel for the switching before playing for real.</p>

    <div class="demo">
      <p class="demo-feedback" :class="{ wrong: practiceFeedback === 'wrong', done: practiceDone }">
        <template v-if="practiceDone">Nice work! That's the whole trail.</template>
        <template v-else-if="practiceFeedback === 'wrong'">Not quite — try again.</template>
        <template v-else>Find: <strong>{{ practiceExpected }}</strong></template>
      </p>
      <TrailBoard :layout="practiceLayout" :wrong-label="practiceWrongLabel" @tap="practiceTap" />
      <button class="next-btn" @click="newPracticeBoard">New Board</button>
    </div>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import TrailBoard from './TrailBoard.vue'
import { createTrailSequence, getExpectedTarget } from '../../composables/switchtrail/trailSequence.js'
import { generateTrailLayout } from '../../composables/switchtrail/trailLayout.js'

defineEmits(['menu'])

const PRACTICE_TARGET_COUNT = 6 // 1 -> A -> 2 -> B -> 3 -> C (SPEC §24)

const practiceSequence = ref([])
const practiceLayout = ref([])
const practiceIndex = ref(0)
const practiceFeedback = ref(null) // 'wrong' | null
const practiceWrongLabel = ref(null)
const practiceDone = ref(false)
let feedbackTimeoutId = null

function buildPracticeBoard() {
  clearTimeout(feedbackTimeoutId)
  practiceSequence.value = createTrailSequence(PRACTICE_TARGET_COUNT)
  practiceLayout.value = generateTrailLayout(practiceSequence.value).map((t) => ({ ...t, state: 'pending' }))
  practiceIndex.value = 0
  practiceFeedback.value = null
  practiceWrongLabel.value = null
  practiceDone.value = false
}

function newPracticeBoard() {
  buildPracticeBoard()
}

const practiceExpected = computed(() => getExpectedTarget(practiceSequence.value, practiceIndex.value))

function practiceTap(label) {
  if (practiceDone.value) return
  const target = practiceLayout.value.find((t) => t.label === label)
  if (!target || target.state === 'done') return

  if (label === getExpectedTarget(practiceSequence.value, practiceIndex.value)) {
    target.state = 'done'
    practiceIndex.value += 1
    if (practiceIndex.value >= practiceSequence.value.length) practiceDone.value = true
  } else {
    practiceFeedback.value = 'wrong'
    practiceWrongLabel.value = label
    clearTimeout(feedbackTimeoutId)
    feedbackTimeoutId = setTimeout(() => {
      practiceFeedback.value = null
      practiceWrongLabel.value = null
    }, 300)
  }
}

buildPracticeBoard()
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
  min-height: 1.4em;
  color: var(--text-dim);
  text-align: center;
  font-weight: 600;
}

.demo-feedback strong {
  color: var(--accent);
  font-size: 1.1rem;
}

.demo-feedback.wrong {
  color: var(--wrong);
}

.demo-feedback.done {
  color: var(--correct);
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
