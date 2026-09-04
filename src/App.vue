<template>
  <div class="app-shell">
    <MainMenu v-if="screen === 'menu'" @start="handleStart" @about="handleAbout" @history="handleHistory" />
    <AboutPage v-else-if="screen === 'about'" :initial-mode="selectedMode" @menu="screen = 'menu'" />
    <HistoryPage
      v-else-if="screen === 'history'"
      :initial-mode="selectedMode"
      :initial-difficulty="selectedDifficulty || 'easy'"
      @menu="screen = 'menu'"
    />
    <GameScreen
      v-else-if="screen === 'game'"
      :difficulty-key="selectedDifficulty"
      :mode="selectedMode"
      @finished="handleFinished"
    />
    <ResultsScreen
      v-else-if="screen === 'results'"
      :results="lastResults"
      :difficulty-key="selectedDifficulty"
      :mode="selectedMode"
      @replay="handleStart({ difficultyKey: selectedDifficulty, mode: selectedMode })"
      @menu="screen = 'menu'"
      @history="handleHistory"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MainMenu from './components/MainMenu.vue'
import AboutPage from './components/AboutPage.vue'
import HistoryPage from './components/HistoryPage.vue'
import GameScreen from './components/GameScreen.vue'
import ResultsScreen from './components/ResultsScreen.vue'

const screen = ref('menu')
const selectedDifficulty = ref(null)
const selectedMode = ref('color')
const lastResults = ref(null)

function handleStart({ difficultyKey, mode }) {
  selectedDifficulty.value = difficultyKey
  selectedMode.value = mode
  screen.value = 'game'
}

function handleAbout(mode) {
  selectedMode.value = mode
  screen.value = 'about'
}

function handleHistory(payload) {
  if (payload?.mode) selectedMode.value = payload.mode
  if (payload?.difficultyKey) selectedDifficulty.value = payload.difficultyKey
  screen.value = 'history'
}

function handleFinished(results) {
  lastResults.value = results
  screen.value = 'results'
}
</script>
