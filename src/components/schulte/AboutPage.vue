<template>
  <div class="about">
    <h1>How to Play</h1>

    <p class="intro">
      Find the numbers in order, starting at 1. Tap 1, then 2, then 3, and continue until the
      final number. Try to finish as quickly as possible without mistakes.
    </p>

    <div class="rule-box">
      The grid never moves — only your eyes and your target number do. A tap on the wrong cell
      counts as an error but doesn't cost you your place; keep looking for the number you're on.
    </div>

    <h2>A 3×3 example</h2>
    <p class="intro">
      Two numbers have already been found here (they're dimmed but still visible) — the next
      target is 3.
    </p>
    <div class="static-example">
      <div class="schulte-grid" style="--grid-size: 3">
        <SchulteCell
          v-for="(cell, i) in STATIC_EXAMPLE"
          :key="i"
          :number="cell.number"
          :state="cell.state"
          :interactive="false"
        />
      </div>
    </div>

    <h2>What gets measured</h2>
    <ul class="metrics-list">
      <li><strong>Completion time</strong> — total time from "Go!" to the final correct tap. This is the headline number.</li>
      <li><strong>Errors &amp; accuracy</strong> — wrong taps count against you even though they don't slow your progress through the numbers; a fast round full of mistakes isn't treated the same as a clean one.</li>
      <li><strong>Average vs. median search time</strong> — both measure how long it takes to find each next number. Median is shown alongside the average because one unusually slow search (eye wandered, lost your place) can drag the average up without reflecting your typical pace.</li>
    </ul>

    <h2>Difficulty levels</h2>
    <p class="intro">
      Classic 5×5 (numbers 1–25) is the traditional Schulte Table and the best one for tracking
      your progress over time, since its layout never changes. Because grid sizes have different
      numbers of targets, times are best compared within the same difficulty, not across them.
    </p>
    <div class="difficulty-table">
      <div class="difficulty-row difficulty-row--head">
        <span>Level</span>
        <span>Grid</span>
        <span>Numbers</span>
      </div>
      <div v-for="d in difficulties" :key="d.key" class="difficulty-row">
        <span>{{ d.label }}<span v-if="d.isClassic" class="classic-tag">Classic</span></span>
        <span>{{ d.gridSize }}×{{ d.gridSize }}</span>
        <span>1–{{ d.gridSize * d.gridSize }}</span>
      </div>
    </div>

    <h2>Random Color &amp; Random Position</h2>
    <p class="intro">
      Two optional variants, toggled with checkboxes before you start — available at every grid
      size, and tracked with their own separate best times/history so they never mix with your
      Classic results.
    </p>
    <ul class="metrics-list">
      <li><strong>Random Color</strong> — every cell gets a random background color when the round starts. Colors stay put for the whole round; only the numbers matter, but the extra visual noise makes scanning harder.</li>
      <li><strong>Random Position</strong> — after every correct tap, every number you haven't found yet jumps to a new random cell. Numbers you've already found stay exactly where they were solved. You can't rely on remembering where anything is.</li>
    </ul>

    <h2>Try it yourself</h2>
    <p class="intro">Untimed, unscored — just get a feel for it. Find: <strong>{{ practiceTarget }}</strong></p>

    <div class="demo">
      <div class="schulte-grid" style="--grid-size: 3">
        <SchulteCell
          v-for="(cell, i) in practiceBoard"
          :key="i"
          :number="cell.number"
          :state="cell.state"
          @click="practiceSelect(i)"
        />
      </div>
      <p v-if="practiceDone" class="done-text">Nice! That's the whole idea.</p>
      <button class="next-btn" @click="newPractice">Try Another Board</button>
    </div>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import SchulteCell from './SchulteCell.vue'
import { SCHULTE_DIFFICULTIES } from '../../constants/schulte/difficulties.js'

defineEmits(['menu'])

const difficulties = Object.values(SCHULTE_DIFFICULTIES)

const STATIC_EXAMPLE = [
  { number: 7, state: 'pending' },
  { number: 1, state: 'correct' },
  { number: 5, state: 'pending' },
  { number: 8, state: 'pending' },
  { number: 2, state: 'correct' },
  { number: 4, state: 'pending' },
  { number: 9, state: 'pending' },
  { number: 6, state: 'pending' },
  { number: 3, state: 'pending' },
]

// Self-contained practice board — deliberately independent of useSchulteGame /
// persistence, since practice must never write to history or best times.
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildPracticeBoard() {
  return shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).map((number) => ({ number, state: 'pending' }))
}

const practiceBoard = ref(buildPracticeBoard())
const practiceTarget = ref(1)
const practiceDone = computed(() => practiceTarget.value > 9)

function practiceSelect(index) {
  const cell = practiceBoard.value[index]
  if (!cell || cell.state === 'correct' || practiceDone.value) return

  if (cell.number === practiceTarget.value) {
    cell.state = 'correct'
    practiceTarget.value += 1
  } else {
    cell.state = 'wrong'
    setTimeout(() => {
      if (cell.state === 'wrong') cell.state = 'pending'
    }, 300)
  }
}

function newPractice() {
  practiceBoard.value = buildPracticeBoard()
  practiceTarget.value = 1
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

.static-example {
  width: min(60vw, 260px);
  aspect-ratio: 1;
  margin: 0 auto 1rem;
}

.schulte-grid {
  --board-width: min(60vw, 260px);
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(var(--grid-size), 1fr);
  grid-template-rows: repeat(var(--grid-size), 1fr);
  gap: 6px;
  user-select: none;
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

.demo {
  background: var(--surface);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.demo .schulte-grid {
  --board-width: min(70vw, 320px);
  width: min(70vw, 320px);
  height: auto;
  aspect-ratio: 1;
}

.done-text {
  margin: 0;
  color: var(--correct);
  font-weight: 600;
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
