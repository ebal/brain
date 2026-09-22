<template>
  <main class="app-shell">
    <GameChooser v-if="!activeGame" @choose="activeGame = $event" />

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
        @exit="stroopScreen = 'menu'"
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
        @exit="schulteScreen = 'menu'"
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
        @exit="nbackScreen = 'menu'"
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
        @exit="sudokuScreen = 'menu'"
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
        @exit="setScreen = 'menu'"
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
        @exit="sequenceScreen = 'menu'"
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
        :initial-untimed="switchtrailUntimed"
        @menu="switchtrailScreen = 'menu'"
      />
      <SwitchTrailGameScreen
        v-else-if="switchtrailScreen === 'game'"
        :difficulty-key="switchtrailDifficulty"
        :color-mode="switchtrailColorMode"
        :untimed="switchtrailUntimed"
        @finished="handleSwitchTrailFinished"
        @exit="switchtrailScreen = 'menu'"
      />
      <SwitchTrailResultsScreen
        v-else-if="switchtrailScreen === 'results'"
        :results="switchtrailResults"
        :difficulty-key="switchtrailDifficulty"
        :color-mode="switchtrailColorMode"
        :untimed="switchtrailUntimed"
        @replay="handleSwitchTrailStart({ difficultyKey: switchtrailDifficulty, colorMode: switchtrailColorMode, untimed: switchtrailUntimed })"
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
        @exit="memoryPairsScreen = 'menu'"
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
        @exit="marbleJumpScreen = 'menu'"
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
        @history="handleMentalRotationHistory"
        @exit="activeGame = null"
      />
      <MentalRotationAboutPage v-else-if="mentalRotationScreen === 'about'" @menu="mentalRotationScreen = 'menu'" />
      <MentalRotationHistoryPage
        v-else-if="mentalRotationScreen === 'history'"
        :initial-mode="mentalRotationMode"
        @menu="mentalRotationScreen = 'menu'"
      />
      <MentalRotationGameScreen
        v-else-if="mentalRotationScreen === 'game'"
        :difficulty-key="mentalRotationDifficulty"
        :mode="mentalRotationMode"
        @finished="handleMentalRotationFinished"
        @exit="mentalRotationScreen = 'menu'"
      />
      <MentalRotationResultsScreen
        v-else-if="mentalRotationScreen === 'results'"
        :results="mentalRotationResults"
        :difficulty-key="mentalRotationDifficulty"
        :mode="mentalRotationMode"
        @replay="handleMentalRotationStart({ difficultyKey: mentalRotationDifficulty, mode: mentalRotationMode })"
        @menu="mentalRotationScreen = 'menu'"
        @history="handleMentalRotationHistory"
      />
    </template>

    <template v-else-if="activeGame === 'emojimahjong'">
      <EmojiMahjongMainMenu
        v-if="emojiMahjongScreen === 'menu'"
        @start="handleEmojiMahjongStart"
        @continue="handleEmojiMahjongContinue"
        @about="emojiMahjongScreen = 'about'"
        @history="handleEmojiMahjongHistory"
        @exit="activeGame = null"
      />
      <EmojiMahjongAboutPage v-else-if="emojiMahjongScreen === 'about'" @menu="emojiMahjongScreen = 'menu'" />
      <EmojiMahjongHistoryPage
        v-else-if="emojiMahjongScreen === 'history'"
        :initial-level="emojiMahjongLevel || 1"
        @menu="emojiMahjongScreen = 'menu'"
      />
      <EmojiMahjongGameScreen
        v-else-if="emojiMahjongScreen === 'game'"
        :level="emojiMahjongLevel"
        :continue-game="emojiMahjongContinue"
        @finished="handleEmojiMahjongFinished"
        @exit="emojiMahjongScreen = 'menu'"
      />
      <EmojiMahjongResultsScreen
        v-else-if="emojiMahjongScreen === 'results'"
        :results="emojiMahjongResults"
        @next="handleEmojiMahjongStart"
        @replay="handleEmojiMahjongStart"
        @menu="emojiMahjongScreen = 'menu'"
        @history="handleEmojiMahjongHistory"
      />
    </template>

    <template v-else-if="activeGame === 'numbermatch'">
      <NumberMatchMainMenu
        v-if="numberMatchScreen === 'menu'"
        @start="handleNumberMatchStart"
        @continue="handleNumberMatchContinue"
        @about="numberMatchScreen = 'about'"
        @history="numberMatchScreen = 'history'"
        @exit="activeGame = null"
      />
      <NumberMatchAboutPage v-else-if="numberMatchScreen === 'about'" @menu="numberMatchScreen = 'menu'" />
      <NumberMatchHistoryPage v-else-if="numberMatchScreen === 'history'" @menu="numberMatchScreen = 'menu'" />
      <NumberMatchGameScreen
        v-else-if="numberMatchScreen === 'game'"
        :difficulty-key="numberMatchDifficulty"
        :continue-game="numberMatchContinue"
        @finished="handleNumberMatchFinished"
        @exit="numberMatchScreen = 'menu'"
      />
      <NumberMatchResultsScreen
        v-else-if="numberMatchScreen === 'results'"
        :results="numberMatchResults"
        :difficulty-key="numberMatchDifficulty"
        @replay="handleNumberMatchStart(numberMatchDifficulty)"
        @menu="numberMatchScreen = 'menu'"
        @history="numberMatchScreen = 'history'"
      />
    </template>

    <template v-else-if="activeGame === 'oddoneout'">
      <OddOneOutMainMenu
        v-if="oddOneOutScreen === 'menu'"
        @start="handleOddOneOutStart"
        @about="oddOneOutScreen = 'about'"
        @history="handleOddOneOutHistory"
        @exit="activeGame = null"
      />
      <OddOneOutAboutPage v-else-if="oddOneOutScreen === 'about'" @menu="oddOneOutScreen = 'menu'" />
      <OddOneOutHistoryPage
        v-else-if="oddOneOutScreen === 'history'"
        :initial-difficulty="oddOneOutDifficulty || 'easy'"
        :initial-color-mode="oddOneOutColorMode"
        :initial-untimed="oddOneOutUntimed"
        @menu="oddOneOutScreen = 'menu'"
      />
      <OddOneOutGameScreen
        v-else-if="oddOneOutScreen === 'game'"
        :difficulty-key="oddOneOutDifficulty"
        :color-mode="oddOneOutColorMode"
        :untimed="oddOneOutUntimed"
        @finished="handleOddOneOutFinished"
        @exit="oddOneOutScreen = 'menu'"
      />
      <OddOneOutResultsScreen
        v-else-if="oddOneOutScreen === 'results'"
        :results="oddOneOutResults"
        :difficulty-key="oddOneOutDifficulty"
        :color-mode="oddOneOutColorMode"
        :untimed="oddOneOutUntimed"
        @replay="handleOddOneOutStart({ difficultyKey: oddOneOutDifficulty, colorMode: oddOneOutColorMode, untimed: oddOneOutUntimed })"
        @menu="oddOneOutScreen = 'menu'"
        @history="handleOddOneOutHistory"
      />
    </template>

    <template v-else-if="activeGame === 'targettap'">
      <TargetTapMainMenu
        v-if="targetTapScreen === 'menu'"
        @start="handleTargetTapStart"
        @about="targetTapScreen = 'about'"
        @history="handleTargetTapHistory"
        @exit="activeGame = null"
      />
      <TargetTapAboutPage v-else-if="targetTapScreen === 'about'" @menu="targetTapScreen = 'menu'" />
      <TargetTapHistoryPage
        v-else-if="targetTapScreen === 'history'"
        :initial-difficulty="targetTapDifficulty || 'easy'"
        @menu="targetTapScreen = 'menu'"
      />
      <TargetTapGameScreen
        v-else-if="targetTapScreen === 'game'"
        :difficulty-key="targetTapDifficulty"
        @finished="handleTargetTapFinished"
        @exit="targetTapScreen = 'menu'"
      />
      <TargetTapResultsScreen
        v-else-if="targetTapScreen === 'results'"
        :results="targetTapResults"
        :difficulty-key="targetTapDifficulty"
        @replay="handleTargetTapStart(targetTapDifficulty)"
        @menu="targetTapScreen = 'menu'"
        @history="handleTargetTapHistory"
      />
    </template>

    <template v-else-if="activeGame === 'hanoi'">
      <HanoiMainMenu
        v-if="hanoiScreen === 'menu'"
        @start="handleHanoiStart"
        @continue="handleHanoiContinue"
        @about="hanoiScreen = 'about'"
        @history="handleHanoiHistory"
        @exit="activeGame = null"
      />
      <HanoiAboutPage v-else-if="hanoiScreen === 'about'" @menu="hanoiScreen = 'menu'" />
      <HanoiHistoryPage
        v-else-if="hanoiScreen === 'history'"
        :initial-level="hanoiLevel || 1"
        @menu="hanoiScreen = 'menu'"
      />
      <HanoiGameScreen
        v-else-if="hanoiScreen === 'game'"
        :level="hanoiLevel"
        :continue-game="hanoiContinue"
        @finished="handleHanoiFinished"
        @exit="hanoiScreen = 'menu'"
      />
      <HanoiResultsScreen
        v-else-if="hanoiScreen === 'results'"
        :results="hanoiResults"
        @next="handleHanoiStart"
        @replay="handleHanoiStart"
        @menu="hanoiScreen = 'menu'"
        @history="handleHanoiHistory"
      />
    </template>

    <template v-else-if="activeGame === 'lightsout'">
      <LightsOutMainMenu
        v-if="lightsOutScreen === 'menu'"
        @start="handleLightsOutStart"
        @continue="handleLightsOutContinue"
        @about="lightsOutScreen = 'about'"
        @history="handleLightsOutHistory"
        @exit="activeGame = null"
      />
      <LightsOutAboutPage v-else-if="lightsOutScreen === 'about'" @menu="lightsOutScreen = 'menu'" />
      <LightsOutHistoryPage
        v-else-if="lightsOutScreen === 'history'"
        :initial-level="lightsOutLevel || 1"
        @menu="lightsOutScreen = 'menu'"
      />
      <LightsOutGameScreen
        v-else-if="lightsOutScreen === 'game'"
        :level="lightsOutLevel"
        :continue-game="lightsOutContinue"
        @finished="handleLightsOutFinished"
        @exit="lightsOutScreen = 'menu'"
      />
      <LightsOutResultsScreen
        v-else-if="lightsOutScreen === 'results'"
        :results="lightsOutResults"
        @next="handleLightsOutStart"
        @replay="handleLightsOutStart"
        @menu="lightsOutScreen = 'menu'"
        @history="handleLightsOutHistory"
      />
    </template>
  </main>
