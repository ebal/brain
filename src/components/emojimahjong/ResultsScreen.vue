<template>
  <div class="results">
    <h1>Level {{ results.level }} Complete</h1>

    <div class="stars-display">{{ '★'.repeat(results.stars) }}{{ '☆'.repeat(3 - results.stars) }}</div>

    <div v-if="isNewCleanBest" class="new-best-banner">New Clean Best!</div>
    <div v-else-if="isNewBest" class="new-best-banner">New Best!</div>
    <div v-if="results.clean" class="clean-badge">Clean ✓</div>

    <div class="stats-grid">
      <div class="stat">
        <span class="label">Score</span>
        <span class="value">{{ results.score.toLocaleString() }}</span>
      </div>
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
        <span class="value">{{ results.mistakes }}</span>
      </div>
      <div class="stat">
        <span class="label">Hints</span>
        <span class="value">{{ results.hints }}</span>
      </div>
      <div class="stat">
        <span class="label">Undos</span>
        <span class="value">{{ results.undos }}</span>
      </div>
    </div>

    <div class="best-compare">
      <div>
        <h3>Best Score</h3>
        <p>{{ best ? best.score.toLocaleString() : '—' }}</p>
      </div>
      <div>
        <h3>Best Time</h3>
        <p>{{ best ? formatTime(best.time) : '—' }}</p>
      </div>
    </div>

    <div class="actions">
      <button v-if="hasNextLevel" class="primary" @click="$emit('next', results.level + 1)">Next Level</button>
      <button class="secondary" @click="$emit('replay', results.level)">Play Again</button>
    </div>
    <button class="menu-link" @click="$emit('menu')">Back to Levels</button>

    <button class="history-link" @click="$emit('history', { level: results.level })">
      View History
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { EMOJIMAHJONG_LEVELS } from '../../constants/emojimahjong/levels.js'
import { useEmojiMahjongStats } from '../../composables/emojimahjong/useEmojiMahjongStats.js'

const props = defineProps({
  results: { type: Object, required: true },
})
defineEmits(['next', 'replay', 'menu', 'history'])

const { getStats } = useEmojiMahjongStats()

const isNewBest = props.results.isNewBest === true
const isNewCleanBest = props.results.isNewCleanBest === true
const best = getStats(props.results.level).best
const hasNextLevel = computed(() => props.results.level < EMOJIMAHJONG_LEVELS.length)

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
  margin-bottom: 0.75rem;
}

.clean-badge {
  background: var(--correct);
  color: #10121a;
  font-weight: 700;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  display: inline-block;
  margin-bottom: 1.5rem;
  font-size: 0.85rem;
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
