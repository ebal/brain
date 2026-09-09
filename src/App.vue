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

    <AboutBrain v-else-if="activeGame === 'about'" @menu="activeGame = null" />

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
        :initial-color-mode="schulteColorMode"
        :initial-dynamic-mode="schulteDynamicMode"
        @menu="schulteScreen = 'menu'"
      />
      <SchulteGameScreen
        v-else-if="schulteScreen === 'game'"
        :difficulty-key="schulteDifficulty"
        :color-mode="schulteColorMode"
        :dynamic-mode="schulteDynamicMode"
        @finished="handleSchulteFinished"
        @exit="schulteScreen = 'menu'; benchmarkActive = false"
      />
      <SchulteResultsScreen
        v-else-if="schulteScreen === 'results'"
        :results="schulteResults"
        :difficulty-key="schulteDifficulty"
        :color-mode="schulteColorMode"
        :dynamic-mode="schulteDynamicMode"
        @replay="handleSchulteStart({ difficultyKey: schulteDifficulty, colorMode: schulteColorMode, dynamicMode: schulteDynamicMode })"
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
        :light-colors="setLightColors"
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

    <template v-else-if="activeGame === 'memorypairs'">
      <MemoryPairsMainMenu
        v-if="memoryPairsScreen === 'menu'"
        @start="handleMemoryPairsStart"
        @continue="handleMemoryPairsContinue"
        @about="memoryPairsScreen = 'about'"
        @history="memoryPairsScreen = 'history'"
        @exit="activeGame = null"
      />
      <MemoryPairsAboutPage v-else-if="memoryPairsScreen === 'about'" @menu="memoryPairsScreen = 'menu'" />
      <MemoryPairsHistoryPage v-else-if="memoryPairsScreen === 'history'" @menu="memoryPairsScreen = 'menu'" />
      <MemoryPairsGameScreen
        v-else-if="memoryPairsScreen === 'game'"
        :difficulty-key="memoryPairsDifficulty"
        :continue-game="memoryPairsContinue"
        @finished="handleMemoryPairsFinished"
        @exit="memoryPairsScreen = 'menu'; benchmarkActive = false"
      />
      <MemoryPairsResultsScreen
        v-else-if="memoryPairsScreen === 'results'"
        :results="memoryPairsResults"
        :difficulty-key="memoryPairsDifficulty"
        @replay="handleMemoryPairsStart(memoryPairsDifficulty)"
        @menu="memoryPairsScreen = 'menu'"
        @history="memoryPairsScreen = 'history'"
      />
    </template>

    <template v-else-if="activeGame === 'marblejump'">
      <MarbleJumpMainMenu
        v-if="marbleJumpScreen === 'menu'"
        @start="handleMarbleJumpStart"
        @continue="handleMarbleJumpContinue"
        @about="marbleJumpScreen = 'about'"
        @history="marbleJumpScreen = 'history'"
        @exit="activeGame = null"
      />
      <MarbleJumpAboutPage v-else-if="marbleJumpScreen === 'about'" @menu="marbleJumpScreen = 'menu'" />
      <MarbleJumpHistoryPage v-else-if="marbleJumpScreen === 'history'" @menu="marbleJumpScreen = 'menu'" />
      <MarbleJumpGameScreen
        v-else-if="marbleJumpScreen === 'game'"
        :difficulty-key="marbleJumpDifficulty"
        :continue-game="marbleJumpContinue"
        @finished="handleMarbleJumpFinished"
        @exit="marbleJumpScreen = 'menu'; benchmarkActive = false"
      />
      <MarbleJumpResultsScreen
        v-else-if="marbleJumpScreen === 'results'"
        :results="marbleJumpResults"
        :difficulty-key="marbleJumpDifficulty"
        @replay="handleMarbleJumpStart(marbleJumpDifficulty)"
        @menu="marbleJumpScreen = 'menu'"
        @history="marbleJumpScreen = 'history'"
      />
    </template>

    <template v-else-if="activeGame === 'mentalrotation'">
      <MentalRotationMainMenu
        v-if="mentalRotationScreen === 'menu'"
        @start="handleMentalRotationStart"
        @about="mentalRotationScreen = 'about'"
        @history="mentalRotationScreen = 'history'"
        @exit="activeGame = null"
      />
      <MentalRotationAboutPage v-else-if="mentalRotationScreen === 'about'" @menu="mentalRotationScreen = 'menu'" />
      <MentalRotationHistoryPage v-else-if="mentalRotationScreen === 'history'" @menu="mentalRotationScreen = 'menu'" />
      <MentalRotationGameScreen
        v-else-if="mentalRotationScreen === 'game'"
        :difficulty-key="mentalRotationDifficulty"
        @finished="handleMentalRotationFinished"
        @exit="mentalRotationScreen = 'menu'; benchmarkActive = false"
      />
      <MentalRotationResultsScreen
        v-else-if="mentalRotationScreen === 'results'"
        :results="mentalRotationResults"
        :difficulty-key="mentalRotationDifficulty"
        @replay="handleMentalRotationStart(mentalRotationDifficulty)"
        @menu="mentalRotationScreen = 'menu'"
        @history="mentalRotationScreen = 'history'"
      />
    </template>

    <template v-else-if="activeGame === 'emojimahjong'">
      <EmojiMahjongMainMenu
        v-if="emojiMahjongScreen === 'menu'"
        @start="handleEmojiMahjongStart"
        @continue="handleEmojiMahjongContinue"
        @about="emojiMahjongScreen = 'about'"
        @history="emojiMahjongScreen = 'history'"
        @exit="activeGame = null"
      />
      <EmojiMahjongAboutPage v-else-if="emojiMahjongScreen === 'about'" @menu="emojiMahjongScreen = 'menu'" />
      <EmojiMahjongHistoryPage v-else-if="emojiMahjongScreen === 'history'" @menu="emojiMahjongScreen = 'menu'" />
      <EmojiMahjongGameScreen
        v-else-if="emojiMahjongScreen === 'game'"
        :difficulty-key="emojiMahjongDifficulty"
        :continue-game="emojiMahjongContinue"
        @finished="handleEmojiMahjongFinished"
        @exit="emojiMahjongScreen = 'menu'; benchmarkActive = false"
      />
      <EmojiMahjongResultsScreen
        v-else-if="emojiMahjongScreen === 'results'"
        :results="emojiMahjongResults"
        :difficulty-key="emojiMahjongDifficulty"
        @replay="handleEmojiMahjongStart(emojiMahjongDifficulty)"
        @menu="emojiMahjongScreen = 'menu'"
        @history="emojiMahjongScreen = 'history'"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, defineAsyncComponent } from 'vue'
