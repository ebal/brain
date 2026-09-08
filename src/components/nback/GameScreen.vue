<template>
  <div class="game">
    <div v-if="status === 'countdown'" class="countdown">
      {{ countdownValue > 0 ? countdownValue : 'Go!' }}
    </div>

    <template v-else-if="status === 'playing'">
      <div class="hud">
        <button class="exit-icon-btn" aria-label="Exit to menu" @click="handleExit">✕</button>
        <span class="n-label">{{ difficulty.n }}-BACK</span>
        <span class="progress">
          <template v-if="isSetupPhase">Get ready…</template>
          <template v-else>{{ scoredAnswered }} / {{ totalScored }}</template>
        </span>
      </div>

      <div class="stimulus-area">
        <TransitionGroup
          name="nback-card"
          tag="div"
          class="card-row"
          :style="{ '--flip-ms': `${CARD_FLIP_MS}ms` }"
        >
          <div
            v-for="card in visibleCards"
            :key="card.index"
            class="nback-card"
            :class="{ current: card.isCurrent }"
          >
            <div class="card-inner" :class="{ revealed: card.isCurrent }">
              <div class="card-face card-back" aria-hidden="true"></div>
              <div class="card-face card-front" :style="{ color: card.color }">{{ card.number }}</div>
            </div>
          </div>
        </TransitionGroup>
        <div v-if="feedback" class="feedback-icon" :class="feedback" aria-live="polite">
          {{ feedback === 'correct' ? '✓' : '✕' }}
        </div>
      </div>

      <ResponseButtons :disabled="!awaitingResponse" @answer="game.answer" />
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
import ResponseButtons from './ResponseButtons.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { useNBackGame, CARD_FLIP_MS } from '../../composables/nback/useNBackGame.js'
import { NBACK_DIFFICULTIES } from '../../constants/nback/difficulties.js'

const props = defineProps({
  difficultyKey: { type: String, required: true },
})
const emit = defineEmits(['finished', 'exit'])

const game = useNBackGame()
const { status, countdownValue, visibleCards, isSetupPhase, scoredAnswered, totalScored, feedback, awaitingResponse, results } = game

const difficulty = computed(() =>
  Object.values(NBACK_DIFFICULTIES).find((d) => d.key === props.difficultyKey)
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

function handleKeydown(e) {
  if (!awaitingResponse.value) return
  const key = e.key.toLowerCase()
  if (['arrowleft', 'n', '1'].includes(key)) game.answer('noMatch')
  else if (['arrowright', 'm', '2'].includes(key)) game.answer('match')
}

onMounted(() => {
  game.start(difficulty.value)
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('visibilitychange', game.handleVisibilityChange)
})

onUnmounted(() => {
  game.reset()
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('visibilitychange', game.handleVisibilityChange)
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
  max-width: 480px;
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

.n-label {
  text-align: center;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.03em;
}

.progress {
  font-variant-numeric: tabular-nums;
  color: var(--text-dim);
  font-size: 0.9rem;
}

.stimulus-area {
  position: relative;
  width: 100%;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border-radius: 16px;
  padding: 0 0.75rem;
  user-select: none;
  overflow: hidden;
}

.card-row {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
}

.nback-card {
  position: relative;
  flex: 0 1 clamp(3.75rem, 18vw, 5.5rem);
  aspect-ratio: 0.72;
  perspective: 1000px;
}

/* Existing cards sliding into their new slot as the window advances. */
.nback-card-move {
  transition: transform 0.3s ease;
}

/* At rest, only the current card (being answered) is revealed — the trailing
   N cards sit face-down, so recalling what's under them (not re-checking by
   eye) is still the actual task. Both the initial flip-up on arrival and the
   flip-back-down once a newer card demotes this one to history are driven by
   this single, always-on transition. */
.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transform: rotateY(180deg);
  transition: transform var(--flip-ms, 350ms) ease;
}

.card-inner.revealed {
  transform: rotateY(0deg);
}

.card-face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid var(--surface-2);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.card-front {
  background: var(--surface-2);
  font-size: clamp(1.6rem, 8vw, 2.5rem);
  font-weight: 800;
  line-height: 1;
}

.nback-card.current .card-front {
  border-color: var(--accent);
}

.card-back {
  background: linear-gradient(135deg, var(--accent) 0%, var(--surface-2) 100%);
  transform: rotateY(180deg);
}

/* Force a newly-arrived card (which mounts already "current"/revealed) to
   start back-first, so there's something to visibly flip from — without
   this override the card would just appear face-up with no animation. */
.nback-card-enter-from .card-inner {
  transform: rotateY(180deg);
}

/* Leave = discard: the oldest (now more than N back) card slides off to the
   side and fades once it drops out of the visible window, instead of just
   disappearing. Taken out of flow so remaining cards can slide into its
   spot (the .nback-card-move transition above) at the same time. */
.nback-card-leave-active {
  position: absolute;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.nback-card-leave-to {
  transform: translate(-60%, 15%) rotate(-14deg);
  opacity: 0;
}

.feedback-icon {
  position: absolute;
  top: 0.75rem;
  right: 1rem;
  font-size: 1.75rem;
  font-weight: 800;
}

.feedback-icon.correct {
  color: var(--correct);
}

.feedback-icon.incorrect {
  color: var(--wrong);
}
</style>
