<template>
  <div class="game">
    <div v-if="status === 'countdown'" class="countdown">
      {{ countdownValue > 0 ? countdownValue : 'Go!' }}
    </div>

    <template v-else-if="status === 'playing'">
      <div class="hud">
        <span class="n-label">{{ difficulty.n }}-BACK</span>
        <span class="progress">
          <template v-if="isSetupPhase">Get ready…</template>
          <template v-else>{{ scoredAnswered }} / {{ totalScored }}</template>
        </span>
      </div>

      <div class="stimulus-area">
        <div class="number" :style="{ color: currentColor }">{{ currentNumber }}</div>
        <div v-if="feedback" class="feedback-icon" :class="feedback">
          {{ feedback === 'correct' ? '✓' : '✕' }}
        </div>
      </div>

      <ResponseButtons :disabled="!awaitingResponse" @answer="game.answer" />
    </template>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed, watch } from 'vue'
import ResponseButtons from './ResponseButtons.vue'
import { useNBackGame } from '../../composables/nback/useNBackGame.js'
import { NBACK_DIFFICULTIES } from '../../constants/nback/difficulties.js'

const props = defineProps({
  difficultyKey: { type: String, required: true },
})
const emit = defineEmits(['finished'])

const game = useNBackGame()
const { status, countdownValue, currentNumber, currentColor, isSetupPhase, scoredAnswered, totalScored, feedback, awaitingResponse, results } = game

const difficulty = computed(() =>
  Object.values(NBACK_DIFFICULTIES).find((d) => d.key === props.difficultyKey)
)

function handleKeydown(e) {
  if (!awaitingResponse.value) return
  const key = e.key.toLowerCase()
  if (['arrowleft', 'n', '1'].includes(key)) game.answer('noMatch')
  else if (['arrowright', 'm', '2'].includes(key)) game.answer('match')
}

onMounted(() => {
  game.start(difficulty.value)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  game.reset()
  window.removeEventListener('keydown', handleKeydown)
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
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.countdown {
  font-size: 5rem;
  font-weight: 800;
  color: var(--accent);
}

.hud {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.n-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.03em;
}

.progress {
  font-variant-numeric: tabular-nums;
  color: var(--text-dim);
  font-size: 0.9rem;
}

.stimulus-area {
  position: relative;
  width: 100%;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border-radius: 16px;
  user-select: none;
}

.number {
  font-size: clamp(4rem, 22vw, 6.5rem);
  font-weight: 800;
  color: var(--text);
  line-height: 1;
}

.feedback-icon {
  position: absolute;
  top: 0.75rem;
  right: 1rem;
  font-size: 1.75rem;
  font-weight: 800;
}

.feedback-icon.correct {
  color: var(--correct);
}

.feedback-icon.incorrect {
  color: var(--wrong);
}
</style>