import GameChooser from './components/GameChooser.vue'
import LoadingScreen from './components/LoadingScreen.vue'
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
  mapMemoryPairsEntry,
} from './composables/sessionModel.js'

// GameChooser (the landing screen) is the only component the initial page
// load actually needs, so it's the only one imported eagerly above.
// Everything below — every game and every cross-cutting screen — is only
// reachable by clicking through from that landing screen, so each is its
// own lazily-loaded chunk: the homepage no longer pays for code (or scoped
// CSS) belonging to games/screens the visitor hasn't opened. A short delay
// avoids flashing "Loading…" for chunks that resolve near-instantly (already
// cached by the Service Worker, or a fast connection).
function lazy(loader) {
  return defineAsyncComponent({ loader, loadingComponent: LoadingScreen, delay: 150 })
}

const DataManagement = lazy(() => import('./components/DataManagement.vue'))
const BenchmarkMenu = lazy(() => import('./components/BenchmarkMenu.vue'))
const ActivityDashboard = lazy(() => import('./components/ActivityDashboard.vue'))
const AboutBrain = lazy(() => import('./components/AboutBrain.vue'))

const MainMenu = lazy(() => import('./components/MainMenu.vue'))
const AboutPage = lazy(() => import('./components/AboutPage.vue'))
const HistoryPage = lazy(() => import('./components/HistoryPage.vue'))
const GameScreen = lazy(() => import('./components/GameScreen.vue'))
const ResultsScreen = lazy(() => import('./components/ResultsScreen.vue'))

