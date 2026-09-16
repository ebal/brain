<template>
  <div class="about">
    <h1>How to Play</h1>

    <p class="intro">
      Move the entire tower of disks from peg A to peg C, one disk at a time. You may never place
      a larger disk on top of a smaller one. Only the top disk of a peg can ever move.
    </p>

    <p class="intro">
      Tap a peg to pick up its top disk, then tap another peg to move it there. Tap the same peg
      again to put it back down without moving. An illegal move (a larger disk onto a smaller one)
      leaves the board unchanged and counts as a mistake — it's never lost progress, just points.
    </p>

    <p class="intro">
      Every level has a mathematically exact optimal move count (2ⁿ - 1 for n disks) — the fewer
      moves beyond that optimum, the more stars you earn. <strong>Undo</strong> reverses your last
      move, <strong>Restart</strong> resets the level, and <strong>Hint</strong> highlights the
      next recommended move from the true optimal strategy (using it caps your result below a
      clean 3-star finish).
    </p>

    <p class="intro">
      Tower of Hanoi is a classic planning and sequential problem-solving puzzle used in cognitive
      research, but it's a game, not a clinical or diagnostic test.
    </p>

    <h2>Try it yourself</h2>
    <p class="intro">Unscored — move all 3 disks from A to C to see how it works.</p>

    <div class="demo">
      <p class="demo-caption">
        <template v-if="practiceDone">Solved it! That's the whole idea, just bigger.</template>
        <template v-else>Move every disk to peg C.</template>
      </p>

      <div class="demo-pegs">
        <button
          v-for="(peg, i) in practicePegs"
          :key="i"
          class="demo-peg"
          :class="{ selected: practiceSelected === i }"
          @click="practiceTap(i)"
        >
          <div class="demo-stack">
            <div class="demo-rod"></div>
            <div
              v-for="disk in [...peg].reverse()"
              :key="disk"
              class="demo-disk"
              :style="{ width: (30 + (disk - 1) * 22) + 'px' }"
            ></div>
          </div>
          <div class="demo-base"></div>
        </button>
      </div>

      <button class="next-btn" @click="resetPractice">Start Over</button>
    </div>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { createHanoiState, isLegalMove, applyMove, isSolved } from '../../composables/hanoi/state.js'

defineEmits(['menu'])

const PRACTICE_DISKS = 3

const practicePegs = ref([[], [], []])
const practiceSelected = ref(null)
const practiceDone = ref(false)

function resetPractice() {
  practicePegs.value = createHanoiState(PRACTICE_DISKS).pegs
  practiceSelected.value = null
  practiceDone.value = false
}

function practiceTap(peg) {
  if (practiceDone.value) return

  if (practiceSelected.value === peg) {
    practiceSelected.value = null
    return
  }

  if (practiceSelected.value === null) {
    if (practicePegs.value[peg].length > 0) practiceSelected.value = peg
    return
  }

  const state = { pegs: practicePegs.value }
  if (isLegalMove(state, practiceSelected.value, peg)) {
    practicePegs.value = applyMove(state, practiceSelected.value, peg).pegs
    practiceSelected.value = null
    if (isSolved({ pegs: practicePegs.value }, PRACTICE_DISKS)) practiceDone.value = true
  }
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

.demo-pegs {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.demo-peg {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
}

.demo-peg.selected .demo-stack {
  outline: 2px solid var(--accent);
  border-radius: 8px;
}

.demo-stack {
  position: relative;
  width: 100%;
  height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
}

.demo-rod {
  position: absolute;
  top: 0;
  bottom: 0.4rem;
  width: 5px;
  background: var(--surface-2);
  border-radius: 3px;
}

.demo-disk {
  position: relative;
  height: 1.1rem;
  margin-bottom: 2px;
  border-radius: 5px;
  background: var(--accent);
}

.demo-base {
  width: 85%;
  height: 5px;
  background: var(--surface-2);
  border-radius: 3px;
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
