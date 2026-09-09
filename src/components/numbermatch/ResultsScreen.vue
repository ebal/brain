<template>
  <div class="results">
    <h1>{{ results.cleared ? 'Board Cleared!' : 'No More Matches' }}</h1>
    <p class="difficulty-name">{{ difficultyLabel }}</p>

    <div v-if="isNewBestScore" class="new-best-banner">New Best Score!</div>
    <div v-if="results.clean" class="clean-badge">Clean ✓</div>

    <div v-if="!results.cleared" class="remaining-callout">
      <span class="label">Numbers Remaining</span>
      <span class="value">{{ results.numbersRemaining }}</span>
    </div>

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
        <span class="label">Add Numbers</span>
        <span class="value">{{ results.addNumbersUsed }}</span>
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
        <p>{{ best.bestScore ? best.bestScore.score.toLocaleString() : '—' }}</p>
      </div>
      <div>
        <h3>Best Clear Time</h3>
        <p>{{ best.bestClearTime ? formatTime(best.bestClearTime.completionTime) : '—' }}</p>
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
import { NUMBERMATCH_DIFFICULTIES } from '../../constants/numbermatch/difficulties.js'
import { useNumberMatchStats } from '../../composables/numbermatch/useNumberMatchStats.js'

const props = defineProps({
  results: { type: Object, required: true },
  difficultyKey: { type: String, required: true },
})
defineEmits(['replay', 'menu', 'history'])

const { getStats } = useNumberMatchStats()

const isNewBestScore = props.results.isNewBestScore === true
const best = getStats(props.difficultyKey)
const difficultyLabel = Object.values(NUMBERMATCH_DIFFICULTIES).find((d) => d.key === props.difficultyKey)?.label

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

.remaining-callout {
  background: var(--surface);
  border: 1px solid var(--wrong);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.remaining-callout .label {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.remaining-callout .value {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--wrong);
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
