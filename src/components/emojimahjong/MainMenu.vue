<template>
  <div class="menu">
    <h1>Emoji Mahjong</h1>
    <p class="subtitle">Match free emoji tiles and clear the board. Visual search &amp; planning.</p>

    <button v-if="activeSave" class="continue-btn" @click="$emit('continue')">
      Continue Level {{ activeSave.level }}
      <span class="continue-meta">{{ formatTime(activeSave.elapsedTime) }}</span>
    </button>

    <div class="progress-summary">
      <span>{{ progress.completedLevels.length }} / {{ levels.length }} levels complete</span>
      <span>{{ progress.totalStars }} / {{ levels.length * 3 }} stars</span>
    </div>

    <div class="level-grid">
      <button
        v-for="lvl in levels"
        :key="lvl.level"
        class="level-card"
        :class="{ locked: lvl.level > progress.highestUnlocked }"
        :disabled="lvl.level > progress.highestUnlocked"
        @click="handleStart(lvl.level)"
      >
        <span v-if="lvl.level > progress.highestUnlocked" class="lock-icon" aria-hidden="true">🔒</span>
        <h2>{{ lvl.level }}</h2>
        <div class="stars" v-if="stats(lvl.level).best">
          {{ '★'.repeat(stats(lvl.level).best.stars) }}{{ '☆'.repeat(3 - stats(lvl.level).best.stars) }}
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
import { EMOJIMAHJONG_LEVELS } from '../../constants/emojimahjong/levels.js'
import { useEmojiMahjongStorage } from '../../composables/emojimahjong/useEmojiMahjongStorage.js'
import { useEmojiMahjongStats } from '../../composables/emojimahjong/useEmojiMahjongStats.js'

const emit = defineEmits(['start', 'continue', 'about', 'history', 'exit'])

const levels = EMOJIMAHJONG_LEVELS
const { getActive, clearActive } = useEmojiMahjongStorage()
const { getStats, getProgress, recordAbandon } = useEmojiMahjongStats()

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

function handleStart(level) {
  if (activeSave && activeSave.level !== level) {
    const confirmed = window.confirm(
      `You have an unfinished Level ${activeSave.level} in progress. Start Level ${level} and discard it?`
    )
    if (!confirmed) return
    recordAbandon(activeSave.level)
    clearActive()
  }
  emit('start', level)
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
  margin-bottom: 1rem;
}

.continue-meta {
  font-size: 0.85rem;
  font-weight: 600;
  opacity: 0.85;
}

.progress-summary {
  display: flex;
  justify-content: space-between;
  color: var(--text-dim);
  font-size: 0.85rem;
  margin-bottom: 1rem;
  padding: 0 0.25rem;
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

.stars {
  color: var(--accent);
  font-size: 0.65rem;
  letter-spacing: 0.05em;
  margin-top: 0.15rem;
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