</template>

<script setup>
import { ref, defineAsyncComponent } from 'vue'
import GameChooser from './components/GameChooser.vue'
import LoadingScreen from './components/LoadingScreen.vue'

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

const NumberMatchMainMenu = lazy(() => import('./components/numbermatch/MainMenu.vue'))
const NumberMatchAboutPage = lazy(() => import('./components/numbermatch/AboutPage.vue'))
const NumberMatchHistoryPage = lazy(() => import('./components/numbermatch/HistoryPage.vue'))
const NumberMatchGameScreen = lazy(() => import('./components/numbermatch/GameScreen.vue'))
const NumberMatchResultsScreen = lazy(() => import('./components/numbermatch/ResultsScreen.vue'))

const OddOneOutMainMenu = lazy(() => import('./components/oddoneout/MainMenu.vue'))
const OddOneOutAboutPage = lazy(() => import('./components/oddoneout/AboutPage.vue'))
const OddOneOutHistoryPage = lazy(() => import('./components/oddoneout/HistoryPage.vue'))
const OddOneOutGameScreen = lazy(() => import('./components/oddoneout/GameScreen.vue'))
const OddOneOutResultsScreen = lazy(() => import('./components/oddoneout/ResultsScreen.vue'))

const TargetTapMainMenu = lazy(() => import('./components/targettap/MainMenu.vue'))
const TargetTapAboutPage = lazy(() => import('./components/targettap/AboutPage.vue'))
const TargetTapHistoryPage = lazy(() => import('./components/targettap/HistoryPage.vue'))
const TargetTapGameScreen = lazy(() => import('./components/targettap/GameScreen.vue'))
const TargetTapResultsScreen = lazy(() => import('./components/targettap/ResultsScreen.vue'))

