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
        <span class="level-label">{{ practiceMode ? 'Practice Weak Flags' : `Level ${level}` }}</span>
        <span class="timer">{{ formatTime(elapsedTime) }}</span>
      </div>
      <div class="hud hud-secondary">
        <span class="stat">Question {{ Math.min(questionIndex + 1, totalQuestions) }} / {{ totalQuestions }}</span>
        <span class="stat">Correct {{ correctCount }}</span>
        <span class="stat">Streak {{ currentStreak }}</span>
      </div>

      <div v-if="currentQuestion" class="prompt-wrap">
        <p class="prompt-label" aria-live="polite">
          <template v-if="status === 'feedback'">
            <span :class="lastAnswer.correct ? 'result-correct' : 'result-wrong'">
              {{ lastAnswer.correct ? '✓ Correct' : '✕' }}
            </span>
          </template>
          <template v-else>Which flag is</template>
        </p>
        <h2 class="country-name">{{ promptCountry.name }}</h2>
        <p v-if="status === 'feedback'" class="secondary-info">
          Capital: {{ promptCountry.capital }} &middot; Region: {{ promptCountry.region }}
        </p>
      </div>

      <div class="flag-grid">
        <FlagCard
          v-for="(code, i) in currentQuestion?.choices ?? []"
          :key="code"
          :country="getCountry(code)"
          :disabled="status !== 'playing'"
          :reveal-name="status === 'feedback' && (i === currentQuestion.correctIndex || i === selectedIndex)"
          :state="cardState(i)"
          @click="handleSelect(i)"
        />
      </div>
    </template>

    <ConfirmDialog
      v-if="showExitConfirm"
      message="Exit this level? Your progress on it will be saved."
      @confirm="confirmExit"
      @cancel="showExitConfirm = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import FlagCard from './FlagCard.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { useFlagsGame } from '../../composables/flags/useFlagsGame.js'
import { useFlagsStats } from '../../composables/flags/useFlagsStats.js'
import { useFlagsStorage } from '../../composables/flags/useFlagsStorage.js'
import { getCountry } from '../../composables/flags/dataset.js'

const props = defineProps({
  level: { type: Number, default: null },
  practiceMode: { type: Boolean, default: false },
  continueGame: { type: Boolean, default: false },
})
const emit = defineEmits(['finished', 'exit'])

const { recordStart, getLearningState, getWeakCountries } = useFlagsStats()
const { getActive, saveActive, clearActive } = useFlagsStorage()

const game = useFlagsGame()
const {
  status, level, isPractice, questionIndex, totalQuestions, currentQuestion,
  selectedIndex, lastAnswer, correctCount, currentStreak, elapsedTime, results,
} = game

const showExitConfirm = ref(false)

// SPEC §12: the prompt/feedback banner names the question's own country even
// mid-feedback (lastAnswer.correctCode), not whatever the player tapped.
const promptCountry = computed(() => {
  if (status.value === 'feedback' && lastAnswer.value) return getCountry(lastAnswer.value.correctCode)
  return currentQuestion.value ? getCountry(currentQuestion.value.country) : {}
})

function cardState(index) {
  if (status.value !== 'feedback' || !currentQuestion.value) return null
  if (index === currentQuestion.value.correctIndex) return 'correct'
  if (index === selectedIndex.value) return 'wrong'
  return 'dimmed'
}

function handleSelect(index) {
  game.selectAnswer(index)
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
  if (document.hidden && (status.value === 'playing' || status.value === 'feedback')) {
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
  } else if (props.practiceMode) {
    game.beginPractice(getWeakCountries(), getLearningState())
  } else {
    game.begin(props.level, getLearningState())
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

.prompt-wrap {
  width: 100%;
  text-align: center;
  min-height: 3.5rem;
}

.prompt-label {
  margin: 0 0 0.2rem;
  font-size: 0.9rem;
  color: var(--text-dim);
}

.result-correct {
  color: var(--correct);
  font-weight: 700;
}

.result-wrong {
  color: var(--wrong);
  font-weight: 700;
}

.country-name {
  margin: 0;
  font-size: clamp(1.25rem, 6vw, 1.75rem);
  font-weight: 800;
  line-height: 1.25;
  overflow-wrap: break-word;
}

.secondary-info {
  margin: 0.3rem 0 0;
  font-size: 0.8rem;
  color: var(--text-dim);
}

.flag-grid {
  width: 100%;
  max-width: 420px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  padding-bottom: env(safe-area-inset-bottom);
}

.paused-title {
  font-size: 1.6rem;
  letter-spacing: 0.06em;
  margin: 0;
}

.resume-btn {
  min-width: 200px;
}
</style>
