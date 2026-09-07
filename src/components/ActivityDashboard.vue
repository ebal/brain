<template>
  <div class="activity">
    <h1>Activity</h1>

    <div class="range-toggle">
      <button
        v-for="r in ranges"
        :key="r.key"
        class="range-btn"
        :class="{ active: rangeKey === r.key }"
        @click="rangeKey = r.key"
      >
        {{ r.label }}
      </button>
    </div>

    <section class="overview">
      <div class="stat-tile">
        <span class="label">Current Streak</span>
        <span class="value">{{ data.currentStreak }}<span class="unit">{{ data.currentStreak === 1 ? ' day' : ' days' }}</span></span>
      </div>
      <div class="stat-tile">
        <span class="label">Games Played</span>
        <span class="value">{{ data.activity.gamesPlayed }}</span>
      </div>
      <div class="stat-tile">
        <span class="label">Active Days</span>
        <span class="value">{{ data.activity.activeDays }}</span>
      </div>
      <div class="stat-tile">
        <span class="label">Total Sessions</span>
        <span class="value">{{ data.activity.totalSessions }}</span>
      </div>
    </section>

    <section v-if="Object.keys(data.activity.sessionsPerGame).length" class="card">
      <h2>Sessions by Game</h2>
      <div class="session-bars">
        <div v-for="(count, game) in data.activity.sessionsPerGame" :key="game" class="session-row">
          <span class="game-name">{{ gameLabel(game) }}</span>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: barWidth(count) + '%' }"></div>
          </div>
          <span class="game-count">{{ count }}</span>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Benchmark Performance</h2>
      <p class="card-desc">
        Compared only against your own past Benchmark runs — never a population, never each other.
        A baseline needs at least 3 benchmark sessions to be meaningful.
      </p>

      <div v-for="perf in data.gamePerformance" :key="perf.game" class="perf-card">
        <h3>{{ gameLabel(perf.game) }}</h3>

        <p v-if="!perf.baseline.ready" class="not-ready">
          {{ perf.sampleSize }}/3 benchmark sessions — play {{ perf.baseline.sessionsNeeded }} more to
          establish a baseline.
        </p>

        <div v-else class="perf-grid">
          <div class="perf-stat">
            <span class="label">Baseline (median, n={{ perf.baseline.sampleSize }})</span>
            <span class="value">{{ formatMetric(perf.game, perf.baseline.medianPrimaryMetric) }}</span>
          </div>
          <div class="perf-stat">
            <span class="label">Rolling Median (n={{ perf.sampleSize }})</span>
            <span class="value">{{ formatMetric(perf.game, perf.rollingMedian) }}</span>
          </div>
          <div class="perf-stat">
            <span class="label">Consistency (MAD, n={{ perf.sampleSize }})</span>
            <span class="value">{{ formatMetric(perf.game, perf.mad) }}</span>
          </div>
          <div class="perf-stat">
            <span class="label">Best</span>
            <span class="value">{{ formatMetric(perf.game, perf.best) }}</span>
          </div>
          <div class="perf-stat" v-if="perf.mostRecent">
            <span class="label">Most Recent</span>
            <span class="value">{{ formatMetric(perf.game, perf.mostRecent.primaryMetric) }}</span>
          </div>
          <div class="perf-stat" v-if="perf.recentDelta">
            <span class="label">Recent vs. Baseline (n={{ perf.baseline.sampleSize }})</span>
            <span class="value" :class="perf.recentDelta.percentDelta >= 0 ? 'better' : 'worse'">
              {{ perf.recentDelta.percentDelta >= 0 ? '+' : '' }}{{ perf.recentDelta.percentDelta.toFixed(1) }}%
            </span>
          </div>
        </div>
      </div>
    </section>

    <section class="card about-data">
      <h2>About This Data</h2>
      <p>
        No account. No backend. No analytics. No tracking. Your game history and performance data
        stay on this device — nothing is ever sent anywhere.
      </p>
      <p>
        Results are best read as your performance on these specific tasks over time, not a general
        measure of cognitive ability. Repeated practice can improve scores just through familiarity
        with a task's mechanics — that's expected, and part of why comparing against your own
        baseline matters more than the raw number.
      </p>
    </section>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getActivityDashboardData } from '../composables/activityStats.js'

