<template>
  <div class="results">
    <h1>Round Complete</h1>
    <p class="difficulty-name">{{ difficultyLabel }} · {{ modeLabel }}</p>

    <div v-if="isNewBest" class="new-best-banner">New Best Score!</div>

    <div class="stats-grid">
      <div class="stat">
        <span class="label">Total Score</span>
        <span class="value">{{ results.score }}</span>
      </div>
      <div class="stat">
        <span class="label">Correct</span>
        <span class="value correct">{{ results.correct }}</span>
      </div>
      <div class="stat">
        <span class="label">Wrong</span>
        <span class="value wrong">{{ results.wrong }}</span>
      </div>
      <div class="stat">
        <span class="label">Accuracy Rate</span>
        <span class="value">{{ results.accuracy.toFixed(1) }}%</span>
      </div>
      <div class="stat">
        <span class="label">Avg Response Time</span>
        <span class="value">{{ (results.avgResponseTime / 1000).toFixed(2) }}s</span>
      </div>
      <div class="stat">
        <span class="label">Median Response Time</span>
        <span class="value">{{ (results.medianResponseTime / 1000).toFixed(2) }}s</span>
      </div>
      <div class="stat">
        <span class="label">Interference (Stroop effect)</span>
        <span class="value" v-if="results.interference !== null">{{ (results.interference / 1000).toFixed(2) }}s</span>
        <span class="value value--muted" v-else>Not enough trials</span>
      </div>
    </div>

    <div class="best-compare" v-if="best">
      <h3>Personal Best · {{ difficultyLabel }} · {{ modeLabel }}</h3>
      <p>{{ best.score }} pts &middot; {{ best.accuracy.toFixed(1) }}% accuracy</p>
    </div>

    <div class="actions">
      <button class="primary" @click="$emit('replay')">Play Again</button>
      <button class="secondary" @click="$emit('menu')">Back to Menu</button>
    </div>

    <button class="history-link" @click="$emit('history', { mode, difficultyKey })">
      View Score History
    </button>
  </div>
</template>

<script setup>
import { DIFFICULTIES, MODES } from '../constants/colors.js'
import { useBestScores } from '../composables/useBestScores.js'
import { useScoreHistory } from '../composables/useScoreHistory.js'

const props = defineProps({
  results: { type: Object, required: true },
  difficultyKey: { type: String, required: true },
  mode: { type: String, default: 'color' },
})
defineEmits(['replay', 'menu', 'history'])

const { submitScore, getBest } = useBestScores()
const { addEntry } = useScoreHistory()
const { isNewBest } = submitScore(props.mode, props.difficultyKey, props.results)
addEntry(props.mode, props.difficultyKey, props.results)
const best = getBest(props.mode, props.difficultyKey)
const difficultyLabel = DIFFICULTIES[props.difficultyKey].label
const modeLabel = MODES[props.mode].label
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

.value.correct {
  color: var(--correct);
}

.value.wrong {
  color: var(--wrong);
}

.value--muted {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-dim);
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
}

.best-compare p {
  margin: 0;
  color: var(--text-dim);
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
