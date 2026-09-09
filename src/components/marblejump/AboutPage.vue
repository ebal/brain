<template>
  <div class="about">
    <h1>How to Play</h1>

    <p class="intro">
      A move uses three positions in a row: <strong>START → JUMPED → LANDING</strong>. Jump one
      marble over an adjacent marble into the empty hole directly beyond it. The marble you jumped
      over is removed. Keep going until no legal jumps remain. Try to leave as few marbles as
      possible.
    </p>

    <div class="rule-example">
      <span>● ● ○</span>
      <span class="arrow">→</span>
      <span>○ ○ ●</span>
    </div>

    <h2>Selecting a move</h2>
    <p class="intro">
      Tap a marble to select it — its legal landing holes light up. Tap a highlighted hole to jump.
      Tap the selected marble again to deselect it, or tap a different movable marble to change your
      selection; that's harmless, not a mistake.
    </p>

    <h2>Difficulty</h2>
    <p class="intro">
      Every level uses the same rule on a bigger triangular board, which means a deeper, more
      branching puzzle to plan through. <strong>Easy</strong> is a small 10-hole board.
      <strong>Medium</strong> is the classic 15-hole board. <strong>Hard</strong> is 21 holes, and
      <strong>Extreme</strong> is 28 holes — the biggest jump in size and planning depth.
    </p>

    <h2>Undo and Restart</h2>
    <p class="intro">
      Undo exactly reverses your last jump — use it as many times as you like. Restart reloads the
      original puzzle from scratch.
    </p>

    <h2>Try it yourself</h2>
    <p class="intro">Untimed, unscored — just get a feel for the jump before playing for real.</p>

    <div class="demo">
      <p class="demo-feedback">
        {{ demoRemaining }} marble{{ demoRemaining === 1 ? '' : 's' }} left
        <template v-if="demoFinished"> — no more moves</template>
      </p>
      <MarbleBoard
        class="practice-board"
        :n="demoState.n"
        :occupied="demoState.occupied"
        :selected="demoSelected"
        :legal-destinations="demoLegalDestinations"
        :last-move-cells="[]"
        @tap="practiceTap"
      />
      <button class="next-btn" @click="newPracticeBoard">Reset Board</button>
    </div>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import MarbleBoard from './MarbleBoard.vue'
import { createBoard, getLegalMoves, applyMove, hasLegalMoves } from '../../composables/marblejump/board.js'

defineEmits(['menu'])

// A tiny fixed practice puzzle — never persisted, never scored (SPEC §24).
const PRACTICE_PUZZLE = { n: 4, emptyHoles: [[1, 0]] }

const demoState = ref(createBoard(PRACTICE_PUZZLE))
const demoSelected = ref(null)

const demoRemaining = computed(() => demoState.value.occupied.reduce((sum, v) => sum + v, 0))
const demoFinished = computed(() => !hasLegalMoves(demoState.value))
const demoLegalMoves = computed(() =>
  demoSelected.value === null
    ? []
    : getLegalMoves(demoState.value).filter((m) => m.start === demoSelected.value)
)
const demoLegalDestinations = computed(() => demoLegalMoves.value.map((m) => m.landing))

function practiceTap(idx) {
  if (demoFinished.value) return

  if (demoSelected.value === idx) {
    demoSelected.value = null
    return
  }

  if (demoSelected.value !== null && demoLegalDestinations.value.includes(idx)) {
    const move = demoLegalMoves.value.find((m) => m.landing === idx)
    demoState.value = applyMove(demoState.value, move)
    demoSelected.value = null
    return
  }

  if (demoState.value.occupied[idx] === 1) {
    const hasMove = getLegalMoves(demoState.value).some((m) => m.start === idx)
    if (hasMove) demoSelected.value = idx
  }
}

function newPracticeBoard() {
  demoState.value = createBoard(PRACTICE_PUZZLE)
  demoSelected.value = null
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
  font-size: 1.5rem;
  letter-spacing: 0.15em;
  margin: 0 auto 1rem;
  color: var(--text);
}

.arrow {
  color: var(--accent);
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
