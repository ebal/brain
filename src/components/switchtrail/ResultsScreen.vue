<template>
  <div class="results">
    <h1>{{ results.completed ? 'Trail Complete' : 'Time!' }}</h1>
    <p class="difficulty-name">
      {{ difficultyLabel }} · {{ results.targetsCompleted }} / {{ results.totalTargets }} targets
      <template v-if="untimed"> · Untimed</template>
      <template v-if="colorMode"> · Random Color</template>
    </p>

    <div v-if="isNewBestScore || isNewBestCompletionTime" class="new-best-banner">
      {{ newBestLabel }}
    </div>

    <div class="score-card">
      <span class="label">Score</span>
      <span class="value">{{ results.score }}</span>
      <span class="status-badge" :class="{ completed: results.completed }">
        {{ results.completed ? 'Completed' : 'Timed Out' }}
      </span>
    </div>

    <h2 class="section-title">Game</h2>
    <div class="stats-grid">
      <div class="stat">
        <span class="label">Personal Best Score</span>
        <span class="value">{{ bestScore?.score ?? '—' }}</span>
      </div>
      <div class="stat">
        <span class="label">Best Completion Time</span>
        <span class="value">{{ bestCompletionTime ? formatTime(bestCompletionTime.completionTime) : '—' }}</span>
      </div>
    </div>

    <h2 class="section-title">Performance</h2>
    <div class="stats-grid">
      <div class="stat" v-if="results.completed">
        <span class="label">Completion Time</span>
        <span class="value">{{ formatTime(results.completionTime) }}</span>
      </div>
      <div class="stat">
        <span class="label">Targets Completed</span>
        <span class="value">{{ results.targetsCompleted }} / {{ results.totalTargets }}</span>
      </div>
      <div class="stat">
        <span class="label">Errors</span>
        <span class="value" :class="{ wrong: results.errors > 0 }">{{ results.errors }}</span>
      </div>
      <div class="stat">
        <span class="label">Accuracy</span>
        <span class="value">{{ results.accuracy.toFixed(1) }}%</span>
      </div>
      <div class="stat">
        <span class="label">Avg Transition</span>
        <span class="value">{{ Math.round(results.avgTransitionTime) }}ms</span>
      </div>
      <div class="stat">
        <span class="label">Median Transition</span>
        <span class="value">{{ Math.round(results.medianTransitionTime) }}ms</span>
      </div>
      <div class="stat">
        <span class="label">Fastest Transition</span>
        <span class="value">{{ Math.round(results.fastestTransition) }}ms</span>
      </div>
      <div class="stat">
        <span class="label">Slowest Transition</span>
        <span class="value">{{ Math.round(results.slowestTransition) }}ms</span>
      </div>
    </div>

    <div class="actions">
      <button class="primary" @click="$emit('replay')">Play Again</button>
      <button class="secondary" @click="$emit('menu')">Back to Menu</button>
    </div>

    <button class="history-link" @click="$emit('history', { difficultyKey, colorMode, untimed })">
      View History
    </button>
  </div>
</template>

<script setup>
import { SWITCHTRAIL_DIFFICULTIES } from '../../constants/switchtrail/difficulties.js'
import { variantKeyFor } from '../../constants/switchtrail/variants.js'
import { useSwitchTrailStats } from '../../composables/switchtrail/useSwitchTrailStats.js'

const props = defineProps({
  results: { type: Object, required: true },
  difficultyKey: { type: String, required: true },
  colorMode: { type: Boolean, default: false },
  untimed: { type: Boolean, default: false },
})
defineEmits(['replay', 'menu', 'history'])

const variantKey = variantKeyFor(props.colorMode, props.untimed)
const { recordCompletion, getStats } = useSwitchTrailStats()
const { isNewBestScore, isNewBestCompletionTime } = recordCompletion(props.difficultyKey, props.results, variantKey)

const stats = getStats(props.difficultyKey, variantKey)
const bestScore = stats.bestScore
const bestCompletionTime = stats.bestCompletionTime
const difficultyLabel = SWITCHTRAIL_DIFFICULTIES[props.difficultyKey]?.label

const newBestLabel = isNewBestScore && isNewBestCompletionTime
  ? 'New Best Score & Time!'
  : isNewBestScore
    ? 'New Best Score!'
    : 'New Best Completion Time!'

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
</script>

<style scoped>
.results {
  max-width: 480px;
  width: 100%;
  text-align: center;
}

.difficulty-name {
  color: var(--text-dim);
  margin-top: -0.5rem;
  margin-bottom: 1.25rem;
  text-transform: capitalize;
}

.new-best-banner {
  background: var(--accent);
  color: #10121a;
  font-weight: 700;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  display: inline-block;
  margin-bottom: 1.25rem;
}

.score-card {
  background: var(--surface);
  border: 1px solid var(--accent);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.score-card .value {
  font-size: 2.25rem;
  font-weight: 800;
  color: var(--accent);
}

.status-badge {
  align-self: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-dim);
}

.status-badge.completed {
  color: var(--correct);
}

.section-title {
  text-align: left;
  font-size: 0.95rem;
  color: var(--text-dim);
  margin: 1.25rem 0 0.6rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.stat {
  background: var(--surface);
  border-radius: 12px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.label {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.value {
  font-size: 1.2rem;
  font-weight: 700;
}

.value.wrong {
  color: var(--wrong);
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.actions button {
  flex: 1;
  padding: 0.85rem;
  border-radius: 10px;
  border: none;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}

.actions .primary {
  background: var(--accent);
  color: #10121a;
}

.actions .secondary {
  background: var(--surface-2);
  color: var(--text);
}

.history-link {
  display: block;
  margin: 1rem auto 0;
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: underline;
}

.history-link:hover {
  color: var(--accent);
}
</style>