const HanoiMainMenu = lazy(() => import('./components/hanoi/MainMenu.vue'))
const HanoiAboutPage = lazy(() => import('./components/hanoi/AboutPage.vue'))
const HanoiHistoryPage = lazy(() => import('./components/hanoi/HistoryPage.vue'))
const HanoiGameScreen = lazy(() => import('./components/hanoi/GameScreen.vue'))
const HanoiResultsScreen = lazy(() => import('./components/hanoi/ResultsScreen.vue'))

const LightsOutMainMenu = lazy(() => import('./components/lightsout/MainMenu.vue'))
const LightsOutAboutPage = lazy(() => import('./components/lightsout/AboutPage.vue'))
const LightsOutHistoryPage = lazy(() => import('./components/lightsout/HistoryPage.vue'))
const LightsOutGameScreen = lazy(() => import('./components/lightsout/GameScreen.vue'))
const LightsOutResultsScreen = lazy(() => import('./components/lightsout/ResultsScreen.vue'))

const activeGame = ref(null) // null | 'stroop' | 'schulte' | 'nback' | 'sudoku' | 'set' | 'sequence-memory' | 'switchtrail' | 'memorypairs' | 'data' | 'activity' | 'about'

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
const setLightColors = ref(false)
const setResults = ref(null)

