<template>
  <div class="menu">
    <h1>🌍 Flags of the World</h1>
    <p class="subtitle">See the country. Find its flag. Learn the flags of the world.</p>

    <button v-if="activeSave" class="continue-btn" @click="$emit('continue')">
      Continue {{ activeSave.isPractice ? 'Practice' : `Level ${activeSave.level}` }}
      <span class="continue-meta">Question {{ activeSave.questionIndex + 1 }} of {{ activeSave.questions.length }}</span>
    </button>

    <button v-if="canPracticeWeak" class="practice-btn" @click="$emit('practiceWeak')">
      Practice Weak Flags
      <span class="practice-meta">{{ weakCount }} flag{{ weakCount === 1 ? '' : 's' }} need practice</span>
    </button>

    <div class="learning-panel">
      <div class="learning-stat">
        <span class="value">{{ learning.seen }} / {{ datasetTotal }}</span>
        <span class="label">Countries Seen</span>
      </div>
      <div class="learning-stat">
        <span class="value mastered">{{ learning.mastered }}</span>
        <span class="label">Mastered</span>
      </div>
      <div class="learning-stat">
        <span class="value">{{ learning.learning }}</span>
        <span class="label">Learning</span>
      </div>
      <div class="learning-stat">
        <span class="value needs-practice">{{ learning.needsPractice }}</span>
        <span class="label">Needs Practice</span>
      </div>
    </div>

    <div class="level-grid">
      <button
        v-for="lvl in levels"
        :key="lvl.id"
        class="level-card"
        :class="{ locked: lvl.id > progress.highestUnlocked }"
        :disabled="lvl.id > progress.highestUnlocked"
        @click="$emit('start', lvl.id)"
      >
        <span v-if="lvl.id > progress.highestUnlocked" class="lock-icon" aria-hidden="true">🔒</span>
        <h2>{{ lvl.id }}</h2>
        <div class="stars" v-if="stats(lvl.id).best">
          {{ '★'.repeat(stats(lvl.id).best.stars) }}{{ '☆'.repeat(3 - stats(lvl.id).best.stars) }}
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
import { computed } from 'vue'
import { FLAGS_LEVELS } from '../../constants/flags/levels.js'
import { useFlagsStats } from '../../composables/flags/useFlagsStats.js'
import { useFlagsStorage } from '../../composables/flags/useFlagsStorage.js'
import { getDatasetTotal } from '../../composables/flags/dataset.js'

defineEmits(['start', 'continue', 'practiceWeak', 'about', 'history', 'exit'])

const levels = FLAGS_LEVELS
const { getStats, getProgress, getLearningState, getWeakCountries, canPracticeWeak: computeCanPracticeWeak } = useFlagsStats()
const { getActive } = useFlagsStorage()

const progress = getProgress()
const activeSave = getActive()
const datasetTotal = getDatasetTotal()
const canPracticeWeak = computeCanPracticeWeak()
const weakCount = getWeakCountries().length

const learning = computed(() => {
  const state = getLearningState()
  const values = Object.values(state)
  return {
    seen: values.length,
    mastered: values.filter((s) => s.mastery === 'mastered').length,
    learning: values.filter((s) => s.mastery === 'learning').length,
    needsPractice: values.filter((s) => s.mastery === 'needs-practice').length,
  }
})

function stats(level) {
  return getStats(level)
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

.continue-btn,
.practice-btn {
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
  margin-bottom: 0.75rem;
}

.practice-btn {
  background: var(--surface-2);
  color: var(--text);
  border: 1px solid var(--accent);
}

.continue-meta,
.practice-meta {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  opacity: 0.85;
  margin-top: 0.2rem;
}

.learning-panel {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  background: var(--surface);
  border-radius: 12px;
  padding: 0.85rem 0.5rem;
  margin: 0.75rem 0 1.25rem;
}

.learning-stat {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.learning-stat .value {
  font-size: 1.1rem;
  font-weight: 800;
}

.learning-stat .value.mastered {
  color: var(--correct);
}

.learning-stat .value.needs-practice {
  color: var(--wrong);
}

.learning-stat .label {
  font-size: 0.65rem;
  color: var(--text-dim);
}

.level-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
  max-height: 50vh;
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
