<template>
  <div class="results">
    <h1>{{ mode === 'timed' ? 'Time!' : 'Round Complete!' }}</h1>
    <p class="difficulty-name">{{ difficultyLabel }}</p>

    <div v-if="results.isNewBestScore" class="new-best-banner">New Best Score!</div>

    <div class="stats-grid">
      <div class="stat">
        <span class="label">Score</span>
        <span class="value">{{ results.score.toLocaleString() }}</span>
      </div>
      <div class="stat">
        <span class="label">Accuracy</span>
        <span class="value">{{ results.accuracy.toFixed(0) }}%</span>
      </div>
      <div class="stat">
        <span class="label">Correct</span>
        <span class="value">{{ results.correct }} / {{ results.trialsCompleted }}</span>
      </div>
      <div class="stat">
        <span class="label">Wrong</span>
        <span class="value" :class="{ wrong: results.wrong > 0 }">{{ results.wrong }}</span>
      </div>
      <div class="stat">
        <span class="label">Median RT</span>
        <span class="value">{{ formatRT(results.medianRT) }}</span>
      </div>
      <div class="stat">
        <span class="label">Average RT</span>
        <span class="value">{{ formatRT(results.avgRT) }}</span>
      </div>
    </div>

    <div class="best-compare">
      <div>
        <h3>Best Score</h3>
        <p>{{ best.bestScore ? best.bestScore.score.toLocaleString() : '—' }}</p>
      </div>
      <div>
        <h3>Best Accuracy</h3>
        <p>{{ best.bestAccuracy ? best.bestAccuracy.accuracy.toFixed(0) + '%' : '—' }}</p>
      </div>
    </div>

    <div class="actions">
      <button class="primary" @click="$emit('replay')">Play Again</button>
      <button class="secondary" @click="$emit('menu')">Back to Menu</button>
    </div>

    <button class="history-link" @click="$emit('history', { difficultyKey, mode })">
      View History
    </button>
  </div>
</template>

<script setup>
import { MENTALROTATION_DIFFICULTIES } from '../../constants/mentalrotation/difficulties.js'
import { useMentalRotationStats } from '../../composables/mentalrotation/useMentalRotationStats.js'

const props = defineProps({
  results: { type: Object, required: true },
  difficultyKey: { type: String, required: true },
  mode: { type: String, default: 'timed' },
})
defineEmits(['replay', 'menu', 'history'])

const { getStats } = useMentalRotationStats()

const best = getStats(props.difficultyKey, props.mode)
const difficultyLabel = MENTALROTATION_DIFFICULTIES[props.difficultyKey]?.label

function formatRT(ms) {
  return ms > 0 ? `${Math.round(ms)} ms` : '—'
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
  margin-bottom: 1.5rem;
  text-transform: capitalize;
}

.new-best-banner {
  background: var(--accent);
  color: #10121a;
  font-weight: 700;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  display: inline-block;
  margin-bottom: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat {
  background: var(--surface);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.label {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.value {
  font-size: 1.4rem;
  font-weight: 700;
}

.value.wrong {
  color: var(--wrong);
}

.best-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  background: var(--surface-2);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.best-compare h3 {
  margin: 0 0 0.25rem;
  font-size: 0.85rem;
  color: var(--text-dim);
}

.best-compare p {
  margin: 0;
  font-weight: 700;
}

.actions {
  display: flex;
  gap: 1rem;
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
