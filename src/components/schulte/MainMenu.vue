<template>
  <div class="menu">
    <button class="exit-link" @click="$emit('exit')">← All Games</button>
    <h1>Schulte Tables</h1>
    <p class="subtitle">Find the numbers in order, as fast as you can.</p>

    <div class="variant-toggles">
      <label class="variant-check">
        <input type="checkbox" v-model="colorMode" />
        Random Color
      </label>
      <label class="variant-check">
        <input type="checkbox" v-model="dynamicMode" />
        Random Position (reshuffles after every correct tap)
      </label>
    </div>

    <div class="difficulty-grid">
      <button
        v-for="d in difficulties"
        :key="d.key"
        class="difficulty-card"
        @click="$emit('start', { difficultyKey: d.key, colorMode, dynamicMode })"
      >
        <div class="card-head">
          <h2>{{ d.label }}</h2>
          <span v-if="d.isClassic" class="classic-badge">Classic</span>
        </div>
        <p class="meta">{{ d.gridSize }}×{{ d.gridSize }} grid · 1–{{ d.gridSize * d.gridSize }}</p>
        <div v-if="bestTimes[d.key]" class="best">
          Best: {{ (bestTimes[d.key].completionTime / 1000).toFixed(2) }}s
        </div>
        <div v-else class="best best--empty">No best yet</div>
      </button>
    </div>

    <div class="footer-links">
      <button class="about-link" @click="$emit('about')">New here? How to Play →</button>
      <button class="about-link" @click="$emit('history')">Score History →</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watchEffect } from 'vue'
import { SCHULTE_DIFFICULTIES } from '../../constants/schulte/difficulties.js'
import { variantKeyFor } from '../../constants/schulte/variants.js'
import { useBestTimes } from '../../composables/schulte/useBestTimes.js'

defineEmits(['start', 'about', 'history', 'exit'])

const difficulties = Object.values(SCHULTE_DIFFICULTIES)
const colorMode = ref(false)
const dynamicMode = ref(false)

const { getBest } = useBestTimes()

// Recomputes whenever the checkboxes change, so the "Best" preview on each
// card always reflects the variant currently selected, not just Classic.
const bestTimes = reactive({})
watchEffect(() => {
  const variantKey = variantKeyFor(colorMode.value, dynamicMode.value)
  for (const d of difficulties) {
    bestTimes[d.key] = getBest(d.key, variantKey)
  }
})
</script>

<style scoped>
.menu {
  max-width: 640px;
  width: 100%;
  text-align: center;
  position: relative;
}

.exit-link {
  position: absolute;
  top: 0;
  left: 0;
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
}

.exit-link:hover {
  color: var(--accent);
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
  font-size: 1.25rem;
}

.classic-badge {
  background: var(--accent);
  color: #10121a;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
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
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1.5rem;
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

  .exit-link {
    position: static;
    display: block;
    margin-bottom: 0.75rem;
    text-align: left;
  }
}
</style>
