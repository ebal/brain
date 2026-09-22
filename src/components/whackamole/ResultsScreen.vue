<template>
  <div class="results">
    <h1>Level Complete</h1>
    <p class="level-name">Level {{ results.level }} &middot; {{ results.gridSize }}×{{ results.gridSize }}</p>

    <div class="stars-display">{{ '★'.repeat(results.stars) }}{{ '☆'.repeat(3 - results.stars) }}</div>

    <div v-if="isNewBest" class="new-best-banner">New Best!</div>

    <div class="score-card">
      <span class="label">Score</span>
      <span class="value">{{ results.score }}</span>
    </div>

    <h2 class="section-title">Outcomes</h2>
    <div class="stats-grid">
      <div class="stat">
        <span class="label">Hits</span>
        <span class="value">{{ results.hits }} / {{ results.targets }}</span>
      </div>
      <div class="stat">
        <span class="label">Misses</span>
        <span class="value">{{ results.misses }}</span>
      </div>
      <div class="stat" v-if="results.distractors > 0">
        <span class="label">False Alarms</span>
        <span class="value" :class="{ wrong: results.falseAlarms > 0 }">{{ results.falseAlarms }}</span>
      </div>
      <div class="stat" v-if="results.distractors > 0">
        <span class="label">Correct Rejections</span>
        <span class="value">{{ results.correctRejections }}</span>
      </div>
      <div class="stat">
        <span class="label">Empty Taps</span>
        <span class="value" :class="{ wrong: results.emptyTaps > 0 }">{{ results.emptyTaps }}</span>
      </div>
    </div>

    <h2 class="section-title">Rates &amp; Speed</h2>
    <div class="stats-grid">
      <div class="stat">
        <span class="label">Hit Rate</span>
        <span class="value">{{ results.hitRate.toFixed(1) }}%</span>
      </div>
      <div class="stat" v-if="results.distractors > 0">
        <span class="label">False Alarm Rate</span>
        <span class="value" :class="{ wrong: results.falseAlarmRate > 0 }">{{ results.falseAlarmRate.toFixed(1) }}%</span>
      </div>
      <div class="stat">
        <span class="label">Median Reaction</span>
        <span class="value">{{ Math.round(results.medianHitRT) }}ms</span>
      </div>
      <div class="stat">
        <span class="label">Fastest Reaction</span>
        <span class="value">{{ Math.round(results.fastestHitRT) }}ms</span>
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
import { WHACKAMOLE_LEVELS } from '../../constants/whackamole/levels.js'
import { useWhackAMoleStats } from '../../composables/whackamole/useWhackAMoleStats.js'

const props = defineProps({
  results: { type: Object, required: true },
})
defineEmits(['next', 'replay', 'menu', 'history'])

const { recordCompletion } = useWhackAMoleStats()
const { isNewBest } = recordCompletion(props.results.level, props.results)

const hasNextLevel = computed(() => props.results.level < WHACKAMOLE_LEVELS.length)
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
