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
        <span class="difficulty-label">
          {{ difficultyLabel }}<span v-if="variantTag" class="dynamic-tag"> · {{ variantTag }}</span>
        </span>
        <span class="timer">{{ formattedRemaining }}</span>
      </div>
      <div class="hud hud-secondary">
        <span class="find-label">
          <template v-if="status === 'countdown'">Get ready…</template>
          <template v-else>Find: <strong>{{ expectedTarget }}</strong></template>
        </span>
        <span class="stat">Score {{ liveScore }}</span>
        <span class="stat">Errors {{ errors }}</span>
      </div>

      <div class="board-wrap">
        <TrailBoard
          :layout="layout"
          :revealed="status === 'playing'"
          :wrong-label="wrongLabel"
          @tap="handleTap"
        />
        <div v-if="status === 'countdown'" class="countdown-overlay">
          {{ countdownValue > 0 ? countdownValue : 'Go!' }}
        </div>
      </div>

      <p class="progress">Progress {{ targetsCompleted }} / {{ totalTargets }}</p>
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
import TrailBoard from './TrailBoard.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { useSwitchTrailGame } from '../../composables/switchtrail/useSwitchTrailGame.js'
import { useSwitchTrailStats } from '../../composables/switchtrail/useSwitchTrailStats.js'
import { calculateScore } from '../../composables/switchtrail/scoring.js'
import { SWITCHTRAIL_DIFFICULTIES } from '../../constants/switchtrail/difficulties.js'
import { variantKeyFor } from '../../constants/switchtrail/variants.js'

const props = defineProps({
  difficultyKey: { type: String, required: true },
  colorMode: { type: Boolean, default: false },
})
const emit = defineEmits(['finished', 'exit'])

const { recordStart } = useSwitchTrailStats()

const game = useSwitchTrailGame()
const {
  status, countdownValue, layout, expectedTarget, errors, remainingTime,
  targetsCompleted, totalTargets, wrongLabel, results,
} = game

const difficulty = computed(() => SWITCHTRAIL_DIFFICULTIES[props.difficultyKey])
const difficultyLabel = computed(() => difficulty.value?.label || '')
const variantTag = computed(() => {
  const dynamic = !!difficulty.value?.dynamic
  if (dynamic && props.colorMode) return 'Dynamic + Random Color'
  if (dynamic) return 'Dynamic'
  if (props.colorMode) return 'Random Color'
  return null
})

const formattedRemaining = computed(() => {
  const totalSeconds = Math.ceil(remainingTime.value / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

// A live, in-round preview of score — no time/clean bonus (those only apply
// once the trail is actually completed, SPEC §10), so watching this number
// climb can't be used to predict or game the incomplete-round rule.
const liveScore = computed(() => calculateScore({
  correctTargets: targetsCompleted.value,
  errors: errors.value,
  completed: false,
  remainingSeconds: 0,
}))

const showExitConfirm = ref(false)

function handleTap(label) {
  game.tap(label)
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

function handleRestart() {
  game.start(props.difficultyKey, undefined, { colorMode: props.colorMode })
  recordStart(props.difficultyKey, variantKeyFor(props.colorMode))
}

function handleVisibilityChange() {
  if (document.hidden && (status.value === 'playing' || status.value === 'countdown')) {
    game.pause()
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  game.start(props.difficultyKey, undefined, { colorMode: props.colorMode })
  recordStart(props.difficultyKey, variantKeyFor(props.colorMode))
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
  max-width: 400px;
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
  grid-template-columns: 1fr auto auto;
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
  text-transform: capitalize;
}

.timer {
  font-variant-numeric: tabular-nums;
  color: var(--text-dim);
  font-size: 0.95rem;
  justify-self: end;
}

.find-label {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
}

.find-label strong {
  color: var(--accent);
  font-size: 1.2rem;
}

.stat {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.dynamic-tag {
  color: var(--text-dim);
  font-weight: 600;
}

.board-wrap {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
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
  border-radius: 16px;
}

.progress {
  margin: 0;
  color: var(--text-dim);
  font-size: 0.85rem;
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
