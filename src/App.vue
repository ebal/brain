<template>
  <div class="app-shell">
    <div v-if="benchmarkActive" class="benchmark-banner">Benchmark Run — {{ benchmarkConfigLabel }}</div>
    <div v-else-if="benchmarkFeedback" class="benchmark-feedback">
      {{ benchmarkFeedback.message }}
      <button class="dismiss-btn" @click="benchmarkFeedback = null">×</button>
    </div>

    <GameChooser v-if="!activeGame" @choose="activeGame = $event" />

    <BenchmarkMenu v-else-if="activeGame === 'benchmark-menu'" @start="handleBenchmarkStart" @menu="activeGame = null" />

    <ActivityDashboard v-else-if="activeGame === 'activity'" @menu="activeGame = null" />

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
        @exit="stroopScreen = 'menu'; benchmarkActive = false"
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
        @exit="schulteScreen = 'menu'; benchmarkActive = false"
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
        @exit="nbackScreen = 'menu'; benchmarkActive = false"
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
        @exit="sudokuScreen = 'menu'; benchmarkActive = false"
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
        @exit="setScreen = 'menu'; benchmarkActive = false"
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

    <DataManagement v-else-if="activeGame === 'data'" @menu="activeGame = null" />

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
        @exit="sequenceScreen = 'menu'; benchmarkActive = false"
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

    <template v-else-if="activeGame === 'switchtrail'">
      <SwitchTrailMainMenu
        v-if="switchtrailScreen === 'menu'"
        @start="handleSwitchTrailStart"
        @about="switchtrailScreen = 'about'"
        @history="handleSwitchTrailHistory"
        @exit="activeGame = null"
      />
      <SwitchTrailAboutPage v-else-if="switchtrailScreen === 'about'" @menu="switchtrailScreen = 'menu'" />
      <SwitchTrailHistoryPage
        v-else-if="switchtrailScreen === 'history'"
        :initial-difficulty="switchtrailDifficulty || 'easy'"
        :initial-color-mode="switchtrailColorMode"
        @menu="switchtrailScreen = 'menu'"
      />
      <SwitchTrailGameScreen
        v-else-if="switchtrailScreen === 'game'"
        :difficulty-key="switchtrailDifficulty"
        :color-mode="switchtrailColorMode"
        @finished="handleSwitchTrailFinished"
        @exit="switchtrailScreen = 'menu'; benchmarkActive = false"
      />
      <SwitchTrailResultsScreen
        v-else-if="switchtrailScreen === 'results'"
        :results="switchtrailResults"
        :difficulty-key="switchtrailDifficulty"
        :color-mode="switchtrailColorMode"
        @replay="handleSwitchTrailStart({ difficultyKey: switchtrailDifficulty, colorMode: switchtrailColorMode })"
        @menu="switchtrailScreen = 'menu'"
        @history="handleSwitchTrailHistory"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import GameChooser from './components/GameChooser.vue'
import DataManagement from './components/DataManagement.vue'
import BenchmarkMenu from './components/BenchmarkMenu.vue'
import ActivityDashboard from './components/ActivityDashboard.vue'
import { BENCHMARK_CONFIGS } from './constants/benchmark.js'
import { useBenchmarkHistory } from './composables/benchmarkHistory.js'
import { getBaseline, compareToBaseline } from './composables/baseline.js'
import {
  mapStroopEntry,
  mapSchulteEntry,
  mapNBackEntry,
  mapSetEntry,
  mapSequenceMemoryEntry,
  mapSwitchTrailEntry,
} from './composables/sessionModel.js'

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

import SwitchTrailMainMenu from './components/switchtrail/MainMenu.vue'
import SwitchTrailAboutPage from './components/switchtrail/AboutPage.vue'
import SwitchTrailHistoryPage from './components/switchtrail/HistoryPage.vue'
import SwitchTrailGameScreen from './components/switchtrail/GameScreen.vue'
import SwitchTrailResultsScreen from './components/switchtrail/ResultsScreen.vue'

const activeGame = ref(null) // null | 'stroop' | 'schulte' | 'nback' | 'sudoku' | 'set' | 'sequence-memory' | 'switchtrail' | 'data' | 'benchmark-menu' | 'activity'

// --- Benchmark mode (IMPROVEMENT-PLAN.md Phase 5) ---
// A thin layer over normal play: launching from BenchmarkMenu reuses each
// game's own handleXStart with the difficulty/mode pinned from
// BENCHMARK_CONFIGS, and each handleXFinished below additionally records a
// separate, versioned benchmark session when this flag is set — the game's
// own normal history/stats/best-scores recording (inside its GameScreen)
// is untouched either way.
const { recordBenchmarkSession } = useBenchmarkHistory()
const benchmarkActive = ref(false)
const benchmarkConfigLabel = computed(() => BENCHMARK_CONFIGS[activeGame.value]?.label || '')

// Personal baseline (IMPROVEMENT-PLAN.md Phase 6) — shown as a small,
// dismissible banner right after a benchmark session finishes, rather than
// wiring a prop into every game's own ResultsScreen.vue.
const benchmarkFeedback = ref(null) // { game, message } | null
watch(activeGame, () => { benchmarkFeedback.value = null })

