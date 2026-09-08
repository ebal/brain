<template>
  <div class="about">
    <h1>How to Play</h1>

    <p class="intro">
      Select three cards. For every property — <strong>number</strong>, <strong>shape</strong>,
      <strong>color</strong> and <strong>shading</strong> — the three cards must be either
      <strong>all the same</strong> or <strong>all different</strong>. If even one property has
      exactly two matching and one different, it's not a SET.
    </p>

    <h2>A valid example</h2>
    <div class="example-row">
      <SetCard v-for="(c, i) in validExample" :key="i" v-bind="c" />
    </div>
    <p class="intro">
      Number and shape and color are all different; shading is all the same. Every property passes
      independently, so this is a SET.
    </p>

    <h2>An invalid example</h2>
    <div class="example-row">
      <SetCard v-for="(c, i) in invalidExample" :key="i" v-bind="c" />
    </div>
    <p class="intro">
      Color here is red, red, green — two match and one doesn't, which is neither all-same nor
      all-different. That one failing property is enough to disqualify the whole selection.
    </p>

    <h2>Difficulty</h2>
    <p class="intro">
      The SET rule itself never changes — difficulty changes how many cards are on the board and
      how much help you get. <strong>Easy</strong> deals a smaller 9-card board, explains exactly
      which property failed on a wrong guess, and starts every board with one card of a real SET
      already highlighted for free. <strong>Medium</strong> is the standard 12-card board and just
      tells you "Not a SET." <strong>Hard</strong> drops the explanation and visual assistance
      entirely. <strong>Extreme</strong> is the same as Hard but with a larger 15-card board — more
      cards to scan, not a different rule.
    </p>

    <h2>Hints</h2>
    <p class="intro">
      Hints are progressive: the first press highlights one card from a real SET on the board, the
      second press highlights a second card from that same set, and the third reveals all three.
      Hints are unlimited but a game that used any hints can't set a new <strong>Clean Best</strong>
      time — except on Easy, the one free card every board starts with doesn't count as a hint, so
      a Clean Best is still reachable there even if you never press the Hint button yourself.
    </p>

    <h2>Try it yourself</h2>
    <p class="intro">Untimed, unscored — just get a feel for spotting a SET before playing for real.</p>

    <div class="demo">
      <p class="demo-feedback" :class="feedback">
        <template v-if="feedback === 'valid'">SET! Nice find.</template>
        <template v-else-if="feedback === 'invalid'">Not a SET — try again.</template>
        <template v-else>Tap three cards.</template>
      </p>
      <div class="practice-board">
        <SetCard
          v-for="card in practiceBoard"
          :key="card.id"
          :number="card.number"
          :shape="card.shape"
          :color="card.color"
          :shading="card.shading"
          :selected="practiceSelected.includes(card.id)"
          :wrong="feedback === 'invalid' && practiceSelected.includes(card.id)"
          :valid="feedback === 'valid' && practiceSelected.includes(card.id)"
          @click="practiceSelect(card.id)"
        />
      </div>
      <button class="next-btn" @click="newPracticeBoard">New Board</button>
    </div>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SetCard from './SetCard.vue'
import { createDeck, shuffleDeck } from '../../composables/set/deck.js'
import { isSet } from '../../composables/set/setValidator.js'
import { findAllSets } from '../../composables/set/setFinder.js'

defineEmits(['menu'])

const validExample = [
  { number: 0, shape: 0, color: 0, shading: 0 },
  { number: 1, shape: 1, color: 1, shading: 0 },
  { number: 2, shape: 2, color: 2, shading: 0 },
]

const invalidExample = [
  { number: 0, shape: 0, color: 0, shading: 0 },
  { number: 1, shape: 1, color: 0, shading: 0 },
  { number: 2, shape: 2, color: 1, shading: 0 },
]

const PRACTICE_SIZE = 12

function buildPracticeBoard() {
  let deck = shuffleDeck(createDeck())
  let board = deck.slice(0, PRACTICE_SIZE)
  deck = deck.slice(PRACTICE_SIZE)
  // Make sure a real SET actually exists so practice never dead-ends.
  while (findAllSets(board).length === 0 && deck.length > 0) {
    board = board.concat(deck.slice(0, 3))
    deck = deck.slice(3)
  }
  return board
}

const practiceBoard = ref(buildPracticeBoard())
const practiceSelected = ref([])
const feedback = ref(null)
let feedbackTimeoutId = null

function practiceSelect(id) {
  if (feedback.value) return
  const idx = practiceSelected.value.indexOf(id)
  if (idx !== -1) {
    practiceSelected.value.splice(idx, 1)
    return
  }
  if (practiceSelected.value.length >= 3) return
  practiceSelected.value.push(id)
  if (practiceSelected.value.length === 3) {
    const cards = practiceSelected.value.map((cid) => practiceBoard.value.find((c) => c.id === cid))
    feedback.value = isSet(...cards) ? 'valid' : 'invalid'
    feedbackTimeoutId = setTimeout(() => {
      feedback.value = null
      practiceSelected.value = []
    }, 1000)
  }
}

function newPracticeBoard() {
  clearTimeout(feedbackTimeoutId)
  practiceBoard.value = buildPracticeBoard()
  practiceSelected.value = []
  feedback.value = null
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
  max-width: 360px;
  margin: 0 auto 1rem;
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

.demo-feedback.valid {
  color: var(--correct);
}

.demo-feedback.invalid {
  color: var(--wrong);
}

.practice-board {
  width: 100%;
  max-width: 420px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
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
