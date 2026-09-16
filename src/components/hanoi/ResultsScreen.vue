<template>
  <div class="results">
    <h1>Level Complete</h1>
    <p class="level-name">Level {{ results.level }} &middot; {{ results.disks }} disks</p>

    <div class="stars-display">{{ '★'.repeat(results.stars) }}{{ '☆'.repeat(3 - results.stars) }}</div>

    <div v-if="newBestLabel" class="new-best-banner">{{ newBestLabel }}</div>

    <div class="stats-grid">
      <div class="stat">
        <span class="label">Moves</span>
        <span class="value">{{ results.moves }}</span>
      </div>
      <div class="stat">
        <span class="label">Optimal</span>
        <span class="value">{{ results.optimalMoves }}</span>
      </div>
      <div class="stat">
        <span class="label">Efficiency</span>
        <span class="value">{{ results.efficiency.toFixed(0) }}%</span>
      </div>
      <div class="stat">
        <span class="label">Time</span>
        <span class="value">{{ formatTime(results.duration) }}</span>
      </div>
      <div class="stat">
        <span class="label">Mistakes</span>
        <span class="value" :class="{ wrong: results.mistakes > 0 }">{{ results.mistakes }}</span>
      </div>
      <div class="stat">
        <span class="label">Undos</span>
        <span class="value">{{ results.undos }}</span>
      </div>
      <div class="stat">
        <span class="label">Hints</span>
        <span class="value">{{ results.hints }}</span>
      </div>
      <div class="stat">
        <span class="label">Best Moves</span>
        <span class="value">{{ best?.moves ?? '—' }}</span>
      </div>
    </div>

    <div class="actions">
      <button v-if="hasNextLevel" class="primary" @click="$emit('next', results.level + 1)">Next Level</button>
      <button class="secondary" @click="$emit('replay', results.level)">Play Again</button>
    </div>
    <button class="menu-link" @click="$emit('menu')">Back to Levels</button>

    <button class="history-link" @click="$emit('history', { level: results.level })">View History</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { HANOI_LEVELS } from '../../constants/hanoi/levels.js'
import { useHanoiStats } from '../../composables/hanoi/useHanoiStats.js'

const props = defineProps({
  results: { type: Object, required: true },
})
defineEmits(['next', 'replay', 'menu', 'history'])

const { recordCompletion, getStats } = useHanoiStats()
const { isNewBest, isNewBestClean } = recordCompletion(props.results.level, props.results)

const stats = getStats(props.results.level)
const best = stats.best
const hasNextLevel = computed(() => props.results.level < HANOI_LEVELS.length)

const newBestLabel = isNewBest && isNewBestClean
  ? 'New Best (Clean)!'
  : isNewBest
    ? 'New Best!'
    : null

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

.level-name {
  color: var(--text-dim);
  margin-top: -0.5rem;
  margin-bottom: 0.75rem;
}

.stars-display {
  font-size: 2rem;
  color: var(--accent);
  letter-spacing: 0.15em;
  margin-bottom: 1rem;
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

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
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
  margin-bottom: 1rem;
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

.menu-link {
  display: block;
  margin: 0 auto;
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: underline;
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

.menu-link:hover,
.history-link:hover {
  color: var(--accent);
}
</style>