const SchulteMainMenu = lazy(() => import('./components/schulte/MainMenu.vue'))
const SchulteAboutPage = lazy(() => import('./components/schulte/AboutPage.vue'))
const SchulteHistoryPage = lazy(() => import('./components/schulte/HistoryPage.vue'))
const SchulteGameScreen = lazy(() => import('./components/schulte/GameScreen.vue'))
const SchulteResultsScreen = lazy(() => import('./components/schulte/ResultsScreen.vue'))

const NBackMainMenu = lazy(() => import('./components/nback/MainMenu.vue'))
const NBackAboutPage = lazy(() => import('./components/nback/AboutPage.vue'))
const NBackHistoryPage = lazy(() => import('./components/nback/HistoryPage.vue'))
const NBackGameScreen = lazy(() => import('./components/nback/GameScreen.vue'))
const NBackResultsScreen = lazy(() => import('./components/nback/ResultsScreen.vue'))

const SudokuMainMenu = lazy(() => import('./components/sudoku/MainMenu.vue'))
const SudokuAboutPage = lazy(() => import('./components/sudoku/AboutPage.vue'))
const SudokuHistoryPage = lazy(() => import('./components/sudoku/HistoryPage.vue'))
const SudokuGameScreen = lazy(() => import('./components/sudoku/GameScreen.vue'))
const SudokuResultsScreen = lazy(() => import('./components/sudoku/ResultsScreen.vue'))

const SetMainMenu = lazy(() => import('./components/set/MainMenu.vue'))
const SetAboutPage = lazy(() => import('./components/set/AboutPage.vue'))
const SetHistoryPage = lazy(() => import('./components/set/HistoryPage.vue'))
const SetGameScreen = lazy(() => import('./components/set/GameScreen.vue'))
const SetResultsScreen = lazy(() => import('./components/set/ResultsScreen.vue'))

const MarbleJumpMainMenu = lazy(() => import('./components/marblejump/MainMenu.vue'))
const MarbleJumpAboutPage = lazy(() => import('./components/marblejump/AboutPage.vue'))
const MarbleJumpHistoryPage = lazy(() => import('./components/marblejump/HistoryPage.vue'))
const MarbleJumpGameScreen = lazy(() => import('./components/marblejump/GameScreen.vue'))
const MarbleJumpResultsScreen = lazy(() => import('./components/marblejump/ResultsScreen.vue'))

const MentalRotationMainMenu = lazy(() => import('./components/mentalrotation/MainMenu.vue'))
const MentalRotationAboutPage = lazy(() => import('./components/mentalrotation/AboutPage.vue'))
const MentalRotationHistoryPage = lazy(() => import('./components/mentalrotation/HistoryPage.vue'))
const MentalRotationGameScreen = lazy(() => import('./components/mentalrotation/GameScreen.vue'))
const MentalRotationResultsScreen = lazy(() => import('./components/mentalrotation/ResultsScreen.vue'))

const SequenceMainMenu = lazy(() => import('./components/sequence-memory/MainMenu.vue'))
const SequenceAboutPage = lazy(() => import('./components/sequence-memory/AboutPage.vue'))
const SequenceHistoryPage = lazy(() => import('./components/sequence-memory/HistoryPage.vue'))
const SequenceGameScreen = lazy(() => import('./components/sequence-memory/GameScreen.vue'))
const SequenceResultsScreen = lazy(() => import('./components/sequence-memory/ResultsScreen.vue'))

const SwitchTrailMainMenu = lazy(() => import('./components/switchtrail/MainMenu.vue'))
const SwitchTrailAboutPage = lazy(() => import('./components/switchtrail/AboutPage.vue'))
const SwitchTrailHistoryPage = lazy(() => import('./components/switchtrail/HistoryPage.vue'))
const SwitchTrailGameScreen = lazy(() => import('./components/switchtrail/GameScreen.vue'))
const SwitchTrailResultsScreen = lazy(() => import('./components/switchtrail/ResultsScreen.vue'))

