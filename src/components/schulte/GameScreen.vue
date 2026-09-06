<template>
  <div class="game">
    <div class="hud">
      <span class="find-label">
        <template v-if="status === 'finished'">Done!</template>
        <template v-else>Find: <strong>{{ target }}</strong></template>
      </span>
      <span class="timer">{{ (elapsedMs / 1000).toFixed(1) }}s</span>
    </div>

    <div class="grid-wrap">
      <div class="schulte-grid" :style="{ '--grid-size': difficulty.gridSize }">
        <SchulteCell
          v-for="(cell, i) in board"
          :key="i"
          :number="cell.number"
          :state="cell.state"
          :interactive="status === 'playing'"
          @click="game.select(i)"
        />
      </div>

      <div v-if="status === 'countdown'" class="countdown-overlay">
        {{ countdownValue > 0 ? countdownValue : 'Go!' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed, watch } from 'vue'
import SchulteCell from './SchulteCell.vue'
import { useSchulteGame } from '../../composables/schulte/useSchulteGame.js'
import { SCHULTE_DIFFICULTIES } from '../../constants/schulte/difficulties.js'

const props = defineProps({
  difficultyKey: { type: String, required: true },
})
const emit = defineEmits(['finished'])

const game = useSchulteGame()
const { status, countdownValue, board, target, elapsedMs, results } = game

const difficulty = computed(() =>
  Object.values(SCHULTE_DIFFICULTIES).find((d) => d.key === props.difficultyKey)
)

onMounted(() => {
  game.start(difficulty.value)
})

onUnmounted(() => {
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
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.find-label {
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

.grid-wrap {
  position: relative;
  width: min(92vw, 480px);
  aspect-ratio: 1;
}

.schulte-grid {
  --board-width: min(92vw, 480px);
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(var(--grid-size), 1fr);
  grid-template-rows: repeat(var(--grid-size), 1fr);
  gap: clamp(3px, 1vw, 8px);
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
