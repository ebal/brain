<template>
  <div class="menu">
    <button class="exit-link" @click="$emit('exit')">← All Games</button>
    <h1>Switch Trail</h1>
    <p class="subtitle">Tap the targets in alternating order: 1, A, 2, B, 3, C ...</p>

    <div class="variant-toggles">
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
        @click="$emit('start', { difficultyKey: d.key, colorMode })"
      >
        <div class="card-head">
          <h2>{{ d.label }}</h2>
          <span v-if="d.dynamic" class="dynamic-badge">Dynamic</span>
        </div>
        <p class="meta">{{ d.targetCount }} targets · {{ d.timeLimit }}s</p>
        <p v-if="d.dynamic" class="dynamic-note">Positions reshuffle after every correct tap</p>
        <div v-if="stats(d.key).started > 0" class="stat-line">
          Best Score: {{ stats(d.key).bestScore?.score ?? '—' }}
        </div>
        <div v-if="stats(d.key).bestCompletionTime" class="stat-line">
          Best Time: {{ formatTime(stats(d.key).bestCompletionTime.completionTime) }}
        </div>
        <div v-if="stats(d.key).started === 0" class="stat-line stat-line--empty">No rounds played yet</div>
      </button>
    </div>

    <div class="footer-links">
      <button class="about-link" @click="$emit('about')">New here? How to Play →</button>
      <button class="about-link" @click="$emit('history')">History →</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { SWITCHTRAIL_DIFFICULTIES } from '../../constants/switchtrail/difficulties.js'
import { variantKeyFor } from '../../constants/switchtrail/variants.js'
import { useSwitchTrailStats } from '../../composables/switchtrail/useSwitchTrailStats.js'

defineEmits(['start', 'about', 'history', 'exit'])

const difficulties = Object.values(SWITCHTRAIL_DIFFICULTIES)
const colorMode = ref(false)
const { getStats } = useSwitchTrailStats()

// Not reactive to colorMode via watchEffect (unlike Schulte's MainMenu) —
// stats() is called directly in the template on every render, which Vue
// already re-evaluates whenever colorMode changes, so the "Best" preview
// updates live as the checkbox is toggled without any extra wiring.
function stats(difficultyKey) {
  return getStats(difficultyKey, variantKeyFor(colorMode.value))
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
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
  margin: 0;
  font-size: 1.1rem;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.dynamic-badge {
  background: var(--accent);
  color: #10121a;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.dynamic-note {
  margin: 0 0 0.5rem;
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.3;
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
