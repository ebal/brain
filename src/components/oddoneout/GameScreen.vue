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
          {{ difficultyLabel }}<span v-if="variantTag" class="variant-tag"> · {{ variantTag }}</span>
        </span>
        <span v-if="!props.untimed" class="timer">{{ remainingSeconds }}s</span>
        <span v-else class="timer">{{ correct }} / {{ targetCorrect }}</span>
      </div>
      <div class="hud hud-secondary">
        <span class="find-label">
          <template v-if="status === 'countdown'">Get ready…</template>
          <template v-else>Find the odd one out</template>
        </span>
        <span class="stat">Score {{ liveScore }}</span>
        <span class="stat">Wrong {{ wrong }}</span>
      </div>

      <div class="grid-wrap">
        <div
          v-if="trial"
          class="oddoneout-grid"
          :style="{ '--grid-size': trial.gridSize }"
        >
          <OddOneOutCell
            v-for="(value, i) in trial.cells"
            :key="i"
            :value="value"
            :is-wrong="wrongIndex === i"
            :interactive="status === 'playing'"
            :color="cellColors[i]"
            @click="handleTap(i)"
          />
        </div>
        <div v-if="status === 'countdown'" class="countdown-overlay">
          {{ countdownValue > 0 ? countdownValue : 'Go!' }}
        </div>
      </div>

      <p v-if="!props.untimed" class="progress">Correct {{ correct }}</p>
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
import OddOneOutCell from './OddOneOutCell.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { useOddOneOutGame } from '../../composables/oddoneout/useOddOneOutGame.js'
import { useOddOneOutStats } from '../../composables/oddoneout/useOddOneOutStats.js'
import { calculateOddOneOutScore } from '../../composables/oddoneout/scoring.js'
import { ODDONEOUT_DIFFICULTIES } from '../../constants/oddoneout/difficulties.js'
import { variantKeyFor } from '../../constants/oddoneout/variants.js'

const props = defineProps({
  difficultyKey: { type: String, required: true },
  colorMode: { type: Boolean, default: false },
  untimed: { type: Boolean, default: false },
})
const emit = defineEmits(['finished', 'exit'])

const variantKey = computed(() => variantKeyFor(props.colorMode, props.untimed))
const { recordStart } = useOddOneOutStats()

const game = useOddOneOutGame()
const { status, countdownValue, trial, cellColors, correct, wrong, remainingTime, targetCorrect, wrongIndex, results } = game

const difficultyLabel = computed(() => ODDONEOUT_DIFFICULTIES[props.difficultyKey]?.label || '')
const remainingSeconds = computed(() => Math.ceil(remainingTime.value / 1000))
const variantTag = computed(() => {
  const parts = []
  if (props.untimed) parts.push('Untimed')
  if (props.colorMode) parts.push('Random Color')
  return parts.length ? parts.join(' + ') : null
})

// Live, in-round preview — same shape the final score will use once the
// round ends (SPEC §17 has no separate time bonus to withhold, unlike
// Switch Trail, so this is already the true running score).
const liveScore = computed(() => calculateOddOneOutScore({ correct: correct.value, wrong: wrong.value }))

const showExitConfirm = ref(false)

function handleTap(index) {
  game.tap(index)
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
  game.start(props.difficultyKey, undefined, { colorMode: props.colorMode, untimed: props.untimed })
  recordStart(props.difficultyKey, variantKey.value)
}

function handleVisibilityChange() {
  if (document.hidden && (status.value === 'playing' || status.value === 'countdown')) {
    game.pause()
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  game.start(props.difficultyKey, undefined, { colorMode: props.colorMode, untimed: props.untimed })
  recordStart(props.difficultyKey, variantKey.value)
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
  max-width: 560px;
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

.variant-tag {
  color: var(--text-dim);
  font-weight: 600;
}

/* SPEC §25: "timer visible but secondary" / "score secondary" */
.timer {
  font-variant-numeric: tabular-nums;
  color: var(--text-dim);
  font-size: 0.95rem;
  justify-self: end;
}

.find-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
}

.stat {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.grid-wrap {
  position: relative;
  /* Same reasoning as schulte/GameScreen.vue's .grid-wrap — up to 9x9
     (Extreme) needs every pixel it can get on a real phone screen. */
  width: min(95vw, 480px);
  aspect-ratio: 1;
}

.oddoneout-grid {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(var(--grid-size), 1fr);
  grid-template-rows: repeat(var(--grid-size), 1fr);
  gap: clamp(2px, 0.8vw, 6px);
  user-select: none;
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
