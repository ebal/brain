<template>
  <div class="about">
    <h1>How to Play</h1>

    <p class="intro">
      Every emoji belongs to a matching pair. Tap two identical <strong>free</strong> tiles to
      remove them. A tile is free only when nothing covers it from above <strong>and</strong> at
      least one horizontal side — left or right — is open. Clear every tile to win the board.
    </p>

    <div class="rule-example">
      <span>🐶 + 🐶</span>
      <span class="arrow">→</span>
      <span>removed</span>
    </div>

    <h2>Selecting tiles</h2>
    <p class="intro">
      Tap a free tile to select it, then tap another free tile: matching emoji removes both,
      different emoji gives a brief mismatch flash and removes neither. Tap the selected tile
      again to deselect it. Tapping a blocked tile does nothing but flash.
    </p>

    <h2>Difficulty</h2>
    <p class="intro">
      Difficulty comes from tile count, layering and blocking, never tiny tiles or timers.
      <strong>Easy</strong> is 24 tiles / 12 pairs, mostly flat. <strong>Medium</strong> is 36 / 18
      with shallow layering. <strong>Hard</strong> is 48 / 24 with more blocking. <strong>Very
      Hard</strong> is 64 / 32, the largest layered puzzle.
    </p>

    <h2>Undo, Hint and Restart</h2>
    <p class="intro">
      A solvable board can still be played into a dead end with tiles remaining but no matching
      free pair — Undo, Hint or Restart get you out of it. Hint always highlights a real move
      toward clearing the board, never a guess. Restart reloads the exact original board.
    </p>

    <h2>Try it yourself</h2>
    <p class="intro">Untimed, unscored — see the covering and left/right rules in action.</p>

    <div class="demo">
      <p class="demo-feedback">
        {{ demoRemaining }} tile{{ demoRemaining === 1 ? '' : 's' }} left
        <template v-if="demoCleared"> — cleared!</template>
      </p>
      <MahjongBoard
        class="practice-board"
        layout-id="practice-1"
        :removed="demoState.removed"
        :emoji="demoState.emoji"
        :selected="demoSelected"
        :blocked-flash="demoBlocked"
        @tap="practiceTap"
      />
      <button class="next-btn" @click="newPracticeBoard">Reset Board</button>
    </div>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import MahjongBoard from './MahjongBoard.vue'
import { isTileFree, removePair, isBoardCleared, remainingCount } from '../../composables/emojimahjong/board.js'
import { generateSolvableBoard } from '../../composables/emojimahjong/generator.js'

defineEmits(['menu'])

function freshDemoBoard() {
  return generateSolvableBoard('practice-1', Math.floor(Math.random() * 1e9))
}

// A tiny fixed practice puzzle — never persisted, never scored (SPEC §28).
const demoState = ref(freshDemoBoard())
const demoSelected = ref(null)
const demoBlocked = ref(null)

const demoRemaining = computed(() => remainingCount(demoState.value))
const demoCleared = computed(() => isBoardCleared(demoState.value))

function practiceTap(i) {
  demoBlocked.value = null
  if (demoCleared.value) return

  if (demoSelected.value === i) {
    demoSelected.value = null
    return
  }

  if (!isTileFree(demoState.value, i)) {
    demoBlocked.value = i
    return
  }

  if (demoSelected.value === null) {
    demoSelected.value = i
    return
  }

  const a = demoSelected.value
  const b = i
  if (demoState.value.emoji[a] === demoState.value.emoji[b]) {
    demoState.value = removePair(demoState.value, a, b)
  }
  demoSelected.value = null
}

function newPracticeBoard() {
  demoState.value = freshDemoBoard()
  demoSelected.value = null
  demoBlocked.value = null
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
  font-size: 1.3rem;
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
