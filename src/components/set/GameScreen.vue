<template>
  <div class="game">
    <template v-if="status === 'paused'">
      <div class="paused-overlay">
        <p class="paused-title">PAUSED</p>
        <button class="resume-btn" @click="handleResume">Resume</button>
      </div>
    </template>

    <template v-else>
      <div class="hud">
        <span class="difficulty-label">{{ difficultyLabel }}</span>
        <span class="timer">{{ formattedTime }}</span>
      </div>
      <div class="hud">
        <span class="stat">Sets {{ setsFound }}</span>
        <span class="stat">Mistakes {{ mistakes }}</span>
        <span class="stat">Hints {{ hints }}</span>
        <span class="stat">Deck {{ deckSize }}</span>
      </div>

      <div v-if="feedback" class="feedback-banner" :class="feedback">
        <template v-if="feedback === 'valid'">SET!</template>
        <template v-else>
          Not a SET
          <div v-if="invalidReason" class="invalid-detail">
            <strong>{{ propertyLabel }}:</strong>
            {{ invalidReasonValues.join(' · ') }}
            <br />{{ propertyLabel }} must be all the same or all different.
          </div>
        </template>
      </div>

      <SetBoard
        :board="board"
        :selected="selected"
        :hint-card-ids="hintCardIds"
        :feedback="feedback"
        @select="handleSelect"
      />

      <div class="controls">
        <button class="ctrl-btn" @click="handleHint">
          <span class="icon">💡</span>
          <span class="label">Hint</span>
        </button>
        <button class="ctrl-btn" @click="handlePause">
          <span class="icon">⏸</span>
          <span class="label">Pause</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed, watch } from 'vue'
import SetBoard from './SetBoard.vue'
import { useSetGame } from '../../composables/set/useSetGame.js'
import { useSetStorage } from '../../composables/set/useSetStorage.js'
import { useSetStats } from '../../composables/set/useSetStats.js'
import { SET_DIFFICULTIES, PROPERTY_DISPLAY } from '../../constants/set/cardProperties.js'

const props = defineProps({
  difficultyKey: { type: String, default: null },
  continueGame: { type: Boolean, default: false },
})
const emit = defineEmits(['finished'])

const { getActive, saveActive, clearActive } = useSetStorage()
const { recordStart, recordCompletion } = useSetStats()

// Some state changes (a found SET being removed/replenished) happen
// asynchronously via an internal timeout, well after the click that
// triggered them — nothing else would persist that change until the
// player's next action, so the composable notifies explicitly.
const game = useSetGame((snap) => saveActive(snap))
const {
  status, difficulty, board, selected, setsFound, mistakes, hints,
  hintCardIds, feedback, invalidReason, elapsedTime, deckSize, results,
} = game

const difficultyLabel = computed(() => {
  const key = difficulty.value || props.difficultyKey
  return SET_DIFFICULTIES[key]?.label || ''
})

const propertyLabel = computed(() => invalidReason.value ? PROPERTY_DISPLAY[invalidReason.value.property].label : '')
const invalidReasonValues = computed(() => {
  if (!invalidReason.value) return []
  const { property, values } = invalidReason.value
  const names = PROPERTY_DISPLAY[property].values
  return values.map((v) => names[v])
})

const formattedTime = computed(() => {
  const totalSeconds = Math.floor(elapsedTime.value / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

function autosave() {
  if (status.value === 'playing' || status.value === 'paused') {
    saveActive(game.snapshot())
  }
}

function handleSelect(id) {
  game.selectCard(id)
  autosave()
}

function handleHint() {
  game.useHint()
  autosave()
}

function handlePause() {
  game.pause()
  autosave()
}

function handleResume() {
  game.resumeTimer()
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

.hud {
  width: 100%;
  max-width: 480px;
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

.timer {
  font-variant-numeric: tabular-nums;
  color: var(--text-dim);
  font-size: 0.95rem;
}

.stat {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.feedback-banner {
  width: 100%;
  max-width: 480px;
  text-align: center;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 1.05rem;
}

.feedback-banner.valid {
  background: color-mix(in srgb, var(--correct) 20%, var(--surface));
  color: var(--correct);
}

.feedback-banner.invalid {
  background: color-mix(in srgb, var(--wrong) 20%, var(--surface));
  color: var(--wrong);
}

.invalid-detail {
  margin-top: 0.4rem;
  font-size: 0.85rem;
  font-weight: 500;
  line-height: 1.4;
}

.controls {
  width: 100%;
  max-width: 480px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
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

.icon {
  font-size: 1.25rem;
  line-height: 1;
}
</style>
