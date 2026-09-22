<template>
  <div class="game">
    <template v-if="status === 'paused'">
      <div class="paused-overlay">
        <p class="paused-title">Paused</p>
        <button class="resume-btn" @click="handleResume">Resume</button>
        <button class="quit-btn" @click="handleExit">Quit</button>
      </div>
    </template>

    <template v-else>
      <div class="hud">
        <button class="exit-icon-btn" aria-label="Exit to menu" @click="handleExit">✕</button>
        <span class="level-label">Level {{ level }}</span>
        <span class="progress">{{ Math.max(stimulusIndex, 0) }} / {{ totalStimuli }}</span>
      </div>
      <div class="hud hud-secondary">
        <span class="stat">Hits {{ hits }}</span>
        <span class="stat">Misses {{ misses }}</span>
        <span class="stat">Empty Taps {{ emptyTaps }}</span>
      </div>

      <div class="grid-wrap">
        <div v-if="status === 'countdown'" class="countdown-overlay">
          <span>{{ countdownValue > 0 ? countdownValue : 'Go!' }}</span>
        </div>
        <div class="mole-grid" :style="{ '--grid-size': gridSize }">
          <WhackCell
            v-for="i in gridSize * gridSize"
            :key="i - 1"
            :state="cellState(i - 1)"
            :interactive="status === 'playing'"
            @click="handleTap(i - 1)"
          />
        </div>
        <div v-if="feedback" class="feedback-icon" :class="feedback" aria-live="polite">
          {{ feedback === 'hit' ? '✓' : feedback === 'falseAlarm' ? '✕' : '·' }}
        </div>
      </div>
    </template>

    <ConfirmDialog
      v-if="showExitConfirm"
      message="Exit this level? Your progress on it will be lost."
      @confirm="confirmExit"
      @cancel="showExitConfirm = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import WhackCell from './WhackCell.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { useWhackAMoleGame } from '../../composables/whackamole/useWhackAMoleGame.js'
import { useWhackAMoleStats } from '../../composables/whackamole/useWhackAMoleStats.js'

const props = defineProps({
  level: { type: Number, required: true },
})
const emit = defineEmits(['finished', 'exit'])

const { recordStart } = useWhackAMoleStats()

const game = useWhackAMoleGame()
const {
  status, countdownValue, gridSize, activeCell, activeIsDistractor,
  stimulusIndex, totalStimuli, hits, misses, emptyTaps, feedback, results,
} = game

const showExitConfirm = ref(false)

function cellState(index) {
  if (status.value !== 'playing' && status.value !== 'countdown') return 'empty'
  if (activeCell.value !== index) return 'empty'
  return activeIsDistractor.value ? 'distractor' : 'mole'
}

function handleTap(index) {
  game.tapCell(index)
}

function handleExit() {
  showExitConfirm.value = true
}

function confirmExit() {
  showExitConfirm.value = false
  game.reset()
  emit('exit')
}

function handleResume() {
  game.resumeFromPause()
}

function handleVisibilityChange() {
  if (document.hidden && (status.value === 'playing' || status.value === 'countdown')) {
    game.pause()
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  game.begin(props.level)
  recordStart(props.level)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  game.reset()
})

watch(status, (val) => {
  if (val === 'finished') emit('finished', results.value)
})
</script>

<style scoped>
.game {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.hud {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.5rem;
}

.hud-secondary {
  grid-template-columns: repeat(3, 1fr);
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

.level-label {
  text-align: center;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--accent);
}

.progress {
  font-variant-numeric: tabular-nums;
  color: var(--text-dim);
  font-size: 0.95rem;
  justify-self: end;
}

.stat {
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-dim);
}

.grid-wrap {
  position: relative;
  width: min(95vw, 420px);
  aspect-ratio: 1;
}

.mole-grid {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(var(--grid-size), 1fr);
  grid-template-rows: repeat(var(--grid-size), 1fr);
  gap: clamp(4px, 2vw, 12px);
  user-select: none;
}

.countdown-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  font-weight: 800;
  color: var(--accent);
  background: var(--bg);
}

.feedback-icon {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  font-size: 1.75rem;
  font-weight: 800;
  pointer-events: none;
}

.feedback-icon.hit {
  color: var(--correct);
}

.feedback-icon.falseAlarm {
  color: var(--wrong);
}

.feedback-icon.empty {
  color: var(--text-dim);
}

.paused-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 1rem;
  color: var(--text-dim);
}

.paused-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: 0.06em;
  margin: 0;
}

.resume-btn {
  background: var(--accent);
  color: #10121a;
  border: none;
  border-radius: 10px;
  padding: 0.85rem 1.75rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  min-width: 200px;
}

.quit-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  padding: 0.5rem;
}
</style>