function formatMetricValue(game, value) {
  return game === 'schulte' || game === 'set' ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}`
}

// Computed from the baseline as it stood BEFORE this session was recorded —
// comparing today's result against yesterday's baseline, not a baseline that
// already includes today's own number.
function describeBenchmarkFeedback(game, priorBaseline, latestValue) {
  if (!priorBaseline.ready) {
    return `Benchmark recorded (${priorBaseline.sampleSize}/3) — play ${priorBaseline.sessionsNeeded} more to establish your baseline.`
  }
  const comparison = compareToBaseline(game, priorBaseline, latestValue)
  if (!comparison) return `Benchmark recorded — baseline: ${formatMetricValue(game, priorBaseline.medianPrimaryMetric)}.`
  const sign = comparison.percentDelta >= 0 ? '+' : ''
  const verdict = comparison.percentDelta >= 0 ? 'better' : 'worse'
  return (
    `Baseline (n=${priorBaseline.sampleSize}): ${formatMetricValue(game, priorBaseline.medianPrimaryMetric)}` +
    ` — Today: ${formatMetricValue(game, latestValue)} (${sign}${comparison.percentDelta.toFixed(1)}% ${verdict})`
  )
}

function handleBenchmarkStart(game) {
  benchmarkActive.value = true
  activeGame.value = game
  const config = BENCHMARK_CONFIGS[game]
  if (game === 'stroop') handleStroopStart({ difficultyKey: config.difficultyKey, mode: config.mode })
  else if (game === 'schulte') handleSchulteStart(config.difficultyKey)
  else if (game === 'nback') handleNBackStart(config.difficultyKey)
  else if (game === 'set') handleSetStart(config.difficultyKey)
  else if (game === 'sequence-memory') handleSequenceStart(config.difficultyKey)
  else if (game === 'switchtrail') handleSwitchTrailStart({ difficultyKey: config.difficultyKey, colorMode: false })
}

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
  if (benchmarkActive.value) {
    const priorBaseline = getBaseline('stroop')
    const session = recordBenchmarkSession(mapStroopEntry(
      { score: results.score, accuracy: results.accuracy, avgResponseTime: results.avgResponseTime, date: new Date().toISOString() },
      stroopMode.value,
      stroopDifficulty.value,
    ))
    benchmarkFeedback.value = { game: 'stroop', message: describeBenchmarkFeedback('stroop', priorBaseline, session.primaryMetric) }
    benchmarkActive.value = false
  }
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
  if (benchmarkActive.value) {
    const priorBaseline = getBaseline('schulte')
    const session = recordBenchmarkSession(mapSchulteEntry(
      {
        completionTime: results.completionTime,
        errors: results.errors,
        accuracy: results.accuracy,
        avgSearchTime: results.avgSearchTime,
        medianSearchTime: results.medianSearchTime,
        date: new Date().toISOString(),
      },
      schulteDifficulty.value,
    ))
    benchmarkFeedback.value = { game: 'schulte', message: describeBenchmarkFeedback('schulte', priorBaseline, session.primaryMetric) }
    benchmarkActive.value = false
  }
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
  if (benchmarkActive.value) {
    const priorBaseline = getBaseline('nback')
    const session = recordBenchmarkSession(mapNBackEntry(
      {
        score: results.score,
        accuracy: results.accuracy,
        hits: results.hits,
        misses: results.misses,
        falseAlarms: results.falseAlarms,
        correctRejections: results.correctRejections,
        avgRT: results.avgRT,
        medianRT: results.medianRT,
        date: new Date().toISOString(),
      },
      nbackDifficulty.value,
    ))
    benchmarkFeedback.value = { game: 'nback', message: describeBenchmarkFeedback('nback', priorBaseline, session.primaryMetric) }
    benchmarkActive.value = false
  }
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
  if (benchmarkActive.value) {
    const priorBaseline = getBaseline('set')
    const session = recordBenchmarkSession(mapSetEntry({ ...results, completedAt: new Date().toISOString() }))
    benchmarkFeedback.value = { game: 'set', message: describeBenchmarkFeedback('set', priorBaseline, session.primaryMetric) }
    benchmarkActive.value = false
  }
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
  if (benchmarkActive.value) {
    const priorBaseline = getBaseline('sequence-memory')
    const session = recordBenchmarkSession(mapSequenceMemoryEntry({ ...results, completedAt: new Date().toISOString() }))
    benchmarkFeedback.value = { game: 'sequence-memory', message: describeBenchmarkFeedback('sequence-memory', priorBaseline, session.primaryMetric) }
    benchmarkActive.value = false
  }
}

// --- Switch Trail ---
const switchtrailScreen = ref('menu')
const switchtrailDifficulty = ref(null)
const switchtrailColorMode = ref(false)
const switchtrailResults = ref(null)

function handleSwitchTrailStart({ difficultyKey, colorMode }) {
  switchtrailDifficulty.value = difficultyKey
  switchtrailColorMode.value = !!colorMode
  switchtrailScreen.value = 'game'
}

function handleSwitchTrailHistory(payload) {
  if (payload?.difficultyKey) switchtrailDifficulty.value = payload.difficultyKey
  if (payload?.colorMode !== undefined) switchtrailColorMode.value = payload.colorMode
  switchtrailScreen.value = 'history'
}

function handleSwitchTrailFinished(results) {
  switchtrailResults.value = results
  switchtrailScreen.value = 'results'
  if (benchmarkActive.value) {
    const priorBaseline = getBaseline('switchtrail')
    const session = recordBenchmarkSession(mapSwitchTrailEntry({ ...results, completedAt: new Date().toISOString() }))
    benchmarkFeedback.value = { game: 'switchtrail', message: describeBenchmarkFeedback('switchtrail', priorBaseline, session.primaryMetric) }
    benchmarkActive.value = false
  }
}
</script>

<style scoped>
.benchmark-banner,
.benchmark-feedback {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 10;
  width: 100%;
  text-align: center;
  font-weight: 700;
  font-size: 0.85rem;
  padding: 0.5rem 1rem;
}

.benchmark-banner {
  background: var(--accent);
  color: #10121a;
}

.benchmark-feedback {
  background: var(--surface-2);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.dismiss-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}
</style>
