<template>
  <div class="game">
    <div v-if="status === 'countdown'" class="countdown">
      {{ countdownValue > 0 ? countdownValue : 'Go!' }}
    </div>

    <template v-else-if="status === 'playing'">
      <div class="hud">
        <div class="hud-top">
          <button class="exit-icon-btn" aria-label="Exit to menu" @click="handleExit">✕</button>
          <span class="mode-label">{{ modeInfo.label }}</span>
          <span class="timer">{{ timeLeft.toFixed(1) }}s</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
      </div>

      <div class="stimulus-area" :class="feedback ? `feedback-${feedback}` : ''">
        <div
          v-if="currentTrial"
          class="word"
          :class="{ underline: currentTrial.underline }"
          :style="{ color: currentTrial.color.hex }"
        >
          {{ currentTrial.word }}
        </div>
      </div>

      <div class="options-grid" :style="{ '--col-count': palette.length }">
        <ColorButton
          v-for="c in palette"
          :key="c.name"
          :color="c"
          @click="game.answer(c.name)"
        />
      </div>
    </template>

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
import ColorButton from './ColorButton.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { useStroopGame } from '../composables/useStroopGame.js'
import { DIFFICULTIES, MODES } from '../constants/colors.js'

const props = defineProps({
  difficultyKey: { type: String, required: true },
  mode: { type: String, default: 'color' },
})
const emit = defineEmits(['finished', 'exit'])

const game = useStroopGame()
const { status, countdownValue, timeLeft, totalDuration, currentTrial, feedback, palette, results } = game

const modeInfo = computed(() => MODES[props.mode])

const progressPct = computed(() =>
  totalDuration.value > 0 ? (timeLeft.value / totalDuration.value) * 100 : 0
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
  game.start(DIFFICULTIES[props.difficultyKey], props.mode)
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
  max-width: 640px;
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
  flex-direction: column;
  gap: 0.5rem;
}

.hud-top {
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

.mode-label {
  text-align: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent);
}

.timer {
  font-variant-numeric: tabular-nums;
  color: var(--text-dim);
  font-size: 0.95rem;
}

.progress-track {
  width: 100%;
  height: 6px;
  background: var(--surface-2);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.1s linear;
}

.stimulus-area {
  width: 100%;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--stimulus-bg);
  border-radius: 16px;
  border: 3px solid transparent;
  transition: border-color 0.15s ease;
}

.stimulus-area.feedback-correct {
  border-color: var(--correct);
}

.stimulus-area.feedback-wrong {
  border-color: var(--wrong);
}

.word {
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

/* Underline Word mode's per-trial cue — offset/thickness tuned so it stays
   clearly separate from the letters themselves at this font size. */
.word.underline {
  text-decoration: underline;
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.18em;
}

.options-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(min(var(--col-count), 5), 1fr);
  gap: 0.75rem;
}

@media (max-width: 560px) {
  .options-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .word {
    font-size: 2.25rem;
  }
}
</style>
