<template>
  <div class="game">
    <template v-if="status === 'paused'">
      <div class="paused-overlay">
        <p class="paused-title">Round Paused</p>
        <button class="resume-btn" @click="handleResume">Resume</button>
        <button class="restart-btn" @click="handleRestart">Restart</button>
        <button class="quit-btn" @click="handleExit">Quit</button>
      </div>
    </template>

    <template v-else>
      <div class="hud">
        <button class="exit-icon-btn" aria-label="Exit to menu" @click="handleExit">✕</button>
        <span class="difficulty-label">{{ difficultyLabel }}</span>
        <span class="timer">{{ remainingSeconds }}s</span>
      </div>

      <!-- SPEC §30: a smaller, persistent target reminder stays visible
           throughout — the game measures vigilance, not target-letter
           working memory. -->
      <p class="target-indicator">Target: <strong>{{ targetLetter }}</strong></p>

      <button
        class="tap-surface"
        :disabled="status !== 'playing'"
        aria-label="Tap area — tap here whenever your target letter appears"
        @click="handleTap"
      >
        <div v-if="status === 'countdown'" class="countdown-overlay" aria-hidden="true">
          <p class="target-preview">TARGET: {{ targetLetter }}</p>
          <span>{{ countdownValue > 0 ? countdownValue : 'Go!' }}</span>
        </div>
        <span v-else class="stimulus" aria-hidden="true">{{ currentLetter }}</span>
        <div v-if="feedback" class="feedback-icon" :class="feedback" aria-live="polite">
          {{ feedback === 'hit' ? '✓' : '✕' }}
        </div>
        <p v-if="status === 'playing'" class="tap-hint" aria-hidden="true">TAP ANYWHERE</p>
      </button>
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
import ConfirmDialog from '../ConfirmDialog.vue'
import { useTargetTapGame } from '../../composables/targettap/useTargetTapGame.js'
import { useTargetTapStats } from '../../composables/targettap/useTargetTapStats.js'
import { TARGETTAP_DIFFICULTIES } from '../../constants/targettap/difficulties.js'

const props = defineProps({
  difficultyKey: { type: String, required: true },
})
const emit = defineEmits(['finished', 'exit'])

const { recordStart, getLastTarget, setLastTarget } = useTargetTapStats()

const game = useTargetTapGame()
const { status, countdownValue, targetLetter, currentLetter, totalDuration, elapsedTime, feedback, results } = game

const difficultyLabel = computed(() => TARGETTAP_DIFFICULTIES[props.difficultyKey]?.label || '')
const remainingSeconds = computed(() => Math.max(0, Math.ceil((totalDuration.value - elapsedTime.value) / 1000)))

const showExitConfirm = ref(false)

function handleTap() {
  game.tap()
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

function startRound() {
  // SPEC §6: never repeat the immediately previous game's target, across
  // every difficulty — recorded/read here rather than inside the pure game
  // composable (SPEC §34 keeps sequence generation free of persistence).
  game.start(props.difficultyKey, getLastTarget(), undefined)
  setLastTarget(game.targetLetter.value)
  recordStart(props.difficultyKey)
}

function handleRestart() {
  startRound()
}

function handleVisibilityChange() {
  if (document.hidden && (status.value === 'playing' || status.value === 'countdown')) {
    game.pause()
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  startRound()
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

.difficulty-label {
  text-align: center;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--accent);
  text-transform: capitalize;
}

.timer {
  font-variant-numeric: tabular-nums;
  color: var(--text-dim);
  font-size: 0.95rem;
  justify-self: end;
}

.target-indicator {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
}

.target-indicator strong {
  color: var(--accent);
  font-size: 1.2rem;
}

.tap-surface {
  position: relative;
  width: 100%;
  height: min(50vh, 360px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: none;
  border-radius: 16px;
  padding: 0;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  overflow: hidden;
}

.tap-surface:disabled {
  cursor: default;
}

.stimulus {
  font-size: clamp(4rem, 22vw, 7rem);
  font-weight: 800;
  line-height: 1;
  color: var(--text);
}

.tap-hint {
  position: absolute;
  bottom: 1rem;
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-dim);
}

.countdown-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  font-size: 4rem;
  font-weight: 800;
  color: var(--accent);
}

.target-preview {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}

.feedback-icon {
  position: absolute;
  top: 0.75rem;
  right: 1rem;
  font-size: 1.75rem;
  font-weight: 800;
}

.feedback-icon.hit {
  color: var(--correct);
}

.feedback-icon.falseAlarm {
  color: var(--wrong);
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
