<template>
  <div class="menu">
    <h1>Mental Rotation</h1>
    <p class="subtitle">Find the same shape after it has been rotated.</p>

    <div class="difficulty-grid">
      <button
        v-for="d in difficulties"
        :key="d.key"
        class="difficulty-card"
        @click="$emit('start', d.key)"
      >
        <h2>{{ d.label }}</h2>
        <p class="meta">{{ d.choices }} choices · {{ d.duration }}s</p>
        <div v-if="stats(d.key).completed > 0" class="best">
          Best: {{ stats(d.key).bestScore.score }} pts
          ({{ stats(d.key).bestAccuracy.accuracy.toFixed(0) }}% acc)
        </div>
        <div v-else class="best best--empty">No score yet</div>
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
import { MENTALROTATION_DIFFICULTIES } from '../../constants/mentalrotation/difficulties.js'
import { useMentalRotationStats } from '../../composables/mentalrotation/useMentalRotationStats.js'

defineEmits(['start', 'about', 'history', 'exit'])

const difficulties = Object.values(MENTALROTATION_DIFFICULTIES)
const { getStats } = useMentalRotationStats()

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
  padding: 1.25rem;
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
  margin: 0 0 0.25rem;
  font-size: 1.25rem;
}

.meta {
  margin: 0 0 0.75rem;
  color: var(--text-dim);
  font-size: 0.9rem;
}

.best {
  font-size: 0.85rem;
  color: var(--accent);
  font-weight: 600;
}

.best--empty {
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
