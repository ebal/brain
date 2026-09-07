<template>
  <div class="history">
    <h1>History</h1>

    <div class="variant-toggle">
      <button
        v-for="v in variants"
        :key="v.key"
        class="variant-btn"
        :class="{ active: activeVariantKey === v.key }"
        @click="activeVariantKey = v.key"
      >
        {{ v.label }}
      </button>
    </div>

    <div class="difficulty-toggle">
      <button
        v-for="d in difficulties"
        :key="d.key"
        class="diff-btn"
        :class="{ active: activeDifficulty === d.key }"
        @click="activeDifficulty = d.key"
      >
        {{ d.label }}
      </button>
    </div>

    <div v-if="history.length === 0" class="empty">
      No rounds played yet for {{ difficultyLabel }} · {{ variantLabel }}.
    </div>

    <template v-else>
      <div class="summary">
        <div class="summary-stat">
          <span class="label">Rounds</span>
          <span class="value">{{ history.length }}</span>
        </div>
        <div class="summary-stat">
          <span class="label">Best Score</span>
          <span class="value">{{ best?.score ?? '—' }}</span>
        </div>
        <div class="summary-stat">
          <span class="label">Latest Score</span>
          <span class="value">{{ latest.score }}</span>
        </div>
      </div>

      <p class="trend-note">Score trend (higher is better)</p>
      <svg class="sparkline" viewBox="0 0 100 40" preserveAspectRatio="none">
        <polyline :points="sparklinePoints" fill="none" stroke="var(--accent)" stroke-width="2" />
      </svg>

      <div class="entry-list">
        <div v-for="(entry, i) in reversedHistory" :key="i" class="entry-row">
          <span class="entry-date">{{ formatDate(entry.completedAt) }}</span>
          <span class="entry-score">{{ entry.score }}</span>
          <span class="entry-status" :class="{ completed: entry.completed }">
            {{ entry.completed ? 'Done' : 'Timeout' }}
          </span>
          <span class="entry-meta">
            {{ entry.targetsCompleted }}/{{ entry.totalTargets }}
            <span v-if="entry.errors === 0 && entry.completed" class="clean-badge">clean</span>
          </span>
        </div>
      </div>
    </template>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { SWITCHTRAIL_DIFFICULTIES } from '../../constants/switchtrail/difficulties.js'
import { SWITCHTRAIL_VARIANTS, variantKeyFor } from '../../constants/switchtrail/variants.js'
import { useSwitchTrailStats } from '../../composables/switchtrail/useSwitchTrailStats.js'

const props = defineProps({
  initialDifficulty: { type: String, default: 'easy' },
  initialColorMode: { type: Boolean, default: false },
})
defineEmits(['menu'])

const difficulties = Object.values(SWITCHTRAIL_DIFFICULTIES)
const variants = Object.values(SWITCHTRAIL_VARIANTS)
const activeDifficulty = ref(props.initialDifficulty)
const activeVariantKey = ref(variantKeyFor(props.initialColorMode))

const { getHistory, getStats } = useSwitchTrailStats()

const history = computed(() => getHistory(activeDifficulty.value, activeVariantKey.value))
const reversedHistory = computed(() => [...history.value].reverse())
const latest = computed(() => history.value[history.value.length - 1])
const best = computed(() => getStats(activeDifficulty.value, activeVariantKey.value).bestScore)

const difficultyLabel = computed(
  () => difficulties.find((d) => d.key === activeDifficulty.value)?.label
)
const variantLabel = computed(
  () => variants.find((v) => v.key === activeVariantKey.value)?.label
)

const sparklinePoints = computed(() => {
  const scores = history.value.map((h) => h.score)
  if (scores.length === 0) return ''
  const max = Math.max(...scores)
  const min = Math.min(...scores)
  const range = max - min || 1
  const step = scores.length > 1 ? 100 / (scores.length - 1) : 0
  // Higher score is better, so plot it higher on the sparkline.
  return scores
    .map((s, i) => `${i * step},${36 - ((s - min) / range) * 32}`)
    .join(' ')
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

.variant-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  background: var(--surface);
  padding: 0.35rem;
  border-radius: 12px;
  margin-bottom: 0.75rem;
}

.variant-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  padding: 0.6rem 0.35rem;
  border-radius: 9px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.variant-btn.active {
  background: var(--accent);
  color: #10121a;
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
  grid-template-columns: 1.3fr 0.7fr 0.8fr 1.2fr;
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

.entry-status {
  font-size: 0.78rem;
  color: var(--text-dim);
}

.entry-status.completed {
  color: var(--correct);
}

.entry-meta {
  font-size: 0.78rem;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  gap: 0.35rem;
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
    grid-template-columns: 1.1fr 0.6fr 0.7fr 1fr;
    font-size: 0.75rem;
  }
}
</style>
