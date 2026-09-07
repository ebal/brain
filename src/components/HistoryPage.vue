<template>
  <div class="history">
    <h1>Score History</h1>

    <div class="mode-toggle">
      <button
        v-for="m in modes"
        :key="m.key"
        class="mode-btn"
        :class="{ active: activeMode === m.key }"
        @click="activeMode = m.key"
      >
        {{ m.label }}
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
      No rounds played yet for {{ difficultyLabel }} · {{ modeLabel }}.
    </div>

    <template v-else>
      <div class="summary">
        <div class="summary-stat">
          <span class="label">Rounds</span>
          <span class="value">{{ history.length }}</span>
        </div>
        <div class="summary-stat">
          <span class="label">Best</span>
          <span class="value">{{ bestScore }}</span>
        </div>
        <div class="summary-stat">
          <span class="label">Average</span>
          <span class="value">{{ avgScore }}</span>
        </div>
      </div>

      <svg class="sparkline" viewBox="0 0 100 40" preserveAspectRatio="none">
        <polyline :points="sparklinePoints" fill="none" stroke="var(--accent)" stroke-width="2" />
      </svg>

      <div class="entry-list">
        <div v-for="(entry, i) in reversedHistory" :key="i" class="entry-row">
          <span class="entry-date">{{ formatDate(entry.date) }}</span>
          <span class="entry-score">{{ entry.score }} pts</span>
          <span class="entry-accuracy">{{ entry.accuracy.toFixed(0) }}% acc</span>
          <span class="entry-rt">{{ (entry.avgResponseTime / 1000).toFixed(2) }}s</span>
        </div>
      </div>
    </template>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { DIFFICULTIES, MODES } from '../constants/colors.js'
import { useScoreHistory } from '../composables/useScoreHistory.js'
import { useBestScores } from '../composables/useBestScores.js'

const props = defineProps({
  initialMode: { type: String, default: 'color' },
  initialDifficulty: { type: String, default: 'easy' },
})
defineEmits(['menu'])

const modes = MODES
const difficulties = Object.values(DIFFICULTIES)
const activeMode = ref(props.initialMode)
const activeDifficulty = ref(props.initialDifficulty)

const { getHistory } = useScoreHistory()
const { getBest } = useBestScores()

const history = computed(() => getHistory(activeMode.value, activeDifficulty.value))
const reversedHistory = computed(() => [...history.value].reverse())

const difficultyLabel = computed(() => DIFFICULTIES[activeDifficulty.value].label)
const modeLabel = computed(() => MODES[activeMode.value].label)

// The true persisted best, not an approximation from the capped display window.
const bestScore = computed(() => getBest(activeMode.value, activeDifficulty.value)?.score ?? 0)
const avgScore = computed(() =>
  Math.round(history.value.reduce((sum, h) => sum + h.score, 0) / history.value.length)
)

const sparklinePoints = computed(() => {
  const scores = history.value.map((h) => h.score)
  if (scores.length === 0) return ''
  const max = Math.max(...scores)
  const min = Math.min(...scores)
  const range = max - min || 1
  const step = scores.length > 1 ? 100 / (scores.length - 1) : 0
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

.mode-toggle {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  background: var(--surface);
  padding: 0.35rem;
  border-radius: 12px;
  margin-bottom: 0.75rem;
}

.mode-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  padding: 0.75rem 0.35rem;
  border-radius: 9px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.mode-btn.active {
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
  font-size: 0.8rem;
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
  margin-bottom: 1rem;
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
  font-size: 1.25rem;
  font-weight: 700;
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
