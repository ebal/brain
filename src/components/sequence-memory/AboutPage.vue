<template>
  <div class="about">
    <h1>How to Play</h1>

    <p class="intro">
      Watch the cells flash one at a time. When the sequence finishes, tap the same cells in
      exactly the same order.
    </p>

    <ul class="rules-list">
      <li>Every successful level adds exactly one new step to the sequence you already know.</li>
      <li>The same cell can appear more than once — just never twice in a row.</li>
      <li>A mistake costs a life, and you'll see the exact same sequence again, not a new one.</li>
      <li>The goal is simply to remember the longest sequence you can.</li>
    </ul>

    <h2>Try it yourself</h2>
    <p class="intro">Untimed, unscored, just 3 steps — get a feel for it before playing for real.</p>

    <div class="demo">
      <p class="demo-caption">
        <template v-if="phase === 'playback'">Watch...</template>
        <template v-else-if="phase === 'input'">Your turn — {{ playerIndex }} / 3</template>
        <template v-else-if="phase === 'correct'">Nice! That's the idea.</template>
        <template v-else-if="phase === 'wrong'">Not quite — try again.</template>
      </p>

      <MemoryGrid
        :active-cell="activeCell"
        :tap-feedback="tapFeedback"
        :interactive="phase === 'input'"
        @select="handleTap"
      />

      <button class="next-btn" @click="newDemo">Try Another</button>
    </div>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import MemoryGrid from './MemoryGrid.vue'

defineEmits(['menu'])

const FLASH_ON_MS = 600
const GAP_MS = 300

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildDemoSequence() {
  const seq = []
  for (let i = 0; i < 3; i++) {
    const prev = seq[seq.length - 1]
    const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((c) => c !== prev)
    seq.push(pickRandom(pool))
  }
  return seq
}

const phase = ref('playback') // playback | input | correct | wrong
const activeCell = ref(null)
const playerIndex = ref(0)
const tapFeedback = ref(null)

let demoSequence = buildDemoSequence()
let playbackIndex = 0
let timeoutIds = []

function after(ms, fn) {
  const id = setTimeout(fn, ms)
  timeoutIds.push(id)
  return id
}

function clearAllTimeouts() {
  timeoutIds.forEach(clearTimeout)
  timeoutIds = []
}

function playNextStep() {
  if (playbackIndex >= demoSequence.length) {
    activeCell.value = null
    phase.value = 'input'
    playerIndex.value = 0
    return
  }
  activeCell.value = demoSequence[playbackIndex]
  after(FLASH_ON_MS, () => {
    activeCell.value = null
    after(GAP_MS, () => {
      playbackIndex += 1
      playNextStep()
    })
  })
}

function startPlayback() {
  clearAllTimeouts()
  phase.value = 'playback'
  playbackIndex = 0
  playNextStep()
}

function handleTap(cellIndex) {
  if (phase.value !== 'input') return
  const correct = cellIndex === demoSequence[playerIndex.value]
  tapFeedback.value = { cell: cellIndex, correct }
  after(200, () => { tapFeedback.value = null })

  if (correct) {
    playerIndex.value += 1
    if (playerIndex.value === demoSequence.length) {
      phase.value = 'correct'
    }
  } else {
    phase.value = 'wrong'
  }
}

function newDemo() {
  clearAllTimeouts()
  demoSequence = buildDemoSequence()
  startPlayback()
}

startPlayback()

onUnmounted(clearAllTimeouts)
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

.rules-list {
  color: var(--text-dim);
  line-height: 1.6;
  padding-left: 1.25rem;
}

.rules-list li {
  margin-bottom: 0.5rem;
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

.demo-caption {
  margin: 0;
  min-height: 1.4em;
  color: var(--text-dim);
  font-weight: 600;
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
