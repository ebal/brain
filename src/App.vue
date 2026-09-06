<template>
  <div class="app-shell">
    <GameChooser v-if="!activeGame" @choose="activeGame = $event" />

    <template v-else-if="activeGame === 'stroop'">
      <MainMenu
        v-if="stroopScreen === 'menu'"
        @start="handleStroopStart"
        @about="handleStroopAbout"
        @history="handleStroopHistory"
        @exit="activeGame = null"
      />
      <AboutPage v-else-if="stroopScreen === 'about'" :initial-mode="stroopMode" @menu="stroopScreen = 'menu'" />
      <HistoryPage
        v-else-if="stroopScreen === 'history'"
        :initial-mode="stroopMode"
        :initial-difficulty="stroopDifficulty || 'easy'"
        @menu="stroopScreen = 'menu'"
      />
      <GameScreen
        v-else-if="stroopScreen === 'game'"
        :difficulty-key="stroopDifficulty"
        :mode="stroopMode"
        @finished="handleStroopFinished"
      />
      <ResultsScreen
        v-else-if="stroopScreen === 'results'"
        :results="stroopResults"
        :difficulty-key="stroopDifficulty"
        :mode="stroopMode"
        @replay="handleStroopStart({ difficultyKey: stroopDifficulty, mode: stroopMode })"
        @menu="stroopScreen = 'menu'"
        @history="handleStroopHistory"
      />
    </template>

    <template v-else-if="activeGame === 'schulte'">
      <SchulteMainMenu
        v-if="schulteScreen === 'menu'"
        @start="handleSchulteStart"
        @about="schulteScreen = 'about'"
        @history="handleSchulteHistory"
        @exit="activeGame = null"
      />
      <SchulteAboutPage v-else-if="schulteScreen === 'about'" @menu="schulteScreen = 'menu'" />
      <SchulteHistoryPage
        v-else-if="schulteScreen === 'history'"
        :initial-difficulty="schulteDifficulty || 'classic'"
        @menu="schulteScreen = 'menu'"
      />
      <SchulteGameScreen
        v-else-if="schulteScreen === 'game'"
        :difficulty-key="schulteDifficulty"
        @finished="handleSchulteFinished"
      />
      <SchulteResultsScreen
        v-else-if="schulteScreen === 'results'"
        :results="schulteResults"
        :difficulty-key="schulteDifficulty"
        @replay="handleSchulteStart(schulteDifficulty)"
        @menu="schulteScreen = 'menu'"
        @history="handleSchulteHistory"
      />
    </template>

    <template v-else-if="activeGame === 'nback'">
      <NBackMainMenu
        v-if="nbackScreen === 'menu'"
        @start="handleNBackStart"
        @about="nbackScreen = 'about'"
        @history="handleNBackHistory"
        @exit="activeGame = null"
      />
      <NBackAboutPage v-else-if="nbackScreen === 'about'" @menu="nbackScreen = 'menu'" />
      <NBackHistoryPage
        v-else-if="nbackScreen === 'history'"
        :initial-difficulty="nbackDifficulty || '2'"
        @menu="nbackScreen = 'menu'"
      />
      <NBackGameScreen
        v-else-if="nbackScreen === 'game'"
        :difficulty-key="nbackDifficulty"
        @finished="handleNBackFinished"
      />
      <NBackResultsScreen
        v-else-if="nbackScreen === 'results'"
        :results="nbackResults"
        :difficulty-key="nbackDifficulty"
        @replay="handleNBackStart(nbackDifficulty)"
        @menu="nbackScreen = 'menu'"
        @history="handleNBackHistory"
      />
    </template>

    <template v-else-if="activeGame === 'sudoku'">
      <SudokuMainMenu
        v-if="sudokuScreen === 'menu'"
        @start="handleSudokuStart"
        @continue="handleSudokuContinue"
        @about="sudokuScreen = 'about'"
        @history="sudokuScreen = 'history'"
        @exit="activeGame = null"
      />
      <SudokuAboutPage v-else-if="sudokuScreen === 'about'" @menu="sudokuScreen = 'menu'" />
      <SudokuHistoryPage v-else-if="sudokuScreen === 'history'" @menu="sudokuScreen = 'menu'" />
      <SudokuGameScreen
        v-else-if="sudokuScreen === 'game'"
        :difficulty-key="sudokuDifficulty"
        :continue-game="sudokuContinue"
        @finished="handleSudokuFinished"
      />
      <SudokuResultsScreen
        v-else-if="sudokuScreen === 'results'"
        :results="sudokuResults"
        :difficulty-key="sudokuDifficulty"
        @replay="handleSudokuStart(sudokuDifficulty)"
        @menu="sudokuScreen = 'menu'"
        @history="sudokuScreen = 'history'"
      />
    </template>

    <template v-else-if="activeGame === 'set'">
      <SetMainMenu
        v-if="setScreen === 'menu'"
        @start="handleSetStart"
        @continue="handleSetContinue"
        @about="setScreen = 'about'"
        @history="setScreen = 'history'"
        @exit="activeGame = null"
      />
      <SetAboutPage v-else-if="setScreen === 'about'" @menu="setScreen = 'menu'" />
      <SetHistoryPage v-else-if="setScreen === 'history'" @menu="setScreen = 'menu'" />
      <SetGameScreen
        v-else-if="setScreen === 'game'"
        :difficulty-key="setDifficulty"
        :continue-game="setContinue"
        @finished="handleSetFinished"
      />
      <SetResultsScreen
        v-else-if="setScreen === 'results'"
        :results="setResults"
        :difficulty-key="setDifficulty"
        @replay="handleSetStart(setDifficulty)"
        @menu="setScreen = 'menu'"
        @history="setScreen = 'history'"
      />
    </template>

    <template v-else-if="activeGame === 'sequence-memory'">
      <SequenceMainMenu
        v-if="sequenceScreen === 'menu'"
        @start="handleSequenceStart"
        @continue="handleSequenceContinue"
        @about="sequenceScreen = 'about'"
        @history="sequenceScreen = 'history'"
        @exit="activeGame = null"
      />
      <SequenceAboutPage v-else-if="sequenceScreen === 'about'" @menu="sequenceScreen = 'menu'" />
      <SequenceHistoryPage v-else-if="sequenceScreen === 'history'" @menu="sequenceScreen = 'menu'" />
      <SequenceGameScreen
        v-else-if="sequenceScreen === 'game'"
        :difficulty-key="sequenceDifficulty"
        :continue-game="sequenceContinue"
        @finished="handleSequenceFinished"
      />
      <SequenceResultsScreen
        v-else-if="sequenceScreen === 'results'"
        :results="sequenceResults"
        :difficulty-key="sequenceDifficulty"
        @replay="handleSequenceStart(sequenceDifficulty)"
        @menu="sequenceScreen = 'menu'"
        @history="sequenceScreen = 'history'"
      />
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import GameChooser from './components/GameChooser.vue'