// Accepts either a plain difficultyKey string (ResultsScreen's replay) or
// { difficultyKey, lightColors } (MainMenu's emit, which also carries the
// Light Colors checkbox) — the string form reuses whatever lightColors was
// last set.
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

// --- Switch Trail ---
const switchtrailScreen = ref('menu')
const switchtrailDifficulty = ref(null)
const switchtrailColorMode = ref(false)
const switchtrailUntimed = ref(false)
const switchtrailResults = ref(null)

function handleSwitchTrailStart({ difficultyKey, colorMode, untimed }) {
  switchtrailDifficulty.value = difficultyKey
  switchtrailColorMode.value = !!colorMode
  switchtrailUntimed.value = !!untimed
  switchtrailScreen.value = 'game'
}

function handleSwitchTrailHistory(payload) {
  if (payload?.difficultyKey) switchtrailDifficulty.value = payload.difficultyKey
  if (payload?.colorMode !== undefined) switchtrailColorMode.value = payload.colorMode
  if (payload?.untimed !== undefined) switchtrailUntimed.value = payload.untimed
  switchtrailScreen.value = 'history'
}

function handleSwitchTrailFinished(results) {
  switchtrailResults.value = results
  switchtrailScreen.value = 'results'
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
}

// --- Marble Jump ---
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

// --- Mental Rotation --- GameScreen.vue itself calls recordStart/
// recordCompletion (via useMentalRotationStats) — App.vue just routes screens.
const mentalRotationScreen = ref('menu')
const mentalRotationDifficulty = ref(null)
const mentalRotationMode = ref('timed')
const mentalRotationResults = ref(null)

function handleMentalRotationStart({ difficultyKey, mode }) {
  mentalRotationDifficulty.value = difficultyKey
  mentalRotationMode.value = mode
  mentalRotationScreen.value = 'game'
}

function handleMentalRotationHistory(payload) {
  if (payload?.mode) mentalRotationMode.value = payload.mode
  mentalRotationScreen.value = 'history'
}

function handleMentalRotationFinished(results) {
  // Unlike Marble Jump/SET's results, useMentalRotationGame's `results` has
  // no `difficulty` field (it never tracks one internally, matching Stroop's
  // precedent) — mentalRotationDifficulty is already set from handleStart
  // and doesn't change mid-round, so there's nothing to re-derive here.
  mentalRotationResults.value = results
  mentalRotationScreen.value = 'results'
}

// --- Emoji Mahjong ---
const emojiMahjongScreen = ref('menu')
const emojiMahjongLevel = ref(null)
const emojiMahjongContinue = ref(false)
const emojiMahjongResults = ref(null)

function handleEmojiMahjongStart(level) {
  emojiMahjongLevel.value = level
  emojiMahjongContinue.value = false
  emojiMahjongScreen.value = 'game'
}

function handleEmojiMahjongContinue() {
  emojiMahjongContinue.value = true
  emojiMahjongScreen.value = 'game'
}

function handleEmojiMahjongHistory(payload) {
  if (payload?.level) emojiMahjongLevel.value = payload.level
  emojiMahjongScreen.value = 'history'
}

