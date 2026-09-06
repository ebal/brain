<template>
  <div class="game">
    <div v-if="status === 'countdown'" class="countdown">
      <p class="ready-label">Ready?</p>
      <p class="countdown-number">{{ countdownValue > 0 ? countdownValue : 'Go!' }}</p>
    </div>

    <template v-else-if="status === 'paused'">
      <div class="paused-overlay">
        <p class="paused-title">PAUSED</p>
        <button class="resume-btn" @click="handleResume">Resume</button>
        <button class="exit-btn" @click="handleExit">Exit to Menu</button>
      </div>
    </template>

    <template v-else>
      <div class="hud">
        <span class="difficulty-label">{{ difficultyLabel }}</span>
        <span class="level-label">Level {{ level }}</span>
      </div>
      <div class="hud">
        <span class="lives">
          <template v-for="n in totalLives" :key="n">{{ n <= livesRemaining ? '♥' : '♡' }}</template>
        </span>
      </div>

      <p class="phase-caption" aria-live="polite">
        <template v-if="status === 'intro'">{{ isRetry ? `Retry Level ${level}` : `Level ${level}` }}<br />Watch...</template>
        <template v-else-if="status === 'playback'">Watch...</template>
        <template v-else-if="status === 'input'">Your turn<br />{{ playerIndex }} / {{ sequenceLength }}</template>
        <template v-else-if="status === 'result'">{{ resultType === 'correct' ? 'Correct!' : 'Wrong' }}</template>
      </p>

      <MemoryGrid
        :active-cell="activeCell"
        :tap-feedback="tapFeedback"
        :interactive="status === 'input'"
        @select="handleTap"
      />

      <button class="pause-btn" @click="handlePause">⏸ Pause</button>
    </template>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed, watch } from 'vue'
import MemoryGrid from './MemoryGrid.vue'
import { useSequenceMemory } from '../../composables/sequence-memory/useSequenceMemory.js'
import { useMemoryStorage } from '../../composables/sequence-memory/useMemoryStorage.js'
import { useMemoryStats } from '../../composables/sequence-memory/useMemoryStats.js'
import { SEQUENCE_DIFFICULTIES } from '../../constants/sequence-memory/difficulties.js'

const props = defineProps({
  difficultyKey: { type: String, default: null },
  continueGame: { type: Boolean, default: false },
})
const emit = defineEmits(['finished', 'exit'])

const { getActive, saveActive, clearActive } = useMemoryStorage()
const { recordStart, recordCompletion, recordAbandon } = useMemoryStats()

// Level completion / mistake resolution happens asynchronously (after a
// brief result message), well after the tap that triggered it — nothing
// else would persist that change until the player's next action, so the
// composable notifies explicitly (see SET's history for why).
const game = useSequenceMemory((snap) => saveActive(snap))
const {
  status, difficulty, level, isRetry, livesRemaining, countdownValue, activeCell,
  playerIndex, sequenceLength, tapFeedback, resultType, results,
} = game

const difficultyLabel = computed(() => {
  const key = difficulty.value || props.difficultyKey
  return SEQUENCE_DIFFICULTIES[key]?.label || ''
})
const totalLives = computed(() => SEQUENCE_DIFFICULTIES[difficulty.value || props.difficultyKey]?.lives || 0)

function autosave() {
  if (status.value !== 'idle' && status.value !== 'finished') {
    saveActive(game.snapshot())
  }
}

function handleTap(cellIndex) {
  game.tapCell(cellIndex)
  autosave()
}

function handlePause() {
  game.pause()
  autosave()
}

function handleResume() {
  game.resumeGame()
}

function handleExit() {
  recordAbandon(difficulty.value || props.difficultyKey)
  clearActive()
  game.reset()
  emit('exit')
}

function handleVisibilityChange() {
  if (document.hidden && status.value !== 'idle' && status.value !== 'finished' && status.value !== 'paused') {
    handlePause()
  }
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
  if (status.value !== 'idle' && status.value !== 'finished') autosave()
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
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.countdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem 0;
}

.ready-label {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-dim);
}

.countdown-number {
  font-size: 5rem;
  font-weight: 800;
  color: var(--accent);
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
  max-width: 380px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.difficulty-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--accent);
  text-transform: capitalize;
}

.level-label {
  color: var(--text-dim);
  font-size: 0.95rem;
}

.lives {
  font-size: 1.2rem;
  color: var(--wrong);
  letter-spacing: 0.2em;
}

.phase-caption {
  min-height: 2.6em;
  text-align: center;
  color: var(--text-dim);
  font-weight: 600;
  line-height: 1.3;
}

.pause-btn {
  background: var(--surface);
  color: var(--text-dim);
  border: none;
  border-radius: 10px;
  padding: 0.6rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
