<template>
  <div class="game">
    <template v-if="status === 'paused'">
      <div class="paused-overlay">
        <p class="paused-title">PAUSED</p>
        <button class="resume-btn" @click="handleResume">Resume</button>
        <button class="exit-btn" @click="handleExit">Exit to Menu</button>
      </div>
    </template>

    <template v-else>
      <div class="hud hud-top">
        <button class="exit-icon-btn" aria-label="Exit to menu" @click="requestExit">✕</button>
        <span class="difficulty-label">{{ difficultyLabel }}</span>
        <span class="timer">{{ formattedTime }}</span>
      </div>
      <div class="hud">
        <span class="stat stat-primary">Marbles Left {{ remaining }}</span>
        <span class="stat">Moves {{ moves }}</span>
      </div>

      <MarbleBoard
        :n="boardState.n"
        :occupied="boardState.occupied"
        :selected="selected"
        :legal-destinations="legalDestinations"
        :last-move-cells="lastMoveCells"
        @tap="handleTap"
      />

      <div class="controls">
        <button class="ctrl-btn" @click="handleUndo" :disabled="moves === 0">
          <span class="icon">↶</span>
          <span class="label">Undo</span>
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
      message="Restart this puzzle? Your current progress will be lost."
      confirm-label="Restart"
      @confirm="confirmRestart"
      @cancel="showRestartConfirm = false"
    />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed, watch, ref } from 'vue'
import MarbleBoard from './MarbleBoard.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { useMarbleJumpGame } from '../../composables/marblejump/useMarbleJumpGame.js'
import { useMarbleJumpStorage } from '../../composables/marblejump/useMarbleJumpStorage.js'
import { useMarbleJumpStats } from '../../composables/marblejump/useMarbleJumpStats.js'
import { remainingCount } from '../../composables/marblejump/board.js'
import { MARBLEJUMP_DIFFICULTIES } from '../../constants/marblejump/difficulties.js'

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
  // progress (SPEC §15) — skip the confirmation dialog in that case.
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

const { getActive, saveActive, clearActive } = useMarbleJumpStorage()
const { recordStart, recordCompletion, recordAbandon } = useMarbleJumpStats()

const game = useMarbleJumpGame()
const { status, difficulty, boardState, selected, legalDestinations, lastMove, moves, elapsedTime, results } = game

const remaining = computed(() => remainingCount(boardState.value))
const lastMoveCells = computed(() =>
  lastMove.value ? [lastMove.value.start, lastMove.value.jumped, lastMove.value.landing] : []
)

const difficultyLabel = computed(() => {
  const key = difficulty.value || props.difficultyKey
  return MARBLEJUMP_DIFFICULTIES[key]?.label || ''
})

const formattedTime = computed(() => {
  const totalSeconds = Math.floor(elapsedTime.value / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

// SPEC §20: autosave after every legal move and Undo.
function autosave() {
  if (status.value === 'playing' || status.value === 'paused') {
    saveActive(game.snapshot())
  }
}

function handleTap(idx) {
  game.selectHole(idx)
  autosave()
}

function handleUndo() {
  game.undo()
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

.controls {
  width: 100%;
  max-width: 480px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.ctrl-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.7rem 0.5rem;
  border: none;
  border-radius: 10px;
  background: var(--surface);
  color: var(--text-dim);
  font-size: 0.8rem;
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
  font-size: 1.25rem;
  line-height: 1;
}
</style>