const MemoryPairsMainMenu = lazy(() => import('./components/memorypairs/MainMenu.vue'))
const MemoryPairsAboutPage = lazy(() => import('./components/memorypairs/AboutPage.vue'))
const MemoryPairsHistoryPage = lazy(() => import('./components/memorypairs/HistoryPage.vue'))
const MemoryPairsGameScreen = lazy(() => import('./components/memorypairs/GameScreen.vue'))
const MemoryPairsResultsScreen = lazy(() => import('./components/memorypairs/ResultsScreen.vue'))

const EmojiMahjongMainMenu = lazy(() => import('./components/emojimahjong/MainMenu.vue'))
const EmojiMahjongAboutPage = lazy(() => import('./components/emojimahjong/AboutPage.vue'))
const EmojiMahjongHistoryPage = lazy(() => import('./components/emojimahjong/HistoryPage.vue'))
const EmojiMahjongGameScreen = lazy(() => import('./components/emojimahjong/GameScreen.vue'))
const EmojiMahjongResultsScreen = lazy(() => import('./components/emojimahjong/ResultsScreen.vue'))

const activeGame = ref(null) // null | 'stroop' | 'schulte' | 'nback' | 'sudoku' | 'set' | 'sequence-memory' | 'switchtrail' | 'memorypairs' | 'data' | 'benchmark-menu' | 'activity' | 'about'

// --- Benchmark mode ---
// A thin layer over normal play: launching from BenchmarkMenu reuses each
// game's own handleXStart with the difficulty/mode pinned from
// BENCHMARK_CONFIGS, and each handleXFinished below additionally records a
// separate, versioned benchmark session when this flag is set — the game's
// own normal history/stats/best-scores recording (inside its GameScreen)
// is untouched either way.
const { recordBenchmarkSession } = useBenchmarkHistory()
const benchmarkActive = ref(false)
const benchmarkConfigLabel = computed(() => BENCHMARK_CONFIGS[activeGame.value]?.label || '')

// Personal baseline: shown as a small, dismissible banner right after a
// benchmark session finishes, rather than wiring a prop into every game's
// own ResultsScreen.vue.
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
  else if (game === 'schulte') handleSchulteStart({ difficultyKey: config.difficultyKey, colorMode: false, dynamicMode: false })
  else if (game === 'nback') handleNBackStart(config.difficultyKey)
  else if (game === 'set') handleSetStart(config.difficultyKey)
  else if (game === 'sequence-memory') handleSequenceStart(config.difficultyKey)
  else if (game === 'switchtrail') handleSwitchTrailStart({ difficultyKey: config.difficultyKey, colorMode: false })
  else if (game === 'memorypairs') handleMemoryPairsStart(config.difficultyKey)
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
const schulteColorMode = ref(false)
const schulteDynamicMode = ref(false)
const schulteResults = ref(null)

function handleSchulteStart({ difficultyKey, colorMode, dynamicMode }) {
  schulteDifficulty.value = difficultyKey
  schulteColorMode.value = !!colorMode
  schulteDynamicMode.value = !!dynamicMode
  schulteScreen.value = 'game'
}

