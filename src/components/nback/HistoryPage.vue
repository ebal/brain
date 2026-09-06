<template>
  <div class="history">
    <h1>Score History</h1>

    <div class="difficulty-toggle">
      <button
        v-for="d in difficulties"
        :key="d.key"
        class="diff-btn"
        :class="{ active: activeDifficulty === d.key }"
        @click="activeDifficulty = d.key"
      >
        {{ d.n }}-Back
      </button>
    </div>

    <div v-if="history.length === 0" class="empty">
      No rounds played yet for {{ difficultyLabel }}.
    </div>

    <template v-else>
      <div class="summary">
        <div class="summary-stat">
          <span class="label">Best</span>
          <span class="value">{{ best ? best.score : '—' }}</span>
        </div>
        <div class="summary-stat">
          <span class="label">Latest</span>
          <span class="value">{{ latest.score }}</span>
        </div>
        <div class="summary-stat">
          <span class="label">Accuracy</span>
          <span class="value">{{ latest.accuracy.toFixed(0) }}%</span>
        </div>
      </div>

      <div class="summary">
        <div class="summary-stat">
          <span class="label">Median RT</span>
          <span class="value">{{ Math.round(latest.medianRT) }}ms</span>
        </div>
        <div class="summary-stat">
          <span class="label">Hits / Misses</span>
          <span class="value">{{ latest.hits }} / {{ latest.misses }}</span>
        </div>
        <div class="summary-stat">
          <span class="label">False Alarms</span>
          <span class="value">{{ latest.falseAlarms }}</span>
        </div>
      </div>

      <p class="trend-note">Score trend</p>
      <svg class="sparkline" viewBox="0 0 100 40" preserveAspectRatio="none">
        <polyline :points="scoreSparkline" fill="none" stroke="var(--accent)" stroke-width="2" />
      </svg>

      <p class="trend-note">Accuracy trend</p>
      <svg class="sparkline" viewBox="0 0 100 40" preserveAspectRatio="none">
        <polyline :points="accuracySparkline" fill="none" stroke="var(--correct)" stroke-width="2" />
      </svg>

      <div class="entry-list">
        <div v-for="(entry, i) in reversedHistory" :key="i" class="entry-row">
          <span class="entry-date">{{ formatDate(entry.date) }}</span>
          <span class="entry-score">{{ entry.score }} pts</span>
          <span class="entry-accuracy">{{ entry.accuracy.toFixed(0) }}% acc</span>
          <span class="entry-rt">{{ Math.round(entry.medianRT) }}ms</span>
        </div>
      </div>
    </template>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { NBACK_DIFFICULTIES } from '../../constants/nback/difficulties.js'
import { useScoreHistory } from '../../composables/nback/useScoreHistory.js'
import { useBestScores } from '../../composables/nback/useBestScores.js'

const props = defineProps({
  initialDifficulty: { type: String, default: '2' },
})
defineEmits(['menu'])

const difficulties = Object.values(NBACK_DIFFICULTIES)
const activeDifficulty = ref(props.initialDifficulty)

const { getHistory } = useScoreHistory()
const { getBest } = useBestScores()

const history = computed(() => getHistory(activeDifficulty.value))
const reversedHistory = computed(() => [...history.value].reverse())
const latest = computed(() => history.value[history.value.length - 1])
const best = computed(() => getBest(activeDifficulty.value))

const difficultyLabel = computed(
  () => difficulties.find((d) => d.key === activeDifficulty.value).label
)

function sparklineFor(values) {
  if (values.length === 0) return ''
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const step = values.length > 1 ? 100 / (values.length - 1) : 0
  return values
    .map((v, i) => `${i * step},${36 - ((v - min) / range) * 32}`)
    .join(' ')
}

const scoreSparkline = computed(() => sparklineFor(history.value.map((h) => h.score)))
const accuracySparkline = computed(() => sparklineFor(history.value.map((h) => h.accuracy)))

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

.difficulty-toggle {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  margin-bottom: 1.5rem;
}

.diff-btn {
  background: var(--surface);
  border: 1px solid var(--surface-2);
  color: var(--text-dim);
  padding: 0.6rem 0.25rem;
  border-radius: 9px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.diff-btn.active {
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
  height: 70px;
  background: var(--surface);
  border-radius: 12px;
  margin-bottom: 0.5rem;
}

.entry-list {
  background: var(--surface);
  border-radius: 12px;
  overflow: hidden;
  margin: 1rem 0 1.5rem;
  max-height: 320px;
  overflow-y: auto;
}

.entry-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr;
  padding: 0.6rem 1rem;
  font-size: 0.85rem;
  gap: 0.5rem;
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
    grid-template-columns: 1.2fr 0.9fr 1fr 0.9fr;
    font-size: 0.78rem;
  }
}
</style>
