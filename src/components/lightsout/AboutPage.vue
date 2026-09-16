<template>
  <div class="about">
    <h1>How to Play</h1>

    <p class="intro">
      Every light is either on or off. Tapping a cell toggles itself <strong>and</strong> its
      up/down/left/right neighbours — never its diagonal neighbours. Turn every light off to
      complete the level, using as few taps as possible.
    </p>

    <p class="intro">
      Every level has a solver-verified minimum number of moves. Get exactly that many for
      ★★★, come close for ★★☆, or just finish for ★☆☆. <strong>Undo</strong> reverses your last
      tap, <strong>Restart</strong> resets the level, and <strong>Hint</strong> highlights one
      cell from a true optimal solution for wherever you currently are — using it caps your
      result below a clean 3-star finish.
    </p>

    <p class="intro">
      Lights Out is a classic spatial-planning and cause-and-effect puzzle used in recreational
      mathematics, but it's a game, not a clinical or diagnostic test.
    </p>

    <h2>Try it yourself</h2>
    <p class="intro">Unscored — a tap toggles itself plus up/down/left/right. Turn every light off.</p>

    <div class="demo">
      <p class="demo-caption">
        <template v-if="practiceDone">Solved it! That's the whole idea, just bigger.</template>
        <template v-else>Turn every light off.</template>
      </p>

      <div class="demo-grid">
        <button
          v-for="(cell, i) in practiceCells"
          :key="i"
          class="demo-cell"
          :class="{ on: cell === 1 }"
          @click="practiceTap(i)"
        >
          <span class="demo-bulb" aria-hidden="true"></span>
        </button>
      </div>

      <button class="next-btn" @click="resetPractice">Start Over</button>
    </div>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { createEmptyBoard, applyMove, isSolved } from '../../composables/lightsout/board.js'

defineEmits(['menu'])

const SIZE = 3
const SCRAMBLE_TAPS = 2

const practiceCells = ref([])
const practiceDone = ref(false)

function resetPractice() {
  let cells = createEmptyBoard(SIZE)
  // A couple of random taps — small and always solvable, since every
  // reachable-from-solved board is (SPEC "Practice": "a tiny 3x3
  // demonstration").
  for (let i = 0; i < SCRAMBLE_TAPS; i++) {
    const r = Math.floor(Math.random() * SIZE)
    const c = Math.floor(Math.random() * SIZE)
    cells = applyMove(cells, SIZE, r, c)
  }
  if (isSolved(cells)) cells = applyMove(cells, SIZE, 1, 1) // avoid starting already-solved
  practiceCells.value = cells
  practiceDone.value = false
}

function practiceTap(index) {
  if (practiceDone.value) return
  practiceCells.value = applyMove(practiceCells.value, SIZE, Math.floor(index / SIZE), index % SIZE)
  if (isSolved(practiceCells.value)) practiceDone.value = true
}

resetPractice()
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

.demo-caption {
  margin: 0;
  min-height: 1.4em;
  color: var(--text-dim);
  text-align: center;
  font-weight: 600;
}

.demo-grid {
  width: min(60vw, 220px);
  aspect-ratio: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.demo-cell {
  background: var(--surface-2);
  border: 2px solid var(--surface-2);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.demo-bulb {
  width: 55%;
  height: 55%;
  border-radius: 50%;
  border: 2px solid var(--text-dim);
}

.demo-cell.on .demo-bulb {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 8px var(--accent);
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