function handleEmojiMahjongFinished(results) {
  emojiMahjongResults.value = results
  emojiMahjongLevel.value = results.level
  emojiMahjongScreen.value = 'results'
}

// --- Number Match ---
const numberMatchScreen = ref('menu')
const numberMatchDifficulty = ref(null)
const numberMatchContinue = ref(false)
const numberMatchResults = ref(null)

function handleNumberMatchStart(difficultyKey) {
  numberMatchDifficulty.value = difficultyKey
  numberMatchContinue.value = false
  numberMatchScreen.value = 'game'
}

function handleNumberMatchContinue() {
  numberMatchContinue.value = true
  numberMatchScreen.value = 'game'
}

function handleNumberMatchFinished(results) {
  numberMatchResults.value = results
  numberMatchDifficulty.value = results.difficulty
  numberMatchScreen.value = 'results'
}

// --- Odd One Out ---
const oddOneOutScreen = ref('menu')
const oddOneOutDifficulty = ref(null)
const oddOneOutColorMode = ref(false)
const oddOneOutUntimed = ref(false)
const oddOneOutResults = ref(null)

function handleOddOneOutStart({ difficultyKey, colorMode, untimed }) {
  oddOneOutDifficulty.value = difficultyKey
  oddOneOutColorMode.value = !!colorMode
  oddOneOutUntimed.value = !!untimed
  oddOneOutScreen.value = 'game'
}

function handleOddOneOutHistory(payload) {
  if (payload?.difficultyKey) oddOneOutDifficulty.value = payload.difficultyKey
  if (payload?.colorMode !== undefined) oddOneOutColorMode.value = payload.colorMode
  if (payload?.untimed !== undefined) oddOneOutUntimed.value = payload.untimed
  oddOneOutScreen.value = 'history'
}

function handleOddOneOutFinished(results) {
  oddOneOutResults.value = results
  oddOneOutScreen.value = 'results'
}

// --- Target Tap ---
const targetTapScreen = ref('menu')
const targetTapDifficulty = ref(null)
const targetTapResults = ref(null)

function handleTargetTapStart(difficultyKey) {
  targetTapDifficulty.value = difficultyKey
  targetTapScreen.value = 'game'
}

function handleTargetTapHistory(payload) {
  if (payload?.difficultyKey) targetTapDifficulty.value = payload.difficultyKey
  targetTapScreen.value = 'history'
}

function handleTargetTapFinished(results) {
  targetTapResults.value = results
  targetTapScreen.value = 'results'
}

// --- Tower of Hanoi --- Level-based rather than difficulty-based (SPEC
// "Natural progression") — hanoiLevel plays the same role every other
// game's xxxDifficulty ref does.
const hanoiScreen = ref('menu')
const hanoiLevel = ref(null)
const hanoiContinue = ref(false)
const hanoiResults = ref(null)

function handleHanoiStart(level) {
  hanoiLevel.value = level
  hanoiContinue.value = false
  hanoiScreen.value = 'game'
}

function handleHanoiContinue() {
  hanoiContinue.value = true
  hanoiScreen.value = 'game'
}

function handleHanoiHistory(payload) {
  if (payload?.level) hanoiLevel.value = payload.level
  hanoiScreen.value = 'history'
}

function handleHanoiFinished(results) {
  hanoiResults.value = results
  hanoiLevel.value = results.level
  hanoiScreen.value = 'results'
}

// --- Lights Out --- Level-based, mirroring Hanoi's exact wiring shape.
const lightsOutScreen = ref('menu')
const lightsOutLevel = ref(null)
const lightsOutContinue = ref(false)
const lightsOutResults = ref(null)

function handleLightsOutStart(level) {
  lightsOutLevel.value = level
  lightsOutContinue.value = false
  lightsOutScreen.value = 'game'
}

function handleLightsOutContinue() {
  lightsOutContinue.value = true
  lightsOutScreen.value = 'game'
}

function handleLightsOutHistory(payload) {
  if (payload?.level) lightsOutLevel.value = payload.level
  lightsOutScreen.value = 'history'
}

function handleLightsOutFinished(results) {
  lightsOutResults.value = results
  lightsOutLevel.value = results.level
  lightsOutScreen.value = 'results'
}
</script>
