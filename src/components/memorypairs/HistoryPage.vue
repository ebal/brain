<template>
  <div class="history">
    <h1>History</h1>

    <div class="filter-toggle">
      <button
        v-for="f in filters"
        :key="f.key"
        class="filter-btn"
        :class="{ active: activeFilter === f.key }"
        @click="activeFilter = f.key"
      >
        {{ f.label }}
      </button>
    </div>

    <div v-if="entries.length === 0" class="empty">
      No completed games yet{{ activeFilter !== 'all' ? ` for ${filterLabel}` : '' }}.
    </div>

    <template v-else>
      <p class="trend-note">Score trend (higher is better)</p>
      <svg class="sparkline" viewBox="0 0 100 40" preserveAspectRatio="none">
        <polyline :points="sparklinePoints" fill="none" stroke="var(--accent)" stroke-width="2" />
      </svg>

      <div class="entry-list">
        <div v-for="(entry, i) in reversedEntries" :key="i" class="entry-row">
          <span class="entry-date">{{ formatDate(entry.completedAt) }}</span>
          <span class="entry-difficulty">{{ entry.difficulty }}</span>
          <span class="entry-score">{{ entry.score }}</span>
          <span class="entry-meta">{{ entry.moves }} mv · {{ entry.mistakes }}✕</span>
        </div>
      </div>
    </template>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { MEMORYPAIRS_DIFFICULTIES } from '../../constants/memorypairs/difficulties.js'
import { useMemoryPairsStats } from '../../composables/memorypairs/useMemoryPairsStats.js'

defineEmits(['menu'])

const { getHistory } = useMemoryPairsStats()

const filters = [
  { key: 'all', label: 'All' },
  ...Object.values(MEMORYPAIRS_DIFFICULTIES).map((d) => ({ key: d.key, label: d.label })),
]
const activeFilter = ref('all')
const filterLabel = computed(() => filters.find((f) => f.key === activeFilter.value)?.label)

const entries = computed(() => getHistory(activeFilter.value))
const reversedEntries = computed(() => [...entries.value].reverse())

const sparklinePoints = computed(() => {
  const scores = entries.value.map((e) => e.score)
  if (scores.length === 0) return ''
  const max = Math.max(...scores)
  const min = Math.min(...scores)
  const range = max - min || 1
  const step = scores.length > 1 ? 100 / (scores.length - 1) : 0
  // Higher score is better, so plot it higher on the sparkline.
  return scores.map((s, i) => `${i * step},${36 - ((s - min) / range) * 32}`).join(' ')
})

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.history {
  max-width: 640px;
  width: 100%;
}

h1 {
  text-align: center;
  margin-bottom: 1rem;
}

.filter-toggle {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
  margin-bottom: 1.5rem;
}

.filter-btn {
  background: var(--surface);
  border: 1px solid var(--surface-2);
  color: var(--text-dim);
  padding: 0.6rem 0.25rem;
  border-radius: 9px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.filter-btn.active {
  border-color: var(--accent);
  color: var(--text);
}

.empty {
  background: var(--surface);
  border-radius: 12px;
  padding: 2rem 1rem;
  text-align: center;
  color: var(--text-dim);
}

.trend-note {
  margin: 0.5rem 0 0.35rem;
  font-size: 0.8rem;
  color: var(--text-dim);
  text-align: center;
}

.sparkline {
  width: 100%;
  height: 80px;
  background: var(--surface);
  border-radius: 12px;
  margin-bottom: 1rem;
}

.entry-list {
  background: var(--surface);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  max-height: 360px;
  overflow-y: auto;
}

.entry-row {
  display: grid;
  grid-template-columns: 1.3fr 0.9fr 0.7fr 1fr;
  padding: 0.6rem 1rem;
  font-size: 0.85rem;
  gap: 0.5rem;
  align-items: center;
}

.entry-row:not(:last-child) {
  border-bottom: 1px solid var(--surface-2);
}

.entry-date {
  color: var(--text-dim);
}

.entry-difficulty {
  text-transform: capitalize;
}

.entry-score {
  font-weight: 700;
}

.entry-meta {
  font-size: 0.78rem;
  color: var(--text-dim);
}

.back-btn {
  display: block;
  margin: 0 auto;
  background: var(--accent);
  color: #10121a;
  border: none;
  border-radius: 10px;
  padding: 0.85rem 1.5rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 420px) {
  .entry-row {
    grid-template-columns: 1.1fr 0.8fr 0.6fr 0.9fr;
    font-size: 0.75rem;
  }
}
</style>
