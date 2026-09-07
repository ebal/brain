<template>
  <div class="about">
    <h1>How to Play</h1>

    <p class="intro">
      Flip two tiles at a time. If the emoji match, the pair stays revealed. If they don't,
      remember where they were — they'll flip back face down after a moment, and you'll need to
      find that pair again later.
    </p>

    <div class="rule-box">
      The board never changes once a round starts — tiles stay exactly where they were placed.
      There's no mistake-based game over: mismatches cost points, not the game.
    </div>

    <h2>What gets measured</h2>
    <ul class="metrics-list">
      <li><strong>Move</strong> — one completed two-tile attempt (a mismatch still counts as a Move).</li>
      <li><strong>Mistake</strong> — a Move where the two tiles didn't match. A mismatch is both an extra Move and a Mistake, so it costs more than random guessing is worth.</li>
      <li><strong>Move Efficiency</strong> — the theoretical minimum (one Move per pair) divided by your actual Moves. 100% means you never revealed a tile you didn't already know.</li>
      <li><strong>Score</strong> — a difficulty-scaled base score, minus time, extra Moves, and Mistakes. A game metric, not a memory measurement — Time, Moves, Mistakes, and Efficiency are always shown separately too.</li>
    </ul>

    <h2>Difficulty levels</h2>
    <p class="intro">
      Difficulty comes purely from how many tile locations you have to remember — not from tiny
      tiles or a shorter mismatch delay.
    </p>
    <div class="difficulty-table">
      <div class="difficulty-row difficulty-row--head">
        <span>Level</span>
        <span>Tiles</span>
        <span>Pairs</span>
      </div>
      <div v-for="d in difficulties" :key="d.key" class="difficulty-row">
        <span>{{ d.label }}</span>
        <span>{{ d.cols * d.rows }}</span>
        <span>{{ d.pairs }}</span>
      </div>
    </div>

    <h2>Try it yourself</h2>
    <p class="intro">Untimed, unscored — just get a feel for it. Two pairs, four tiles.</p>

    <div class="demo">
      <p class="demo-feedback" :class="{ wrong: practiceFeedback === 'wrong', done: practiceDone }">
        <template v-if="practiceDone">Nice! That's the whole idea.</template>
        <template v-else-if="practiceFeedback === 'wrong'">Not a match — remember those two.</template>
        <template v-else>Flip two tiles.</template>
      </p>
      <MemoryBoard
        :tiles="practiceTiles"
        :cols="2"
        :portrait-cols="2"
        :wrong-ids="practiceWrongIds"
        @tap="practiceTap"
      />
      <button class="next-btn" @click="newPracticeBoard">New Board</button>
    </div>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MemoryBoard from './MemoryBoard.vue'
import { createMemoryDeck } from '../../composables/memorypairs/memoryDeck.js'
import { MEMORYPAIRS_DIFFICULTIES } from '../../constants/memorypairs/difficulties.js'

defineEmits(['menu'])

const difficulties = Object.values(MEMORYPAIRS_DIFFICULTIES)

const PRACTICE_PAIRS = 2
const MISMATCH_DELAY_MS = 800

const practiceTiles = ref(createMemoryDeck(PRACTICE_PAIRS))
const practiceSelected = ref([])
const practiceFeedback = ref(null) // 'wrong' | null
const practiceWrongIds = ref([])
const practiceDone = ref(false)
let feedbackTimeoutId = null

function buildPracticeBoard() {
  clearTimeout(feedbackTimeoutId)
  practiceTiles.value = createMemoryDeck(PRACTICE_PAIRS)
  practiceSelected.value = []
  practiceFeedback.value = null
  practiceWrongIds.value = []
  practiceDone.value = false
}

function newPracticeBoard() {
  buildPracticeBoard()
}

function practiceTap(tileId) {
  if (practiceDone.value || practiceFeedback.value) return
  const tile = practiceTiles.value.find((t) => t.id === tileId)
  if (!tile || tile.state !== 'facedown') return

  tile.state = 'revealed'
  practiceSelected.value.push(tileId)
  if (practiceSelected.value.length < 2) return

  const [a, b] = practiceSelected.value.map((id) => practiceTiles.value.find((t) => t.id === id))
  if (a.emoji === b.emoji) {
    a.state = 'matched'
    b.state = 'matched'
    practiceSelected.value = []
    if (practiceTiles.value.every((t) => t.state === 'matched')) practiceDone.value = true
  } else {
    practiceFeedback.value = 'wrong'
    practiceWrongIds.value = [...practiceSelected.value]
    feedbackTimeoutId = setTimeout(() => {
      a.state = 'facedown'
      b.state = 'facedown'
      practiceSelected.value = []
      practiceFeedback.value = null
      practiceWrongIds.value = []
    }, MISMATCH_DELAY_MS)
  }
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

.rule-box {
  background: var(--surface);
  border: 1px solid var(--accent);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin: 1.25rem 0;
  line-height: 1.5;
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
