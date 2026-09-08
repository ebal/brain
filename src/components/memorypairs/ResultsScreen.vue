<template>
  <div class="results">
    <h1>Board Complete!</h1>
    <p class="difficulty-name">{{ difficultyLabel }}</p>

    <div v-if="newBestLabel" class="new-best-banner">{{ newBestLabel }}</div>

    <div class="score-card">
      <span class="label">Score</span>
      <span class="value">{{ results.score }}</span>
    </div>

    <h2 class="section-title">Game</h2>
    <div class="stats-grid">
      <div class="stat">
        <span class="label">Pairs</span>
        <span class="value">{{ results.pairsFound }} / {{ results.totalPairs }}</span>
      </div>
      <div class="stat">
        <span class="label">Best Score</span>
        <span class="value">{{ bestScore?.score ?? '—' }}</span>
      </div>
    </div>

    <h2 class="section-title">Performance</h2>
    <div class="stats-grid">
      <div class="stat">
        <span class="label">Time</span>
        <span class="value">{{ formatTime(results.completionTime) }}</span>
      </div>
      <div class="stat">
        <span class="label">Moves</span>
        <span class="value">{{ results.moves }}</span>
      </div>
      <div class="stat">
        <span class="label">Mistakes</span>
        <span class="value" :class="{ wrong: results.mistakes > 0 }">{{ results.mistakes }}</span>
      </div>
      <div class="stat">
        <span class="label">Move Efficiency</span>
        <span class="value">{{ results.moveEfficiency.toFixed(1) }}%</span>
      </div>
      <div class="stat">
        <span class="label">Best Time</span>
        <span class="value">{{ bestCompletionTime ? formatTime(bestCompletionTime.completionTime) : '—' }}</span>
      </div>
      <div class="stat">
        <span class="label">Best Efficiency</span>
        <span class="value">{{ bestMoveEfficiency ? bestMoveEfficiency.moveEfficiency.toFixed(1) + '%' : '—' }}</span>
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
import { getDifficultyConfig } from '../../constants/memorypairs/difficulties.js'
import { useMemoryPairsStats } from '../../composables/memorypairs/useMemoryPairsStats.js'

const props = defineProps({
  results: { type: Object, required: true },
  difficultyKey: { type: String, required: true },
})
defineEmits(['replay', 'menu', 'history'])

const { recordCompletion, getStats } = useMemoryPairsStats()
const { isNewBestScore, isNewBestCompletionTime, isNewBestMoveEfficiency } = recordCompletion(props.difficultyKey, props.results)

const stats = getStats(props.difficultyKey)
const bestScore = stats.bestScore
const bestCompletionTime = stats.bestCompletionTime
const bestMoveEfficiency = stats.bestMoveEfficiency
const difficultyLabel = getDifficultyConfig(props.difficultyKey)?.label

const newBests = [
  isNewBestScore && 'Score',
  isNewBestCompletionTime && 'Time',
  isNewBestMoveEfficiency && 'Efficiency',
].filter(Boolean)
const newBestLabel = newBests.length ? `New Best ${newBests.join(' & ')}!` : null

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
