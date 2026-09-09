<template>
  <div class="game">
    <template v-if="status === 'paused'">
      <div class="paused-overlay">
        <p class="paused-title">PAUSED</p>
        <button class="resume-btn" @click="handleResume">Resume</button>
        <button class="exit-btn" @click="handleExit">Exit to Menu</button>
      </div>
    </template>

    <template v-else-if="boardState">
      <div class="hud hud-top">
        <button class="exit-icon-btn" aria-label="Exit to menu" @click="requestExit">✕</button>
        <span class="difficulty-label">{{ difficultyLabel }}</span>
        <span class="timer">{{ formattedTime }}</span>
      </div>
      <div class="hud">
        <span class="stat stat-primary">{{ remaining }} left</span>
        <span class="stat">Moves {{ moves }}</span>
        <span class="stat">Mistakes {{ mistakes }}</span>
      </div>

      <p v-if="stalled" class="stalled-banner">No matches available — try Add Numbers, Hint or Undo.</p>

      <NumberBoard
        :cols="boardState.cols"
        :cells="boardState.cells"
        :selected="selected"
        :hint-pair="hintPair || []"
        :invalid-pair="invalidFlash || []"
        @tap="handleTap"
      />

      <div class="controls">
        <button class="ctrl-btn" @click="handleUndo" :disabled="moveHistory.length === 0">
          <span class="icon">↶</span>
          <span class="label">Undo</span>
        </button>
        <button class="ctrl-btn" @click="handleHint" :disabled="remaining === 0">
          <span class="icon">💡</span>
          <span class="label">Hint</span>
        </button>
        <button class="ctrl-btn" @click="handleAddNumbers" :disabled="addNumbersRemaining === 0">
          <span class="icon">➕</span>
          <span class="label">Add ({{ addNumbersRemaining }})</span>
        </button>
        <button class="ctrl-btn" @click="requestRestart">
          <span class="icon">↻</span>
          <span class="label">Restart</span>
        </button>
        <button class="ctrl-btn" @click="handlePause">
          <span class="icon">⏸</span>
          <span class="label">Pause</span>
        </button>
      </div>
    </template>

    <ConfirmDialog
      v-if="showExitConfirm"
      message="Exit this game? Your progress will be lost."
      @confirm="confirmExit"
      @cancel="showExitConfirm = false"
    />
    <ConfirmDialog
      v-if="showRestartConfirm"
      message="Restart this board? Your current progress will be lost."
      confirm-label="Restart"
      @confirm="confirmRestart"
      @cancel="showRestartConfirm = false"
    />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed, watch, ref } from 'vue'
import NumberBoard from './NumberBoard.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { useNumberMatchGame } from '../../composables/numbermatch/useNumberMatchGame.js'
import { useNumberMatchStorage } from '../../composables/numbermatch/useNumberMatchStorage.js'
import { useNumberMatchStats } from '../../composables/numbermatch/useNumberMatchStats.js'
import { NUMBERMATCH_DIFFICULTIES } from '../../constants/numbermatch/difficulties.js'

const props = defineProps({
  difficultyKey: { type: String, default: null },
  continueGame: { type: Boolean, default: false },
})
const emit = defineEmits(['finished', 'exit'])

const showExitConfirm = ref(false)
const showRestartConfirm = ref(false)

function requestExit() {
  showExitConfirm.value = true
}

function confirmExit() {
  showExitConfirm.value = false
  handleExit()
}

function requestRestart() {
  // A restart before any move has been made can't meaningfully destroy
  // progress — skip the confirmation dialog in that case.
  if (moves.value === 0) {
    game.restart()
    autosave()
    return
  }
  showRestartConfirm.value = true
}

function confirmRestart() {
  showRestartConfirm.value = false
  game.restart()
  autosave()
}

const { getActive, saveActive, clearActive } = useNumberMatchStorage()
const { recordStart, recordCompletion, recordAbandon } = useNumberMatchStats()

const game = useNumberMatchGame()
const {
  status, difficulty, boardState, selected, moveHistory, moves, mistakes,
  hintPair, invalidFlash, stalled, remaining, addNumbersRemaining, elapsedTime, results,
} = game

const difficultyLabel = computed(() => {
  const key = difficulty.value || props.difficultyKey
  return Object.values(NUMBERMATCH_DIFFICULTIES).find((d) => d.key === key)?.label || ''
})

const formattedTime = computed(() => {
  const totalSeconds = Math.floor(elapsedTime.value / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

// SPEC §23: autosave after removal, invalid completed Move, Add Numbers,
// Hint, Undo, Pause/visibility change.
function autosave() {
  if (status.value === 'playing' || status.value === 'paused') {
    saveActive(game.snapshot())
  }
}

function handleTap(i) {
  game.tapCell(i)
  autosave()
}

function handleUndo() {
  game.undo()
  autosave()
}

function handleHint() {
  game.hint()
  autosave()
}

function handleAddNumbers() {
  game.addNumbers()
  autosave()
}

function handlePause() {
  game.pause()
  autosave()
}

function handleResume() {
  game.resumeTimer()
}

function handleExit() {
  recordAbandon(difficulty.value)
  clearActive()
  game.reset()
  emit('exit')
}

function handleVisibilityChange() {
  if (document.hidden && status.value === 'playing') handlePause()
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)

  if (props.continueGame) {
    const saved = getActive()
    if (saved) game.resumeFromSave(saved)
    return
  }

  game.start(props.difficultyKey)
  recordStart(props.difficultyKey)
  autosave()
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (status.value === 'playing' || status.value === 'paused') autosave()
  game.reset()
})

watch(status, (val) => {
  if (val === 'finished') {
    const r = results.value
    const summary = recordCompletion(difficulty.value, r)
    clearActive()
    emit('finished', { ...r, ...summary })
  }
})
</script>

<style scoped>
.game {
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
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
  font-size: 2rem;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: 0.1em;
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
}

.exit-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  padding: 0.5rem;
}

.hud {
  width: 100%;
  max-width: 480px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hud-top {
  display: grid;
  grid-template-columns: auto 1fr auto;
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

.difficulty-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--accent);
  text-transform: capitalize;
  text-align: center;
}

.timer {
  font-variant-numeric: tabular-nums;
  color: var(--text-dim);
  font-size: 0.95rem;
}

.stat {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.stat-primary {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
}

.stalled-banner {
  width: 100%;
  max-width: 480px;
  margin: 0;
  background: color-mix(in srgb, var(--wrong) 16%, var(--surface));
  border: 1px solid var(--wrong);
  border-radius: 10px;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  color: var(--text);
  text-align: center;
}

.controls {
  width: 100%;
  max-width: 480px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.4rem;
}

.ctrl-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.6rem 0.3rem;
  border: none;
  border-radius: 10px;
  background: var(--surface);
  color: var(--text-dim);
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
}

.ctrl-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.icon {
  font-size: 1.1rem;
  line-height: 1;
}
</style>
