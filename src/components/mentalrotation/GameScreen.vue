<template>
  <div class="game">
    <div v-if="status === 'countdown' || status === 'backgrounded'" class="countdown">
      {{ status === 'backgrounded' ? '' : countdownValue > 0 ? countdownValue : 'Go!' }}
    </div>

    <template v-else-if="status === 'playing' && displayedTrial">
      <div class="hud">
        <div class="hud-top">
          <button class="exit-icon-btn" aria-label="Exit to menu" @click="requestExit">✕</button>
          <span class="difficulty-label">{{ difficultyLabel }}</span>
          <span class="timer">{{ timeLeft.toFixed(1) }}s</span>
        </div>
        <div class="score-row">
          <span class="score">Score {{ results.score.toLocaleString() }}</span>
          <span class="trial-count">{{ results.correct }} / {{ results.trialsCompleted }}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
      </div>

      <p class="reference-label">Reference</p>
      <div class="reference-box">
        <ShapeGlyph :cells="displayedTrial.referenceCells" />
      </div>

      <p class="prompt">Which is the same shape, rotated?</p>

      <div class="candidate-grid">
        <button
          v-for="(candidate, i) in displayedTrial.candidates"
          :key="candidate.id"
          class="candidate-card"
          :class="candidateClass(candidate)"
          :disabled="!!feedback"
          @click="handleAnswer(candidate.id)"
        >
          <span class="candidate-letter">{{ String.fromCharCode(65 + i) }}</span>
          <ShapeGlyph :cells="candidate.cells" />
          <span v-if="feedback && candidate.id === selectedCandidateId" class="candidate-mark">
            {{ feedback === 'correct' ? '✓' : '✕' }}
          </span>
        </button>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import ShapeGlyph from './ShapeGlyph.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { useMentalRotationGame } from '../../composables/mentalrotation/useMentalRotationGame.js'
import { useMentalRotationStats } from '../../composables/mentalrotation/useMentalRotationStats.js'
import { MENTALROTATION_DIFFICULTIES } from '../../constants/mentalrotation/difficulties.js'

const props = defineProps({
  difficultyKey: { type: String, required: true },
})
const emit = defineEmits(['finished', 'exit'])

const { recordStart, recordCompletion } = useMentalRotationStats()
const game = useMentalRotationGame()
const { status, countdownValue, timeLeft, totalDuration, currentTrial, feedback, results } = game

const difficultyLabel = computed(() => MENTALROTATION_DIFFICULTIES[props.difficultyKey]?.label || '')
const progressPct = computed(() => (totalDuration.value > 0 ? (timeLeft.value / totalDuration.value) * 100 : 0))

// The composable clears currentTrial the instant answer() is called, but the
// brief feedback flash still needs to render that trial's candidates (and
// know which one was tapped) — so the trial and the tapped id are snapshotted
// locally right before handing off to the composable.
const lastTrial = ref(null)
const selectedCandidateId = ref(null)
const displayedTrial = computed(() => currentTrial.value || lastTrial.value)

function candidateClass(candidate) {
  if (!feedback.value || candidate.id !== selectedCandidateId.value) return ''
  return feedback.value === 'correct' ? 'selected-correct' : 'selected-wrong'
}

function handleAnswer(candidateId) {
  if (!currentTrial.value) return
  lastTrial.value = currentTrial.value
  selectedCandidateId.value = candidateId
  game.answer(candidateId)
}

const showExitConfirm = ref(false)

function requestExit() {
  showExitConfirm.value = true
}

function confirmExit() {
  showExitConfirm.value = false
  game.reset()
  emit('exit')
}

onMounted(() => {
  game.start(MENTALROTATION_DIFFICULTIES[props.difficultyKey])
  recordStart(props.difficultyKey)
  document.addEventListener('visibilitychange', game.handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', game.handleVisibilityChange)
  game.reset()
})

watch(status, (val) => {
  if (val === 'finished') {
    const r = results.value
    const summary = recordCompletion(props.difficultyKey, r)
    emit('finished', { ...r, ...summary })
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
  gap: 1rem;
}

.countdown {
  font-size: 5rem;
  font-weight: 800;
  color: var(--accent);
  min-height: 6rem;
}

.hud {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
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

.difficulty-label {
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

.score-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--text-dim);
}

.score {
  font-weight: 700;
  color: var(--text);
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

.reference-label {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
}

.reference-box {
  width: 100%;
  max-width: 220px;
  aspect-ratio: 1;
  background: var(--stimulus-bg);
  border-radius: 16px;
  padding: 1rem;
}

.reference-box :deep(rect) {
  fill: #10121a;
}

.prompt {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-dim);
}

.candidate-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.candidate-card {
  position: relative;
  aspect-ratio: 1;
  background: var(--surface);
  border: 3px solid var(--surface-2);
  border-radius: 14px;
  padding: 0.75rem;
  cursor: pointer;
  transition: border-color 0.1s ease;
  touch-action: manipulation;
  user-select: none;
}

.candidate-card:disabled {
  cursor: default;
}

.candidate-letter {
  position: absolute;
  top: 0.4rem;
  left: 0.55rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-dim);
}

.candidate-mark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 800;
  background: rgba(20, 21, 26, 0.55);
  border-radius: 11px;
}

.candidate-card.selected-correct {
  border-color: var(--correct);
}

.candidate-card.selected-correct .candidate-mark {
  color: var(--correct);
}

.candidate-card.selected-wrong {
  border-color: var(--wrong);
}

.candidate-card.selected-wrong .candidate-mark {
  color: var(--wrong);
}

@media (max-width: 420px) {
  .countdown {
    font-size: 4rem;
  }
}
</style>
