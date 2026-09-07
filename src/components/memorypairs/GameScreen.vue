<template>
  <div class="game">
    <template v-if="status === 'paused'">
      <div class="paused-overlay">
        <p class="paused-title">Paused</p>
        <button class="resume-btn" @click="handleResume">Resume</button>
        <button class="restart-btn" @click="handleRestart">Restart</button>
        <button class="quit-btn" @click="handleExit">Quit</button>
      </div>
    </template>

    <template v-else>
      <div class="hud">
        <button class="exit-icon-btn" aria-label="Exit to menu" @click="handleExit">✕</button>
        <span class="difficulty-label">{{ difficultyLabel }}</span>
        <span class="timer">{{ formattedTime }}</span>
      </div>
      <div class="hud hud-secondary">
        <span class="stat">Moves {{ moves }}</span>
        <span class="stat">Mistakes {{ mistakes }}</span>
        <span class="stat">Pairs {{ pairsFound }} / {{ difficulty?.pairs }}</span>
      </div>

      <div class="board-wrap">
        <MemoryBoard
          :tiles="tiles"
          :cols="difficulty?.cols"
          :portrait-cols="difficulty?.portraitCols"
          :wrong-ids="wrongIds"
          @tap="handleTap"
        />
        <div v-if="status === 'countdown'" class="countdown-overlay">
          {{ countdownValue > 0 ? countdownValue : 'Go!' }}
        </div>
      </div>

      <button v-if="status === 'playing'" class="pause-btn" @click="handlePause">⏸ Pause</button>
    </template>

    <ConfirmDialog
      v-if="showExitConfirm"
      message="Exit this game? Your progress on it will be lost."
      @confirm="confirmExit"
      @cancel="showExitConfirm = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import MemoryBoard from './MemoryBoard.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { useMemoryPairsGame } from '../../composables/memorypairs/useMemoryPairsGame.js'
import { useMemoryPairsStorage } from '../../composables/memorypairs/useMemoryPairsStorage.js'
import { useMemoryPairsStats } from '../../composables/memorypairs/useMemoryPairsStats.js'
import { getDifficultyConfig } from '../../constants/memorypairs/difficulties.js'

const props = defineProps({
  difficultyKey: { type: String, default: null },
  continueGame: { type: Boolean, default: false },
})
const emit = defineEmits(['finished', 'exit'])

const { getActive, saveActive, clearActive } = useMemoryPairsStorage()
const { recordStart } = useMemoryPairsStats()

// A found/mismatched pair's tiles flip back asynchronously via an internal
// timeout, well after the tap that triggered it — nothing else would
// persist that change until the player's next action, so the composable
// notifies explicitly (same pattern as set/useSetGame.js).
const game = useMemoryPairsGame((snap) => saveActive(snap))
const { status, countdownValue, tiles, moves, mistakes, pairsFound, feedback, results } = game

const difficultyKey = computed(() => game.difficulty.value || props.difficultyKey)
const difficulty = computed(() => getDifficultyConfig(difficultyKey.value))
const difficultyLabel = computed(() => difficulty.value?.label || '')

// The two tiles mid-mismatch-feedback, for a brief red flash — tiles.value
// doesn't carry that on the tile itself (only facedown/revealed/matched).
const wrongIds = computed(() =>
  feedback.value === 'mismatch' ? tiles.value.filter((t) => t.state === 'revealed').map((t) => t.id) : []
)

const formattedTime = computed(() => {
  const totalSeconds = Math.floor(game.elapsedTime.value / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

const showExitConfirm = ref(false)

function autosave() {
  if (status.value === 'playing' || status.value === 'paused') {
    saveActive(game.snapshot())
  }
}

function handleTap(tileId) {
  game.tap(tileId)
  autosave()
}

function handleExit() {
  showExitConfirm.value = true
}

function confirmExit() {
  showExitConfirm.value = false
  clearActive()
  game.reset()
  emit('exit')
}

function handleRestart() {
  clearActive()
  game.start(difficultyKey.value)
  recordStart(difficultyKey.value)
}

function handlePause() {
  game.pause()
  autosave()
}

function handleResume() {
  game.resumeFromPause()
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
    clearActive()
    emit('finished', r)
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
  gap: 0.6rem;
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

.difficulty-label {
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
  font-size: 0.8rem;
  color: var(--text-dim);
  text-align: center;
}

.board-wrap {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
}

.pause-btn {
  background: var(--surface);
  color: var(--text-dim);
  border: none;
  border-radius: 10px;
  padding: 0.6rem 1.25rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
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
