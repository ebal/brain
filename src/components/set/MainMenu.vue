<template>
  <div class="menu">
    <h1>SET</h1>
    <p class="subtitle">Find three cards that make a SET.</p>

    <button v-if="activeSave" class="continue-btn" @click="$emit('continue')">
      Continue Game
      <span class="continue-meta">{{ activeSave.difficulty }} · {{ formatTime(activeSave.elapsedTime) }}</span>
    </button>

    <div class="variant-toggles">
      <label class="variant-check">
        <input type="checkbox" v-model="lightColors" />
        Light Colors
      </label>
    </div>

    <div class="difficulty-grid">
      <button v-for="d in difficulties" :key="d.key" class="difficulty-card" @click="handleStart(d.key)">
        <h2>{{ d.label }}</h2>
        <p class="meta">{{ d.boardSize }}-card board</p>
        <div class="stat-line" v-if="stats(d.key).completed > 0">
          Best (clean): {{ stats(d.key).bestCleanTime ? formatTime(stats(d.key).bestCleanTime.time) : '—' }}
        </div>
        <div class="stat-line stat-line--empty" v-else>No games completed yet</div>
        <div class="stat-line" v-if="stats(d.key).completed > 0">
          {{ stats(d.key).completed }} completed · streak {{ stats(d.key).currentStreak }}
        </div>
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
import { SET_DIFFICULTIES } from '../../constants/set/cardProperties.js'
import { useSetStorage } from '../../composables/set/useSetStorage.js'
import { useSetStats } from '../../composables/set/useSetStats.js'

const emit = defineEmits(['start', 'continue', 'about', 'history', 'exit'])

const difficulties = Object.values(SET_DIFFICULTIES)
const { getActive, clearActive } = useSetStorage()
const { getDerivedStats, recordAbandon } = useSetStats()

const activeSave = getActive()
const lightColors = ref(false)

function stats(difficultyKey) {
  return getDerivedStats(difficultyKey)
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function handleStart(difficultyKey) {
  if (activeSave) {
    const confirmed = window.confirm(
      `You have an unfinished ${activeSave.difficulty} game in progress. Start a new ${difficultyKey} game and discard it?`
    )
    if (!confirmed) return
    recordAbandon(activeSave.difficulty)
    clearActive()
  }
  emit('start', { difficultyKey, lightColors: lightColors.value })
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

.continue-btn {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
  background: var(--accent);
  color: #10121a;
  border: none;
  border-radius: 12px;
  padding: 1rem;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: 1.5rem;
}

.continue-meta {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: capitalize;
  opacity: 0.85;
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

.meta {
  margin: 0 0 0.5rem;
  color: var(--text-dim);
  font-size: 0.75rem;
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
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
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
