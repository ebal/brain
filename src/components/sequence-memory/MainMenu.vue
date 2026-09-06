<template>
  <div class="menu">
    <button class="exit-link" @click="$emit('exit')">← All Games</button>
    <h1>Sequence Memory</h1>
    <p class="subtitle">Watch the pattern, then repeat it in the same order.</p>

    <button v-if="activeSave" class="continue-btn" @click="$emit('continue')">
      Continue Game
      <span class="continue-meta">{{ activeSave.difficulty }} · Level {{ activeSave.level }}</span>
    </button>

    <div class="difficulty-grid">
      <button v-for="d in difficulties" :key="d.key" class="difficulty-card" @click="handleStart(d.key)">
        <h2>{{ d.label }}</h2>
        <p class="meta">{{ d.lives }} {{ d.lives === 1 ? 'life' : 'lives' }}</p>
        <div class="stat-line" v-if="stats(d.key).completed > 0">
          Best: {{ stats(d.key).bestResult.longestSequence }} cells
        </div>
        <div class="stat-line stat-line--empty" v-else>No games completed yet</div>
      </button>
    </div>

    <div class="footer-links">
      <button class="about-link" @click="$emit('about')">New here? How to Play →</button>
      <button class="about-link" @click="$emit('history')">History →</button>
    </div>
  </div>
</template>

<script setup>
import { SEQUENCE_DIFFICULTIES } from '../../constants/sequence-memory/difficulties.js'
import { useMemoryStorage } from '../../composables/sequence-memory/useMemoryStorage.js'
import { useMemoryStats } from '../../composables/sequence-memory/useMemoryStats.js'

const emit = defineEmits(['start', 'continue', 'about', 'history', 'exit'])

const difficulties = Object.values(SEQUENCE_DIFFICULTIES)
const { getActive, clearActive } = useMemoryStorage()
const { getStats, recordAbandon } = useMemoryStats()

const activeSave = getActive()

function stats(difficultyKey) {
  return getStats(difficultyKey)
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
  emit('start', difficultyKey)
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

.difficulty-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
}

.meta {
  margin: 0 0 0.5rem;
  color: var(--text-dim);
  font-size: 0.85rem;
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
