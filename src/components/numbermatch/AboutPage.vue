<template>
  <div class="about">
    <h1>How to Play</h1>

    <p class="intro">
      Tap any two numbers, anywhere on the board, that are <strong>identical</strong> or
      <strong>add up to 10</strong>. That's it — position never matters. It doesn't matter if
      they're right next to each other or on opposite corners of the board, or what's in between.
    </p>

    <div class="rule-example">
      <span>6 · · 4</span>
      <span class="ok">✓ 6 + 4 = 10</span>
    </div>
    <div class="rule-example">
      <span>5 · · · 5</span>
      <span class="ok">✓ identical</span>
    </div>

    <h2>Difficulty</h2>
    <p class="intro">
      Difficulty comes from board size and how few <strong>Add Numbers</strong> uses you get, never
      tiny cells or timers. Easy is a small 6×3 board with 4 Add Numbers uses; Extreme is a 9×10
      board with only 1.
    </p>

    <h2>Add Numbers</h2>
    <p class="intro">
      Stuck with no legal pair left? <strong>Add Numbers</strong> copies every remaining number, in
      reading order, onto new cells at the end of the board — creating fresh matching
      opportunities. Removed cells never refill or shift; positions stay exactly where they are for
      planning.
    </p>

    <h2>Try it yourself</h2>
    <p class="intro">Untimed, unscored — tap any two matching numbers, wherever they are.</p>

    <div class="demo">
      <p class="demo-feedback" :class="{ wrong: demoMistake }">
        <template v-if="demoMistake">Not a valid pair</template>
        <template v-else>
          {{ demoRemaining }} number{{ demoRemaining === 1 ? '' : 's' }} left
          <template v-if="demoCleared"> — cleared!</template>
        </template>
      </p>
      <NumberBoard
        class="practice-board"
        :cols="demoState.cols"
        :cells="demoState.cells"
        :selected="demoSelected"
        :invalid-pair="demoInvalid"
        @tap="practiceTap"
      />
      <button class="next-btn" @click="resetPracticeBoard">Reset Board</button>
    </div>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import NumberBoard from './NumberBoard.vue'
import { isLegalPair, removePair, remainingCount, isBoardCleared } from '../../composables/numbermatch/board.js'

defineEmits(['menu'])

// A tiny fixed teaching board — never persisted, never scored. Deliberately
// spreads matching numbers apart (6&4, 5&5) with unrelated numbers between
// them, to demonstrate that position never affects whether a pair is legal.
const PRACTICE_BOARD = { cols: 4, cells: [6, 9, 9, 4, 5, 2, 8, 5] }

const demoState = ref({ ...PRACTICE_BOARD, cells: PRACTICE_BOARD.cells.slice() })
const demoSelected = ref(null)
const demoInvalid = ref(null)
const demoMistake = ref(false)
let demoFlashTimeout = null

const demoRemaining = computed(() => remainingCount(demoState.value))
const demoCleared = computed(() => isBoardCleared(demoState.value))

function practiceTap(i) {
  if (demoCleared.value) return
  if (demoState.value.cells[i] === null) return
  demoInvalid.value = null
  demoMistake.value = false

  if (demoSelected.value === i) {
    demoSelected.value = null
    return
  }

  if (demoSelected.value === null) {
    demoSelected.value = i
    return
  }

  const a = demoSelected.value
  const b = i
  if (isLegalPair(demoState.value, a, b)) {
    demoState.value = removePair(demoState.value, a, b)
  } else {
    demoMistake.value = true
    demoInvalid.value = [a, b]
    clearTimeout(demoFlashTimeout)
    demoFlashTimeout = setTimeout(() => {
      demoInvalid.value = null
      demoMistake.value = false
    }, 400)
  }
  demoSelected.value = null
}

function resetPracticeBoard() {
  demoState.value = { ...PRACTICE_BOARD, cells: PRACTICE_BOARD.cells.slice() }
  demoSelected.value = null
  demoInvalid.value = null
  demoMistake.value = false
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

.rule-example {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-size: 1.1rem;
  font-variant-numeric: tabular-nums;
  margin: 0 auto 0.5rem;
  color: var(--text);
}

.rule-example .ok {
  color: var(--correct);
  font-size: 0.85rem;
  font-weight: 700;
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

.practice-board {
  max-width: 280px;
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