function handleSchulteHistory(payload) {
  if (payload?.difficultyKey) schulteDifficulty.value = payload.difficultyKey
  if (payload?.colorMode !== undefined) schulteColorMode.value = payload.colorMode
  if (payload?.dynamicMode !== undefined) schulteDynamicMode.value = payload.dynamicMode
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
const setLightColors = ref(false)
const setResults = ref(null)

// Accepts either a plain difficultyKey string (ResultsScreen's replay,
// Benchmark mode) or { difficultyKey, lightColors } (MainMenu's emit, which
// also carries the Light Colors checkbox) — the string form reuses whatever
// lightColors was last set, since it isn't a benchmark-relevant setting.
function handleSetStart(payload) {
  const { difficultyKey, lightColors } =
    typeof payload === 'string' ? { difficultyKey: payload, lightColors: setLightColors.value } : payload
  setDifficulty.value = difficultyKey
  setLightColors.value = !!lightColors
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

// --- Memory Pairs ---
const memoryPairsScreen = ref('menu')
const memoryPairsDifficulty = ref(null)
const memoryPairsContinue = ref(false)
const memoryPairsResults = ref(null)

function handleMemoryPairsStart(difficultyKey) {
  memoryPairsDifficulty.value = difficultyKey
  memoryPairsContinue.value = false
  memoryPairsScreen.value = 'game'
}

function handleMemoryPairsContinue() {
  memoryPairsContinue.value = true
  memoryPairsScreen.value = 'game'
}

function handleMemoryPairsFinished(results) {
  memoryPairsResults.value = results
  memoryPairsDifficulty.value = results.difficulty
  memoryPairsScreen.value = 'results'
  if (benchmarkActive.value) {
    const priorBaseline = getBaseline('memorypairs')
    const session = recordBenchmarkSession(mapMemoryPairsEntry({ ...results, completedAt: new Date().toISOString() }))
    benchmarkFeedback.value = { game: 'memorypairs', message: describeBenchmarkFeedback('memorypairs', priorBaseline, session.primaryMetric) }
    benchmarkActive.value = false
  }
}

// --- Marble Jump --- not part of Benchmark v1 (SPEC §28), so unlike the
// games above there is no benchmarkActive/recordBenchmarkSession branch here
// — same as Sudoku, the other benchmark-excluded game.
const marbleJumpScreen = ref('menu')
const marbleJumpDifficulty = ref(null)
const marbleJumpContinue = ref(false)
const marbleJumpResults = ref(null)

function handleMarbleJumpStart(difficultyKey) {
  marbleJumpDifficulty.value = difficultyKey
  marbleJumpContinue.value = false
  marbleJumpScreen.value = 'game'
}

function handleMarbleJumpContinue() {
  marbleJumpContinue.value = true
  marbleJumpScreen.value = 'game'
}

function handleMarbleJumpFinished(results) {
  marbleJumpResults.value = results
  marbleJumpDifficulty.value = results.difficulty
  marbleJumpScreen.value = 'results'
}

// --- Mental Rotation --- not part of Benchmark v1 (SPEC §36), so like
// Marble Jump and Sudoku there is no benchmarkActive/recordBenchmarkSession
// branch here. GameScreen.vue itself calls recordStart/recordCompletion
// (via useMentalRotationStats) — App.vue just routes screens.
const mentalRotationScreen = ref('menu')
const mentalRotationDifficulty = ref(null)
const mentalRotationResults = ref(null)

function handleMentalRotationStart(difficultyKey) {
  mentalRotationDifficulty.value = difficultyKey
  mentalRotationScreen.value = 'game'
}

function handleMentalRotationFinished(results) {
  // Unlike Marble Jump/SET's results, useMentalRotationGame's `results` has
  // no `difficulty` field (it never tracks one internally, matching Stroop's
  // precedent) — mentalRotationDifficulty is already set from handleStart
  // and doesn't change mid-round, so there's nothing to re-derive here.
  mentalRotationResults.value = results
  mentalRotationScreen.value = 'results'
}

// --- Emoji Mahjong --- not part of Benchmark v1 (SPEC §32), so like Marble
// Jump and Mental Rotation there is no benchmarkActive/recordBenchmarkSession
// branch here.
const emojiMahjongScreen = ref('menu')
const emojiMahjongDifficulty = ref(null)
const emojiMahjongContinue = ref(false)
const emojiMahjongResults = ref(null)

function handleEmojiMahjongStart(difficultyKey) {
  emojiMahjongDifficulty.value = difficultyKey
  emojiMahjongContinue.value = false
  emojiMahjongScreen.value = 'game'
}

function handleEmojiMahjongContinue() {
  emojiMahjongContinue.value = true
  emojiMahjongScreen.value = 'game'
}

function handleEmojiMahjongFinished(results) {
  emojiMahjongResults.value = results
  emojiMahjongDifficulty.value = results.difficulty
  emojiMahjongScreen.value = 'results'
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