defineEmits(['menu'])

const ranges = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'all', label: 'All Time' },
]
const rangeKey = ref('30d')

const data = computed(() => getActivityDashboardData(rangeKey.value))

const maxSessionCount = computed(() => Math.max(1, ...Object.values(data.value.activity.sessionsPerGame)))
function barWidth(count) {
  return (count / maxSessionCount.value) * 100
}

const GAME_LABELS = {
  stroop: 'Stroop',
  schulte: 'Schulte Tables',
  nback: 'Number N-Back',
  sudoku: 'Sudoku',
  set: 'SET',
  'sequence-memory': 'Sequence Memory',
  switchtrail: 'Switch Trail',
  memorypairs: 'Memory Pairs',
}
function gameLabel(game) {
  return GAME_LABELS[game] || game
}

function formatMetric(game, value) {
  if (value === null || value === undefined) return '—'
  return game === 'schulte' || game === 'set' ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}`
}
</script>

<style scoped>
.activity {
  max-width: 640px;
  width: 100%;
}

h1 {
  text-align: center;
  margin-bottom: 1rem;
}

.range-toggle {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  margin-bottom: 1.5rem;
}

.range-btn {
  background: var(--surface);
  border: 1px solid var(--surface-2);
  color: var(--text-dim);
  padding: 0.6rem 0.25rem;
  border-radius: 9px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.range-btn.active {
  border-color: var(--accent);
  color: var(--text);
}

.overview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stat-tile {
  background: var(--surface);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-tile .label {
  font-size: 0.78rem;
  color: var(--text-dim);
}

.stat-tile .value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--accent);
}

.stat-tile .unit {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-dim);
}

.card {
  background: var(--surface);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.card h2 {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
}

.card-desc {
  color: var(--text-dim);
  font-size: 0.82rem;
  line-height: 1.5;
  margin: 0 0 1rem;
}

.session-bars {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.session-row {
  display: grid;
  grid-template-columns: 8rem 1fr 2rem;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
}

.game-name {
  color: var(--text-dim);
}

.bar-track {
  background: var(--surface-2);
  border-radius: 999px;
  height: 8px;
  overflow: hidden;
}

.bar-fill {
  background: var(--accent);
  height: 100%;
}

.game-count {
  text-align: right;
  font-weight: 700;
}

.perf-card {
  border-top: 1px solid var(--surface-2);
  padding-top: 0.85rem;
  margin-top: 0.85rem;
}

.perf-card:first-of-type {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}

.perf-card h3 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  color: var(--accent);
}

.not-ready {
  color: var(--text-dim);
  font-size: 0.85rem;
  margin: 0;
}

.perf-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.perf-stat {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.perf-stat .label {
  font-size: 0.72rem;
  color: var(--text-dim);
}

.perf-stat .value {
  font-size: 1rem;
  font-weight: 700;
}

.perf-stat .value.better {
  color: var(--correct);
}

.perf-stat .value.worse {
  color: var(--wrong);
}

.about-data p {
  color: var(--text-dim);
  font-size: 0.82rem;
  line-height: 1.6;
  margin: 0 0 0.75rem;
}

.about-data p:last-child {
  margin-bottom: 0;
}

.back-btn {
  display: block;
  margin: 1.5rem auto 0;
  background: var(--surface-2);
  color: var(--text);
  border: none;
  border-radius: 10px;
  padding: 0.85rem 1.5rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 480px) {
  .overview {
    grid-template-columns: 1fr;
  }

  .perf-grid {
    grid-template-columns: 1fr;
  }

  .session-row {
    grid-template-columns: 5.5rem 1fr 2rem;
    font-size: 0.78rem;
  }
}
</style>
