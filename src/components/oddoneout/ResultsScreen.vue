<template>
  <div class="results">
    <h1>{{ results.timedOut ? 'Time!' : 'Round Complete' }}</h1>
    <p class="difficulty-name">
      {{ difficultyLabel }}
      <template v-if="untimed"> · Untimed</template>
      <template v-if="colorMode"> · Random Color</template>
    </p>

    <div v-if="newBestLabel" class="new-best-banner">{{ newBestLabel }}</div>

    <div class="score-card">
      <span class="label">Score</span>
      <span class="value">{{ results.score }}</span>
    </div>

    <h2 class="section-title">Game</h2>
    <div class="stats-grid">
      <div class="stat">
        <span class="label">Personal Best Score</span>
        <span class="value">{{ bestScore?.score ?? '—' }}</span>
      </div>
      <div class="stat">
        <span class="label">Best Accuracy</span>
        <span class="value">{{ bestAccuracy ? `${bestAccuracy.accuracy.toFixed(1)}%` : '—' }}</span>
      </div>
    </div>

    <h2 class="section-title">Performance</h2>
    <div class="stats-grid">
      <div class="stat">
        <span class="label">Trials</span>
        <span class="value">{{ results.trials }}</span>
      </div>
      <div class="stat">
        <span class="label">Correct</span>
        <span class="value">{{ results.correct }}</span>
      </div>
      <div class="stat">
        <span class="label">Wrong</span>
        <span class="value" :class="{ wrong: results.wrong > 0 }">{{ results.wrong }}</span>
      </div>
      <div class="stat">
        <span class="label">Accuracy</span>
        <span class="value">{{ results.accuracy.toFixed(1) }}%</span>
      </div>
      <div class="stat">
        <span class="label">Median Correct RT</span>
        <span class="value">{{ (results.medianCorrectRT / 1000).toFixed(2) }}s</span>
      </div>
      <div class="stat">
        <span class="label">Average Correct RT</span>
        <span class="value">{{ (results.avgCorrectRT / 1000).toFixed(2) }}s</span>
      </div>
      <div class="stat">
        <span class="label">Fastest Correct RT</span>
        <span class="value">{{ (results.fastestCorrectRT / 1000).toFixed(2) }}s</span>
      </div>
      <div class="stat">
        <span class="label">Slowest Correct RT</span>
        <span class="value">{{ (results.slowestCorrectRT / 1000).toFixed(2) }}s</span>
      </div>
    </div>

    <div class="actions">
      <button class="primary" @click="$emit('replay')">Play Again</button>
      <button class="secondary" @click="$emit('menu')">Back to Menu</button>
    </div>

    <button class="history-link" @click="$emit('history', { difficultyKey, colorMode, untimed })">View History</button>
  </div>
</template>

<script setup>
import { ODDONEOUT_DIFFICULTIES } from '../../constants/oddoneout/difficulties.js'
import { variantKeyFor } from '../../constants/oddoneout/variants.js'
import { useOddOneOutStats } from '../../composables/oddoneout/useOddOneOutStats.js'

const props = defineProps({
  results: { type: Object, required: true },
  difficultyKey: { type: String, required: true },
  colorMode: { type: Boolean, default: false },
  untimed: { type: Boolean, default: false },
})
defineEmits(['replay', 'menu', 'history'])

const variantKey = variantKeyFor(props.colorMode, props.untimed)
const { recordCompletion, getStats } = useOddOneOutStats()
const { isNewBestScore, isNewBestAccuracy, isNewBestTrialCount, isNewBestMedianRT } =
  recordCompletion(props.difficultyKey, props.results, variantKey)

const stats = getStats(props.difficultyKey, variantKey)
const bestScore = stats.bestScore
const bestAccuracy = stats.bestAccuracy
const difficultyLabel = ODDONEOUT_DIFFICULTIES[props.difficultyKey]?.label

const newBestParts = [
  isNewBestScore && 'Score',
  isNewBestAccuracy && 'Accuracy',
  isNewBestTrialCount && 'Trial Count',
  isNewBestMedianRT && 'Median RT',
].filter(Boolean)
const newBestLabel = newBestParts.length ? `New Best ${newBestParts.join(' & ')}!` : null
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
