<template>
  <div class="menu">
    <h1>Odd One Out</h1>
    <p class="subtitle">Find the different number or letter before time runs out.</p>

    <div class="variant-toggles">
      <label class="variant-check">
        <input type="checkbox" v-model="untimed" />
        Untimed
      </label>
      <label class="variant-check">
        <input type="checkbox" v-model="colorMode" />
        Random Color
      </label>
    </div>

    <div class="difficulty-grid">
      <button
        v-for="d in difficulties"
        :key="d.key"
        class="difficulty-card"
        @click="$emit('start', { difficultyKey: d.key, colorMode, untimed })"
      >
        <h2>{{ d.label }}</h2>
        <p class="meta">{{ d.gridSize }}×{{ d.gridSize }} · {{ untimed ? `${UNTIMED_TARGET_CORRECT} correct` : `${d.timeLimit}s` }}</p>
        <div v-if="stats(d.key).started > 0" class="stat-line">
          Best Score: {{ stats(d.key).bestScore?.score ?? '—' }}
        </div>
        <div v-if="stats(d.key).bestAccuracy" class="stat-line">
          Best Accuracy: {{ stats(d.key).bestAccuracy.accuracy.toFixed(1) }}%
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
import { ref } from 'vue'
import { ODDONEOUT_DIFFICULTIES } from '../../constants/oddoneout/difficulties.js'
import { ODDONEOUT_UNTIMED_TARGET_CORRECT as UNTIMED_TARGET_CORRECT, variantKeyFor } from '../../constants/oddoneout/variants.js'
import { useOddOneOutStats } from '../../composables/oddoneout/useOddOneOutStats.js'

defineEmits(['start', 'about', 'history', 'exit'])

const difficulties = Object.values(ODDONEOUT_DIFFICULTIES)
const colorMode = ref(false)
const untimed = ref(false)
const { getStats } = useOddOneOutStats()

// Not reactive via watchEffect (mirrors switchtrail/MainMenu.vue) — stats()
// is called directly in the template on every render, which Vue already
// re-evaluates whenever either checkbox changes, so the "Best" preview
// updates live without any extra wiring.
function stats(difficultyKey) {
  return getStats(difficultyKey, variantKeyFor(colorMode.value, untimed.value))
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

.variant-toggles {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: var(--surface);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  margin-bottom: 1.5rem;
  text-align: left;
}

.variant-check {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.9rem;
  color: var(--text);
  cursor: pointer;
}

.variant-check input {
  width: 1.15rem;
  height: 1.15rem;
  accent-color: var(--accent);
  cursor: pointer;
  flex-shrink: 0;
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
  font-size: 0.8rem;
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
