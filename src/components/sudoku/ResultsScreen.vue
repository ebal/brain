<template>
  <div class="results">
    <h1>Puzzle Complete</h1>
    <p class="difficulty-name">{{ difficultyLabel }}</p>

    <div v-if="isNewBest" class="new-best-banner">New Best!</div>

    <div class="stats-grid">
      <div class="stat">
        <span class="label">Time</span>
        <span class="value">{{ formatTime(results.completionTime) }}</span>
      </div>
      <div class="stat">
        <span class="label">Mistakes</span>
        <span class="value" :class="{ wrong: results.mistakes > 0 }">{{ results.mistakes }}</span>
      </div>
      <div class="stat">
        <span class="label">Hints</span>
        <span class="value">{{ results.hints }}</span>
      </div>
      <div class="stat">
        <span class="label">Clean Solve</span>
        <span class="value" :class="{ correct: results.cleanSolve }">{{ results.cleanSolve ? 'Yes' : 'No' }}</span>
      </div>
    </div>

    <div class="best-compare">
      <div>
        <h3>Best (clean)</h3>
        <p>{{ best ? formatTime(best.time) : '—' }}</p>
      </div>
      <div>
        <h3>Average</h3>
        <p>{{ derived.completed > 0 ? formatTime(derived.avgTime) : '—' }}</p>
      </div>
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
import { SUDOKU_DIFFICULTIES } from '../../constants/sudoku/difficulties.js'
import { useSudokuStats } from '../../composables/sudoku/useSudokuStats.js'

const props = defineProps({
  results: { type: Object, required: true },
  difficultyKey: { type: String, required: true },
})
defineEmits(['replay', 'menu', 'history'])

const { getStats, getDerivedStats } = useSudokuStats()

const isNewBest = props.results.isNewCleanBest === true
const best = getStats(props.difficultyKey).bestCleanTime
const derived = getDerivedStats(props.difficultyKey)
const difficultyLabel = SUDOKU_DIFFICULTIES[props.difficultyKey]?.label

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
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

.value.correct {
  color: var(--correct);
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