import MainMenu from './components/MainMenu.vue'
import AboutPage from './components/AboutPage.vue'
import HistoryPage from './components/HistoryPage.vue'
import GameScreen from './components/GameScreen.vue'
import ResultsScreen from './components/ResultsScreen.vue'

import SchulteMainMenu from './components/schulte/MainMenu.vue'
import SchulteAboutPage from './components/schulte/AboutPage.vue'
import SchulteHistoryPage from './components/schulte/HistoryPage.vue'
import SchulteGameScreen from './components/schulte/GameScreen.vue'
import SchulteResultsScreen from './components/schulte/ResultsScreen.vue'

import NBackMainMenu from './components/nback/MainMenu.vue'
import NBackAboutPage from './components/nback/AboutPage.vue'
import NBackHistoryPage from './components/nback/HistoryPage.vue'
import NBackGameScreen from './components/nback/GameScreen.vue'
import NBackResultsScreen from './components/nback/ResultsScreen.vue'

import SudokuMainMenu from './components/sudoku/MainMenu.vue'
import SudokuAboutPage from './components/sudoku/AboutPage.vue'
import SudokuHistoryPage from './components/sudoku/HistoryPage.vue'
import SudokuGameScreen from './components/sudoku/GameScreen.vue'
import SudokuResultsScreen from './components/sudoku/ResultsScreen.vue'

import SetMainMenu from './components/set/MainMenu.vue'
import SetAboutPage from './components/set/AboutPage.vue'
import SetHistoryPage from './components/set/HistoryPage.vue'
import SetGameScreen from './components/set/GameScreen.vue'
import SetResultsScreen from './components/set/ResultsScreen.vue'

