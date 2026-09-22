<template>
  <div class="game">
    <template v-if="status === 'paused'">
      <div class="paused-overlay">
        <p class="paused-title">Paused</p>
        <button class="resume-btn" @click="handleResume">Resume</button>
        <button class="restart-btn" @click="handleRestartConfirm">Restart</button>
        <button class="quit-btn" @click="handleExit">Quit</button>
      </div>
    </template>

    <template v-else>
      <div class="hud">
        <button class="exit-icon-btn" aria-label="Exit to menu" @click="handleExit">✕</button>
        <span class="level-label">Level {{ level }} &middot; {{ size }}×{{ size }}</span>
        <span class="timer">{{ formatTime(elapsedTime) }}</span>
      </div>
      <div class="hud hud-secondary">
        <span class="stat">Moves {{ moves }}</span>
        <span class="stat">Optimal {{ optimalMoves }}</span>
        <span class="stat">Efficiency {{ liveEfficiency.toFixed(0) }}%</span>
      </div>

      <div class="grid-wrap">
        <div class="lightsout-grid" :style="{ '--grid-size': size }">
          <LightCell
            v-for="(cell, i) in cells"
            :key="i"
            :is-on="cell === 1"
            :is-hint="hintCell === i"
            :interactive="status === 'playing'"
            @click="handleTap(i)"
          />
        </div>
      </div>

      <div class="actions-row">
        <button class="action-btn" :disabled="moves === 0" @click="handleUndo">Undo</button>
        <button class="action-btn" @click="handleRestartConfirm">Restart</button>
        <button class="action-btn" @click="handleHint">Hint</button>
      </div>
    </template>

    <ConfirmDialog
      v-if="showExitConfirm"
      message="Exit this level? Your progress will be saved."
      @confirm="confirmExit"
      @cancel="showExitConfirm = false"
    />
    <ConfirmDialog
      v-if="showRestartConfirm"
      message="Restart this level? Your current progress will be lost."
      @confirm="confirmRestart"
      @cancel="showRestartConfirm = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import LightCell from './LightCell.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { useLightsOutGame } from '../../composables/lightsout/useLightsOutGame.js'
import { useLightsOutStats } from '../../composables/lightsout/useLightsOutStats.js'
import { useLightsOutStorage } from '../../composables/lightsout/useLightsOutStorage.js'
import { calculateEfficiency } from '../../composables/lightsout/scoring.js'
import { minimumMoves } from '../../composables/lightsout/solver.js'
import { getLevelConfig } from '../../constants/lightsout/levels.js'

const props = defineProps({
  level: { type: Number, required: true },
  continueGame: { type: Boolean, default: false },
})
const emit = defineEmits(['finished', 'exit'])

const { recordStart } = useLightsOutStats()
const { getActive, saveActive, clearActive } = useLightsOutStorage()

const game = useLightsOutGame()
const { status, size, cells, moves, hintCell, elapsedTime, results } = game

let originalCells = []
const optimalMoves = computed(() => (originalCells.length ? minimumMoves(originalCells, size.value) : 0))
const liveEfficiency = computed(() => calculateEfficiency(optimalMoves.value, moves.value))

const showExitConfirm = ref(false)
const showRestartConfirm = ref(false)

function handleTap(index) {
  game.tapCell(Math.floor(index / size.value), index % size.value)
  persist()
}

function handleUndo() {
  game.undo()
  persist()
}

function handleHint() {
  game.hint()
  persist()
}

function handleRestartConfirm() {
  showRestartConfirm.value = true
}

function confirmRestart() {
  showRestartConfirm.value = false
  game.restart()
  recordStart(props.level)
  persist()
}

function handleExit() {
  showExitConfirm.value = true
}

function confirmExit() {
  showExitConfirm.value = false
  game.pause()
  persist()
  emit('exit')
}

function handleResume() {
  game.resumeFromPause()
}

function persist() {
  if (status.value === 'finished' || status.value === 'idle') return
  saveActive(game.snapshot())
}

function handleVisibilityChange() {
  if (document.hidden && status.value === 'playing') {
    game.pause()
    persist()
  }
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  const active = props.continueGame ? getActive() : null
  if (active) {
    game.resumeFromSave(active)
    originalCells = active.initialCells
  } else {
    const config = getLevelConfig(props.level)
    game.begin(props.level, config.size, config.cells)
    originalCells = config.cells
    recordStart(props.level)
    persist()
  }
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  game.reset()
})

watch(status, (val) => {
  if (val === 'finished') {
    clearActive()
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

.level-label {
  text-align: center;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--accent);
}

.timer {
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
  width: min(95vw, 480px);
  aspect-ratio: 1;
}

.lightsout-grid {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(var(--grid-size), 1fr);
  grid-template-rows: repeat(var(--grid-size), 1fr);
  gap: clamp(3px, 1.2vw, 8px);
  user-select: none;
}

.actions-row {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.action-btn {
  background: var(--surface-2);
  color: var(--text);
  border: none;
  border-radius: 10px;
  padding: 0.7rem 0.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.paused-title {
  font-size: 1.6rem;
  letter-spacing: 0.06em;
  margin: 0;
}

.resume-btn {
  min-width: 200px;
}

.restart-btn {
  background: var(--surface-2);
  color: var(--text);
  border: none;
  border-radius: 10px;
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  min-width: 200px;
}
</style>
