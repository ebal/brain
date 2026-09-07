<template>
  <div class="game">
    <div class="hud">
      <button v-if="status !== 'finished'" class="exit-icon-btn" aria-label="Exit to menu" @click="handleExit">✕</button>
      <span class="find-label">
        <template v-if="status === 'finished'">Done!</template>
        <template v-else>Find: <strong>{{ target }}</strong></template>
      </span>
      <span class="timer">{{ (elapsedMs / 1000).toFixed(1) }}s</span>
    </div>

    <p v-if="colorMode || dynamicMode" class="variant-tag">
      {{ colorMode && dynamicMode ? 'Random Color + Position' : colorMode ? 'Random Color' : 'Random Position' }}
    </p>

    <div class="grid-wrap">
      <div class="schulte-grid" :style="{ '--grid-size': difficulty.gridSize }">
        <SchulteCell
          v-for="(cell, i) in board"
          :key="i"
          :number="cell.number"
          :state="cell.state"
          :interactive="status === 'playing'"
          :color="cellColors[i]"
          @click="game.select(i)"
        />
      </div>

      <div v-if="status === 'countdown'" class="countdown-overlay">
        {{ countdownValue > 0 ? countdownValue : 'Go!' }}
      </div>
    </div>

    <ConfirmDialog
      v-if="showExitConfirm"
      message="Exit this round? Your progress on it will be lost."
      @confirm="confirmExit"
      @cancel="showExitConfirm = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import SchulteCell from './SchulteCell.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { useSchulteGame } from '../../composables/schulte/useSchulteGame.js'
import { SCHULTE_DIFFICULTIES } from '../../constants/schulte/difficulties.js'

const props = defineProps({
  difficultyKey: { type: String, required: true },
  colorMode: { type: Boolean, default: false },
  dynamicMode: { type: Boolean, default: false },
})
const emit = defineEmits(['finished', 'exit'])

const game = useSchulteGame()
const { status, countdownValue, board, cellColors, target, elapsedMs, results } = game

const difficulty = computed(() =>
  Object.values(SCHULTE_DIFFICULTIES).find((d) => d.key === props.difficultyKey)
)

const showExitConfirm = ref(false)

function handleExit() {
  showExitConfirm.value = true
}

function confirmExit() {
  showExitConfirm.value = false
  game.reset()
  emit('exit')
}

onMounted(() => {
  game.start(difficulty.value, { colorMode: props.colorMode, dynamicMode: props.dynamicMode })
  document.addEventListener('visibilitychange', game.handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', game.handleVisibilityChange)
  game.reset()
})

watch(status, (val) => {
  if (val === 'finished') {
    emit('finished', results.value)
  }
})
</script>

<style scoped>
.game {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.hud {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.5rem;
}

.exit-icon-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.35rem;
  justify-self: start;
}

.find-label {
  text-align: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}

.find-label strong {
  color: var(--accent);
  font-size: 1.3rem;
}

.timer {
  font-variant-numeric: tabular-nums;
  color: var(--text-dim);
  font-size: 0.95rem;
}

.variant-tag {
  margin: -0.4rem 0 0.6rem;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent);
}

.grid-wrap {
  position: relative;
  /* 8x8 (Extreme) across a ~350px phone screen means every pixel matters
     for touch-target size — this deliberately extends slightly past the
     shell's normal content width (see .app-shell padding) rather than the
     stricter 100%, which measured smaller cells on the narrowest phones. */
  width: min(95vw, 480px);
  aspect-ratio: 1;
}

.schulte-grid {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(var(--grid-size), 1fr);
  grid-template-rows: repeat(var(--grid-size), 1fr);
  gap: clamp(2px, 0.8vw, 6px);
  user-select: none;
}

.countdown-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  font-weight: 800;
  color: var(--accent);
  background: rgba(20, 21, 26, 0.72);
  border-radius: 12px;
}
</style>
