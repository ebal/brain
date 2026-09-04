<template>
  <div class="menu">
    <h1>Stroop Effect Test</h1>
    <p class="subtitle">{{ modes[mode].short }}</p>

    <div class="mode-toggle">
      <button
        v-for="m in modes"
        :key="m.key"
        class="mode-btn"
        :class="{ active: mode === m.key }"
        @click="mode = m.key"
      >
        {{ m.label }}
      </button>
    </div>

    <div class="difficulty-grid">
      <button
        v-for="d in difficulties"
        :key="d.key"
        class="difficulty-card"
        @click="$emit('start', { difficultyKey: d.key, mode })"
      >
        <h2>{{ d.label }}</h2>
        <p class="meta">
          {{ d.colorCount }} colors · {{ d.duration }}s · {{ Math.round((1 - d.congruentRatio) * 100) }}% tricky
        </p>
        <div v-if="bestScores[d.key]" class="best">
          Best: {{ bestScores[d.key].score }} pts
          ({{ bestScores[d.key].accuracy.toFixed(0) }}% acc)
        </div>
        <div v-else class="best best--empty">No score yet</div>
      </button>
    </div>

    <div class="footer-links">
      <button class="about-link" @click="$emit('about', mode)">New here? How to Play →</button>
      <button class="about-link" @click="$emit('history', { mode })">Score History →</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watchEffect } from 'vue'
import { DIFFICULTIES, MODES } from '../constants/colors.js'
import { useBestScores } from '../composables/useBestScores.js'

defineEmits(['start', 'about', 'history'])

const difficulties = Object.values(DIFFICULTIES)
const modes = MODES
const mode = ref('color')

const { getBest } = useBestScores()

const bestScores = reactive({})
watchEffect(() => {
  for (const d of difficulties) {
    bestScores[d.key] = getBest(mode.value, d.key)
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
  min-height: 1.4em;
}

.mode-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  background: var(--surface);
  padding: 0.35rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.mode-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  padding: 0.85rem 0.5rem;
  border-radius: 9px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}

.mode-btn.active {
  background: var(--accent);
  color: #10121a;
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
}
</style>
