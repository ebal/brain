<template>
  <div class="results">
    <h1>Table Complete</h1>
    <p class="difficulty-name">
      {{ difficultyLabel }} · {{ difficulty.gridSize }}×{{ difficulty.gridSize }}
      <template v-if="variantLabel"> · {{ variantLabel }}</template>
    </p>

    <div v-if="isNewBest" class="new-best-banner">New Best Time!</div>

    <div class="completion-time">
      <span class="label">Completion Time</span>
      <span class="value">{{ (results.completionTime / 1000).toFixed(2) }}s</span>
    </div>

    <div class="stats-grid">
      <div class="stat">
        <span class="label">Errors</span>
        <span class="value" :class="{ wrong: results.errors > 0 }">{{ results.errors }}</span>
      </div>
      <div class="stat">
        <span class="label">Accuracy</span>
        <span class="value">{{ results.accuracy.toFixed(1) }}%</span>
      </div>
      <div class="stat">
        <span class="label">Avg Search Time</span>
        <span class="value">{{ Math.round(results.avgSearchTime) }}ms</span>
      </div>
      <div class="stat">
        <span class="label">Median Search Time</span>
        <span class="value">{{ Math.round(results.medianSearchTime) }}ms</span>
      </div>
      <div class="stat">
        <span class="label">Fastest Search</span>
        <span class="value">{{ Math.round(results.fastestSearch) }}ms</span>
      </div>
      <div class="stat">
        <span class="label">Slowest Search</span>
        <span class="value">{{ Math.round(results.slowestSearch) }}ms</span>
      </div>
    </div>

    <div class="best-compare" v-if="best">
      <h3>Personal Best (zero-error) · {{ difficultyLabel }}<template v-if="variantLabel"> · {{ variantLabel }}</template></h3>
      <p>{{ (best.completionTime / 1000).toFixed(2) }}s</p>
    </div>
    <div class="best-compare" v-else-if="results.errors > 0">
      <p class="no-best-note">No personal best yet — bests require a zero-error round.</p>
    </div>

    <div class="best-compare" v-if="previous">
      <h3>Previous Round · {{ difficultyLabel }}<template v-if="variantLabel"> · {{ variantLabel }}</template></h3>
      <p>{{ (previous.completionTime / 1000).toFixed(2) }}s</p>
    </div>

    <div class="actions">
      <button class="primary" @click="$emit('replay')">Play Again</button>
      <button class="secondary" @click="$emit('menu')">Back to Menu</button>
    </div>

    <button class="history-link" @click="$emit('history', { difficultyKey, colorMode, dynamicMode })">
      View Score History →
    </button>
  </div>
</template>

<script setup>
import { SCHULTE_DIFFICULTIES } from '../../constants/schulte/difficulties.js'
import { variantKeyFor } from '../../constants/schulte/variants.js'
import { useBestTimes } from '../../composables/schulte/useBestTimes.js'
import { useScoreHistory } from '../../composables/schulte/useScoreHistory.js'

const props = defineProps({
  results: { type: Object, required: true },
  difficultyKey: { type: String, required: true },
  colorMode: { type: Boolean, default: false },
  dynamicMode: { type: Boolean, default: false },
})
defineEmits(['replay', 'menu', 'history'])

const variantKey = variantKeyFor(props.colorMode, props.dynamicMode)
const variantLabel = props.colorMode && props.dynamicMode
  ? 'Random Color + Position'
  : props.colorMode
    ? 'Random Color'
    : props.dynamicMode
      ? 'Random Position'
      : null

const { submitTime, getBest } = useBestTimes()
const { addEntry } = useScoreHistory()
const { isNewBest } = submitTime(props.difficultyKey, props.results, variantKey)
const previous = addEntry(props.difficultyKey, props.results, variantKey)
const best = getBest(props.difficultyKey, variantKey)
const difficulty = Object.values(SCHULTE_DIFFICULTIES).find((d) => d.key === props.difficultyKey)
const difficultyLabel = difficulty.label
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

.completion-time {
  background: var(--surface);
  border: 1px solid var(--accent);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.completion-time .value {
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
  margin-bottom: 1rem;
}

.best-compare h3 {
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
}

.best-compare p {
  margin: 0;
  color: var(--text-dim);
}

.no-best-note {
  color: var(--text-dim);
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
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
