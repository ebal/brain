<template>
  <div class="results">
    <h1>{{ results.isPractice ? 'Practice Complete' : `Level ${results.level} Complete` }}</h1>

    <div class="stars-display">{{ '★'.repeat(results.stars) }}{{ '☆'.repeat(3 - results.stars) }}</div>

    <div v-if="isNewBest" class="new-best-banner">New Best!</div>

    <div class="stats-grid">
      <div class="stat">
        <span class="label">Correct</span>
        <span class="value">{{ results.correctCount }} / {{ results.totalCount }}</span>
      </div>
      <div class="stat">
        <span class="label">Accuracy</span>
        <span class="value">{{ results.accuracy.toFixed(0) }}%</span>
      </div>
      <div class="stat">
        <span class="label">Best Streak</span>
        <span class="value">{{ results.bestStreak }}</span>
      </div>
      <div class="stat">
        <span class="label">Time</span>
        <span class="value">{{ formatTime(results.duration) }}</span>
      </div>
    </div>

    <template v-if="missedCountries.length > 0">
      <h2 class="section-title">Needs Practice</h2>
      <div class="missed-list">
        <div v-for="c in missedCountries" :key="c.code" class="missed-row">
          <img :src="`/flags/${c.code}.svg`" :alt="c.name" class="missed-flag" />
          <span>{{ c.name }}</span>
        </div>
      </div>
    </template>

    <div v-if="!results.isPractice && best" class="best-card">
      <span class="label">Best</span>
      <span class="value">{{ best.correctCount }} / {{ results.totalCount }} &middot; {{ '★'.repeat(best.stars) }}</span>
    </div>

    <div class="actions">
      <button v-if="!results.isPractice && hasNextLevel" class="primary" @click="$emit('next', results.level + 1)">Next Level</button>
      <button
        class="secondary"
        @click="results.isPractice ? $emit('practiceWeak') : $emit('replay', results.level)"
      >
        Play Again
      </button>
    </div>
    <button class="menu-link" @click="$emit('menu')">Back to Levels</button>
    <button v-if="!results.isPractice" class="history-link" @click="$emit('history', { level: results.level })">View History</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { FLAGS_LEVELS } from '../../constants/flags/levels.js'
import { useFlagsStats } from '../../composables/flags/useFlagsStats.js'
import { getCountry } from '../../composables/flags/dataset.js'

const props = defineProps({
  results: { type: Object, required: true },
})
defineEmits(['next', 'replay', 'practiceWeak', 'menu', 'history'])

const { recordCompletion, getStats } = useFlagsStats()
const { isNewBest } = recordCompletion(props.results.level, props.results)

const hasNextLevel = computed(() => props.results.level != null && props.results.level < FLAGS_LEVELS.length)
const best = computed(() => (props.results.level != null ? getStats(props.results.level).best : null))
const missedCountries = computed(() => (props.results.missedCodes ?? []).map(getCountry).filter(Boolean))

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
  margin-bottom: 1.25rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
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

.section-title {
  text-align: left;
  font-size: 0.95rem;
  color: var(--text-dim);
  margin: 1.25rem 0 0.6rem;
}

.missed-list {
  background: var(--surface);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.missed-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  text-align: left;
}

.missed-row:not(:last-child) {
  border-bottom: 1px solid var(--surface-2);
}

.missed-flag {
  width: 32px;
  height: 22px;
  object-fit: contain;
  background: var(--stimulus-bg);
  border-radius: 4px;
  flex-shrink: 0;
}

.best-card {
  background: var(--surface);
  border: 1px solid var(--accent);
  border-radius: 12px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1.25rem;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
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

.menu-link,
.history-link {
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
  margin-top: 1rem;
}

.menu-link:hover,
.history-link:hover {
  color: var(--accent);
}
</style>
