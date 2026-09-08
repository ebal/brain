<template>
  <div class="menu">
    <h1>Number N-Back</h1>
    <p class="subtitle">Does the current number match the one N positions back?</p>

    <div class="difficulty-grid">
      <button
        v-for="d in difficulties"
        :key="d.key"
        class="difficulty-card"
        @click="$emit('start', d.key)"
      >
        <div class="card-head">
          <h2>{{ d.label }}</h2>
          <span v-if="d.isClassic" class="classic-badge">Classic</span>
          <span v-if="d.isLetters" class="letters-badge">Letters</span>
        </div>
        <p class="meta">{{ d.n }}-back · {{ d.scoredTrials }} scored trials</p>
        <div v-if="bestScores[d.key]" class="best">
          Best: {{ bestScores[d.key].score }} pts
          ({{ bestScores[d.key].accuracy.toFixed(0) }}% acc)
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
      <button class="about-link" @click="$emit('history')">Scores</button>
    </div>
  </div>
</template>

<script setup>
import { reactive, watchEffect } from 'vue'
import { NBACK_DIFFICULTIES } from '../../constants/nback/difficulties.js'
import { useBestScores } from '../../composables/nback/useBestScores.js'

defineEmits(['start', 'about', 'history', 'exit'])

const difficulties = Object.values(NBACK_DIFFICULTIES)

const { getBest } = useBestScores()

const bestScores = reactive({})
watchEffect(() => {
  for (const d of difficulties) {
    bestScores[d.key] = getBest(d.key)
  }
})
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

.card-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.card-head h2 {
  margin: 0;
  font-size: 1.15rem;
}

.classic-badge {
  background: var(--accent);
  color: #10121a;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.letters-badge {
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
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
