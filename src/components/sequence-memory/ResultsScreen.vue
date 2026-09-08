<template>
  <div class="results">
    <h1>Game Over</h1>
    <p class="difficulty-name">{{ difficultyLabel }}</p>

    <div v-if="isNewBest" class="new-best-banner">New Best!</div>

    <div class="primary-stat">
      <span class="label">Longest Sequence</span>
      <span class="value">{{ results.longestSequence }}</span>
    </div>

    <div class="stats-grid">
      <div class="stat">
        <span class="label">Highest Level</span>
        <span class="value">{{ results.highestLevel }}</span>
      </div>
      <div class="stat">
        <span class="label">Correct Taps</span>
        <span class="value">{{ results.correctTaps }}</span>
      </div>
      <div class="stat">
        <span class="label">Mistakes</span>
        <span class="value" :class="{ wrong: results.mistakes > 0 }">{{ results.mistakes }}</span>
      </div>
      <div class="stat">
        <span class="label">Accuracy</span>
        <span class="value">{{ results.accuracy.toFixed(1) }}%</span>
      </div>
      <div class="stat">
        <span class="label">Avg Tap Time</span>
        <span class="value">{{ Math.round(results.avgTapTime) }}ms</span>
      </div>
      <div class="stat">
        <span class="label">Median Tap Time</span>
        <span class="value">{{ Math.round(results.medianTapTime) }}ms</span>
      </div>
    </div>

    <div class="best-compare" v-if="best">
      <h3>Best Sequence</h3>
      <p>{{ best.longestSequence }}</p>
    </div>

    <div class="actions">
      <button class="primary" @click="$emit('replay')">Play Again</button>
      <button class="secondary" @click="$emit('menu')">Back to Menu</button>
    </div>

    <button class="history-link" @click="$emit('history', { difficultyKey })">
      View History
    </button>
  </div>
</template>

<script setup>
import { SEQUENCE_DIFFICULTIES } from '../../constants/sequence-memory/difficulties.js'
import { useMemoryStats } from '../../composables/sequence-memory/useMemoryStats.js'

const props = defineProps({
  results: { type: Object, required: true },
  difficultyKey: { type: String, required: true },
})
defineEmits(['replay', 'menu', 'history'])

const { getStats } = useMemoryStats()

const isNewBest = props.results.isNewBest === true
const best = getStats(props.difficultyKey).bestResult
const difficultyLabel = SEQUENCE_DIFFICULTIES[props.difficultyKey]?.label
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

.primary-stat {
  background: var(--surface);
  border: 1px solid var(--accent);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.primary-stat .value {
  font-size: 2.25rem;
  font-weight: 800;
  color: var(--accent);
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
  background: var(--surface-2);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.best-compare h3 {
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
  color: var(--text-dim);
}

.best-compare p {
  margin: 0;
  font-weight: 700;
  font-size: 1.3rem;
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
