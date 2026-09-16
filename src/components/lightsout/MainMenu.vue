<template>
  <div class="menu">
    <h1>Lights Out</h1>
    <p class="subtitle">Turn every light off. Each tap changes its neighbours too.</p>

    <button v-if="activeSave" class="continue-btn" @click="$emit('continue')">
      Continue Level {{ activeSave.level }}
      <span class="continue-meta">{{ activeSave.size }}×{{ activeSave.size }} &middot; {{ formatTime(activeSave.elapsedTime) }}</span>
    </button>

    <div class="level-grid">
      <button
        v-for="lvl in levels"
        :key="lvl.level"
        class="level-card"
        :class="{ locked: lvl.level > progress.highestUnlocked }"
        :disabled="lvl.level > progress.highestUnlocked"
        @click="$emit('start', lvl.level)"
      >
        <span v-if="lvl.level > progress.highestUnlocked" class="lock-icon" aria-hidden="true">🔒</span>
        <h2>{{ lvl.level }}</h2>
        <p class="meta">{{ lvl.size }}×{{ lvl.size }}</p>
        <div class="stars" v-if="stats(lvl.level).best">
          {{ '★'.repeat(stats(lvl.level).best.stars) }}{{ '☆'.repeat(3 - stats(lvl.level).best.stars) }}
        </div>
      </button>
    </div>

    <div class="progress-summary">
      <span>{{ progress.completedLevels.length }} / {{ levels.length }} levels complete</span>
      <span>{{ progress.totalStars }} / {{ levels.length * 3 }} stars</span>
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
import { LIGHTSOUT_LEVELS } from '../../constants/lightsout/levels.js'
import { useLightsOutStats } from '../../composables/lightsout/useLightsOutStats.js'
import { useLightsOutStorage } from '../../composables/lightsout/useLightsOutStorage.js'

defineEmits(['start', 'continue', 'about', 'history', 'exit'])

const levels = LIGHTSOUT_LEVELS
const { getStats, getProgress } = useLightsOutStats()
const { getActive } = useLightsOutStorage()

const progress = getProgress()
const activeSave = getActive()

function stats(level) {
  return getStats(level)
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
}

h1 {
  margin-bottom: 0.25rem;
}

.subtitle {
  color: var(--text-dim);
  margin-bottom: 1.5rem;
}

.continue-btn {
  display: block;
  width: 100%;
  background: var(--accent);
  color: #10121a;
  border: none;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: 1.25rem;
}

.continue-meta {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  opacity: 0.85;
  margin-top: 0.2rem;
}

.level-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
  max-height: 60vh;
  overflow-y: auto;
  padding: 0.25rem;
}

.level-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: 10px;
  padding: 0.6rem 0.3rem;
  text-align: center;
  cursor: pointer;
  color: var(--text);
  transition: border-color 0.15s ease, transform 0.08s ease;
}

.level-card:not(:disabled):hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.level-card.locked {
  opacity: 0.5;
  cursor: default;
}

.lock-icon {
  position: absolute;
  top: 0.2rem;
  right: 0.3rem;
  font-size: 0.65rem;
}

.level-card h2 {
  margin: 0;
  font-size: 1rem;
}

.meta {
  margin: 0.1rem 0 0.2rem;
  color: var(--text-dim);
  font-size: 0.65rem;
}

.stars {
  color: var(--accent);
  font-size: 0.65rem;
  letter-spacing: 0.05em;
}

.progress-summary {
  display: flex;
  justify-content: space-between;
  color: var(--text-dim);
  font-size: 0.85rem;
  margin-top: 1.25rem;
  padding: 0 0.25rem;
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
</style>
