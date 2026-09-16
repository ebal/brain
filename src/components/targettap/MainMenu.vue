<template>
  <div class="menu">
    <h1>Target Tap</h1>
    <p class="subtitle">Watch the letter stream and tap when your target appears.</p>

    <div class="difficulty-grid">
      <button
        v-for="d in difficulties"
        :key="d.key"
        class="difficulty-card"
        @click="$emit('start', d.key)"
      >
        <h2>{{ d.label }}</h2>
        <p class="meta">{{ d.duration }}s · ~{{ Math.round(d.targetFrequency * 100) }}% targets · {{ d.stimulusInterval }}ms</p>
        <div v-if="stats(d.key).started > 0" class="stat-line">
          Best Score: {{ stats(d.key).bestScore?.score ?? '—' }}
        </div>
        <div v-if="stats(d.key).bestHitRate" class="stat-line">
          Best Hit Rate: {{ stats(d.key).bestHitRate.hitRate.toFixed(0) }}%
        </div>
        <div v-if="stats(d.key).started === 0" class="stat-line stat-line--empty">No rounds played yet</div>
      </button>
    </div>

    <div class="footer-links">
      <button class="home-link" @click="$emit('exit')" aria-label="All Games">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path fill-rule="evenodd" fill="currentColor" d="M8 1L1 7V15H15V7Z M6.5 15V9H9.5V15Z" />
        </svg>
      </button>
      <button class="about-link" @click="$emit('about')">Learn to Play</button>
      <button class="about-link" @click="$emit('history')">History</button>
    </div>
  </div>
</template>

<script setup>
import { TARGETTAP_DIFFICULTIES } from '../../constants/targettap/difficulties.js'
import { useTargetTapStats } from '../../composables/targettap/useTargetTapStats.js'

defineEmits(['start', 'about', 'history', 'exit'])

const difficulties = Object.values(TARGETTAP_DIFFICULTIES)
const { getStats } = useTargetTapStats()

function stats(difficultyKey) {
  return getStats(difficultyKey)
}
</script>

<style scoped>
.menu {
  max-width: 640px;
  width: 100%;
  text-align: center;
}

h1 {
  margin-bottom: 0.25rem;
}

.subtitle {
  color: var(--text-dim);
  margin-bottom: 1.5rem;
}

.difficulty-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.difficulty-card {
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: 12px;
  padding: 1.25rem 0.75rem;
  text-align: left;
  cursor: pointer;
  color: var(--text);
  transition: border-color 0.15s ease, transform 0.08s ease;
}

.difficulty-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.difficulty-card h2 {
  margin: 0 0 0.35rem;
  font-size: 1.1rem;
}

.meta {
  margin: 0 0 0.5rem;
  color: var(--text-dim);
  font-size: 0.78rem;
}

.stat-line {
  font-size: 0.75rem;
  color: var(--accent);
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.stat-line--empty {
  color: var(--text-dim);
  font-weight: 400;
}

.footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.home-link {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  padding: 0;
  line-height: 0;
}

.home-link:hover {
  color: var(--accent);
}

.about-link {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: underline;
}

.about-link:hover {
  color: var(--accent);
}

@media (max-width: 480px) {
  .difficulty-grid {
    grid-template-columns: 1fr;
  }
}
</style>
