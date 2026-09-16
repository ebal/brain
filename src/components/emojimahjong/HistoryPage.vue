<template>
  <div class="history">
    <h1>History</h1>

    <!-- 50 levels don't fit a button row — a plain select is the simplest
         usable picker at this count (same choice as lightsout/HistoryPage.vue). -->
    <select class="level-select" v-model.number="activeLevel">
      <option v-for="lvl in levels" :key="lvl.level" :value="lvl.level">Level {{ lvl.level }}</option>
    </select>

    <div v-if="entries.length === 0" class="empty">No completed attempts yet for Level {{ activeLevel }}.</div>

    <template v-else>
      <div class="summary">
        <div class="summary-stat">
          <span class="label">Attempts</span>
          <span class="value">{{ entries.length }}</span>
        </div>
        <div class="summary-stat">
          <span class="label">Best Score</span>
          <span class="value">{{ best?.score.toLocaleString() ?? '—' }}</span>
        </div>
        <div class="summary-stat">
          <span class="label">Best Stars</span>
          <span class="value">{{ best ? '★'.repeat(best.stars) : '—' }}</span>
        </div>
      </div>

      <p class="trend-note">Score trend (higher is better)</p>
      <svg class="sparkline" viewBox="0 0 100 40" preserveAspectRatio="none">
        <polyline :points="sparklinePoints" fill="none" stroke="var(--accent)" stroke-width="2" />
      </svg>

      <div class="entry-list">
        <div v-for="(entry, i) in reversedEntries" :key="i" class="entry-row">
          <span class="entry-date">{{ formatDate(entry.completedAt) }}</span>
          <span class="entry-score">{{ entry.score.toLocaleString() }}</span>
          <span class="entry-meta">
            {{ '★'.repeat(entry.stars) }}{{ '☆'.repeat(3 - entry.stars) }} · {{ formatTime(entry.completionTime) }}
            <span v-if="entry.clean" class="clean-badge">clean</span>
          </span>
        </div>
      </div>
    </template>

    <button class="back-btn" @click="$emit('menu')">Back to Levels</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { EMOJIMAHJONG_LEVELS } from '../../constants/emojimahjong/levels.js'
import { useEmojiMahjongStats } from '../../composables/emojimahjong/useEmojiMahjongStats.js'

const props = defineProps({
  initialLevel: { type: Number, default: 1 },
})
defineEmits(['menu'])

const levels = EMOJIMAHJONG_LEVELS
const { getHistory, getStats } = useEmojiMahjongStats()

const activeLevel = ref(props.initialLevel)

const entries = computed(() => getHistory(activeLevel.value))
const reversedEntries = computed(() => [...entries.value].reverse())
const best = computed(() => getStats(activeLevel.value).best)

const sparklinePoints = computed(() => {
  const values = entries.value.map((e) => e.score)
  if (values.length === 0) return ''
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const step = values.length > 1 ? 100 / (values.length - 1) : 0
  return values.map((v, i) => `${i * step},${36 - ((v - min) / range) * 32}`).join(' ')
})

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

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

.level-select {
  display: block;
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--surface-2);
  color: var(--text);
  padding: 0.7rem;
  border-radius: 10px;
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
}

.empty {
  background: var(--surface);
  border-radius: 12px;
  padding: 2rem 1rem;
  text-align: center;
  color: var(--text-dim);
}

.summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.summary-stat {
  background: var(--surface);
  border-radius: 12px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-align: center;
}

.summary-stat .label {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.summary-stat .value {
  font-size: 1.15rem;
  font-weight: 700;
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
  grid-template-columns: 1.2fr 0.9fr 1.6fr;
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

.entry-score {
  font-weight: 700;
}

.entry-meta {
  font-size: 0.78rem;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.clean-badge {
  background: var(--correct);
  color: #10121a;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
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
    grid-template-columns: 1.1fr 0.8fr 1.4fr;
    font-size: 0.75rem;
  }
}
</style>