import SequenceMainMenu from './components/sequence-memory/MainMenu.vue'
import SequenceAboutPage from './components/sequence-memory/AboutPage.vue'
import SequenceHistoryPage from './components/sequence-memory/HistoryPage.vue'
import SequenceGameScreen from './components/sequence-memory/GameScreen.vue'
import SequenceResultsScreen from './components/sequence-memory/ResultsScreen.vue'

const activeGame = ref(null) // null | 'stroop' | 'schulte' | 'nback' | 'sudoku' | 'set' | 'sequence-memory'

// --- Stroop Effect Test ---
const stroopScreen = ref('menu')
const stroopDifficulty = ref(null)
const stroopMode = ref('color')
const stroopResults = ref(null)

function handleStroopStart({ difficultyKey, mode }) {
  stroopDifficulty.value = difficultyKey
  stroopMode.value = mode
  stroopScreen.value = 'game'
}

function handleStroopAbout(mode) {
  stroopMode.value = mode
  stroopScreen.value = 'about'
}

function handleStroopHistory(payload) {
  if (payload?.mode) stroopMode.value = payload.mode
  if (payload?.difficultyKey) stroopDifficulty.value = payload.difficultyKey
  stroopScreen.value = 'history'
}

function handleStroopFinished(results) {
  stroopResults.value = results
  stroopScreen.value = 'results'
}

// --- Schulte Tables ---
const schulteScreen = ref('menu')
const schulteDifficulty = ref(null)
const schulteResults = ref(null)

function handleSchulteStart(difficultyKey) {
  schulteDifficulty.value = difficultyKey
  schulteScreen.value = 'game'
}

function handleSchulteHistory(payload) {
  if (payload?.difficultyKey) schulteDifficulty.value = payload.difficultyKey
  schulteScreen.value = 'history'
}

function handleSchulteFinished(results) {
  schulteResults.value = results
  schulteScreen.value = 'results'
}

// --- Number N-Back ---
const nbackScreen = ref('menu')
const nbackDifficulty = ref(null)
const nbackResults = ref(null)

function handleNBackStart(difficultyKey) {
  nbackDifficulty.value = difficultyKey
  nbackScreen.value = 'game'
}

function handleNBackHistory(payload) {
  if (payload?.difficultyKey) nbackDifficulty.value = payload.difficultyKey
  nbackScreen.value = 'history'
}

function handleNBackFinished(results) {
  nbackResults.value = results
  nbackScreen.value = 'results'
}

// --- Sudoku ---
const sudokuScreen = ref('menu')
const sudokuDifficulty = ref(null)
const sudokuContinue = ref(false)
const sudokuResults = ref(null)

function handleSudokuStart(difficultyKey) {
  sudokuDifficulty.value = difficultyKey
  sudokuContinue.value = false
  sudokuScreen.value = 'game'
}

function handleSudokuContinue() {
  sudokuContinue.value = true
  sudokuScreen.value = 'game'
}

function handleSudokuFinished(results) {
  sudokuResults.value = results
  sudokuDifficulty.value = results.difficulty
  sudokuScreen.value = 'results'
}

// --- SET ---
const setScreen = ref('menu')
const setDifficulty = ref(null)
const setContinue = ref(false)
const setResults = ref(null)

function handleSetStart(difficultyKey) {
  setDifficulty.value = difficultyKey
  setContinue.value = false
  setScreen.value = 'game'
}

function handleSetContinue() {
  setContinue.value = true
  setScreen.value = 'game'
}

function handleSetFinished(results) {
  setResults.value = results
  setDifficulty.value = results.difficulty
  setScreen.value = 'results'
}

// --- Sequence Memory ---
const sequenceScreen = ref('menu')
const sequenceDifficulty = ref(null)
const sequenceContinue = ref(false)
const sequenceResults = ref(null)

function handleSequenceStart(difficultyKey) {
  sequenceDifficulty.value = difficultyKey
  sequenceContinue.value = false
  sequenceScreen.value = 'game'
}

function handleSequenceContinue() {
  sequenceContinue.value = true
  sequenceScreen.value = 'game'
}

function handleSequenceFinished(results) {
  sequenceResults.value = results
  sequenceDifficulty.value = results.difficulty
  sequenceScreen.value = 'results'
}
</script>
