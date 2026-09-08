<template>
  <div class="menu">
    <h1>Memory Pairs</h1>
    <p class="subtitle">Flip tiles and find matching emoji pairs.</p>

    <button v-if="activeSave" class="continue-btn" @click="$emit('continue')">
      Continue Game
      <span class="continue-meta">{{ difficultyLabel(activeSave.difficulty) }} · {{ formatTime(activeSave.elapsedTime) }}</span>
    </button>

    <div class="difficulty-grid">
      <button v-for="d in difficulties" :key="d.key" class="difficulty-card" @click="handleStart(d.key)">
        <h2>{{ d.label }}</h2>
        <p class="meta">{{ d.cols * d.rows }} tiles · {{ d.pairs }} pairs</p>
        <div v-if="stats(d.key).bestScore" class="stat-line">
          Best Score: {{ stats(d.key).bestScore.score }}
        </div>
        <div v-else class="stat-line stat-line--empty">No games completed yet</div>
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
import { MEMORYPAIRS_DIFFICULTIES } from '../../constants/memorypairs/difficulties.js'
import { useMemoryPairsStorage } from '../../composables/memorypairs/useMemoryPairsStorage.js'
import { useMemoryPairsStats } from '../../composables/memorypairs/useMemoryPairsStats.js'

const emit = defineEmits(['start', 'continue', 'about', 'history', 'exit'])

const difficulties = Object.values(MEMORYPAIRS_DIFFICULTIES)
const { getActive, clearActive } = useMemoryPairsStorage()
const { getStats } = useMemoryPairsStats()

const activeSave = getActive()

function stats(difficultyKey) {
  return getStats(difficultyKey)
}

function difficultyLabel(difficultyKey) {
  return difficulties.find((d) => d.key === difficultyKey)?.label || difficultyKey
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
      `You have an unfinished ${difficultyLabel(activeSave.difficulty)} game in progress. Start a new ${difficultyLabel(difficultyKey)} game and discard it?`
    )
    if (!confirmed) return
    clearActive()
  }
  emit('start', difficultyKey)
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
  opacity: 0.85;
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
