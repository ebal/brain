<template>
  <div class="game">
    <template v-if="status === 'paused'">
      <div class="paused-overlay">
        <p class="paused-title">Paused</p>
        <button class="resume-btn" @click="handleResume">Resume</button>
        <button class="restart-btn" @click="handleRestartConfirm">Restart</button>
        <button class="quit-btn" @click="handleExit">Quit</button>
      </div>
    </template>

    <template v-else>
      <div class="hud">
        <button class="exit-icon-btn" aria-label="Exit to menu" @click="handleExit">✕</button>
        <span class="level-label">Level {{ level }} &middot; {{ disks }} disks</span>
        <span class="timer">{{ formatTime(elapsedTime) }}</span>
      </div>
      <div class="hud hud-secondary">
        <span class="stat">Moves {{ moves }}</span>
        <span class="stat">Optimal {{ optimalMoves }}</span>
        <span class="stat" :class="{ wrong: mistakes > 0 }">Mistakes {{ mistakes }}</span>
      </div>

      <div class="pegs" :class="{ shake: feedback === 'illegal' }">
        <button
          v-for="(peg, i) in pegs"
          :key="i"
          class="peg-column"
          :class="{
            selected: selectedPeg === i,
            'hint-source': hintMove && hintMove.from === i,
            'hint-target': hintMove && hintMove.to === i,
            'legal-target': selectedPeg !== null && selectedPeg !== i && isLegal(i),
          }"
          @click="handleTap(i)"
        >
          <div class="disk-stack">
            <div class="rod"></div>
            <div
              v-for="disk in [...peg].reverse()"
              :key="disk"
              class="disk"
              :class="{ lifted: selectedPeg === i && disk === peg[peg.length - 1] }"
              :style="{ width: diskWidthPercent(disk) + '%' }"
            >
              {{ disk }}
            </div>
          </div>
          <div class="peg-base"></div>
          <span class="peg-name">{{ ['A', 'B', 'C'][i] }}</span>
        </button>
      </div>

      <div class="actions-row">
        <button class="action-btn" :disabled="moves === 0" @click="handleUndo">Undo</button>
        <button class="action-btn" @click="handleRestartConfirm">Restart</button>
        <button class="action-btn" @click="handleHint">Hint</button>
      </div>
    </template>

    <ConfirmDialog
      v-if="showExitConfirm"
      message="Exit this level? Your progress will be saved."
      @confirm="confirmExit"
      @cancel="showExitConfirm = false"
    />
    <ConfirmDialog
      v-if="showRestartConfirm"
      message="Restart this level? Your current progress will be lost."
      @confirm="confirmRestart"
      @cancel="showRestartConfirm = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import { useHanoiGame } from '../../composables/hanoi/useHanoiGame.js'
import { useHanoiStats } from '../../composables/hanoi/useHanoiStats.js'
import { useHanoiStorage } from '../../composables/hanoi/useHanoiStorage.js'
import { isLegalMove, getOptimalMoveCount } from '../../composables/hanoi/state.js'
import { getLevelConfig } from '../../constants/hanoi/levels.js'

const props = defineProps({
  level: { type: Number, required: true },
  continueGame: { type: Boolean, default: false },
})
const emit = defineEmits(['finished', 'exit'])

const { recordStart } = useHanoiStats()
const { getActive, saveActive, clearActive } = useHanoiStorage()

const game = useHanoiGame()
const { status, disks, pegs, selectedPeg, moves, mistakes, undos, hints, feedback, hintMove, elapsedTime, results } = game

const optimalMoves = computed(() => getOptimalMoveCount(disks.value))

const showExitConfirm = ref(false)
const showRestartConfirm = ref(false)

function isLegal(destPeg) {
  return isLegalMove({ pegs: pegs.value }, selectedPeg.value, destPeg)
}

function diskWidthPercent(disk) {
  const total = disks.value || 1
  const minPct = 30
  const maxPct = 96
  return total > 1 ? minPct + ((disk - 1) / (total - 1)) * (maxPct - minPct) : maxPct
}

function handleTap(peg) {
  game.selectPeg(peg)
  persist()
}

function handleUndo() {
  game.undo()
  persist()
}

function handleHint() {
  game.hint()
  persist()
}

function handleRestartConfirm() {
  showRestartConfirm.value = true
}

function confirmRestart() {
  showRestartConfirm.value = false
  game.restart()
  recordStart(props.level)
  persist()
}

function handleExit() {
  showExitConfirm.value = true
}

function confirmExit() {
  showExitConfirm.value = false
  game.pause()
  persist()
  emit('exit')
}

function handleResume() {
  game.resumeFromPause()
}

function persist() {
  if (status.value === 'finished' || status.value === 'idle') return
  saveActive(game.snapshot())
}

function handleVisibilityChange() {
  if (document.hidden && status.value === 'playing') {
    game.pause()
    persist()
  }
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  // Matches marblejump/GameScreen.vue's exact pattern: on the continue path
  // the saved snapshot alone determines level/disks — the `level` prop is
  // only meaningful for a fresh start, so it's never cross-checked here.
  const active = props.continueGame ? getActive() : null
  if (active) {
    game.resumeFromSave(active)
  } else {
    const config = getLevelConfig(props.level)
    game.begin(props.level, config.disks)
    recordStart(props.level)
    persist()
  }
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  game.reset()
})

watch(status, (val) => {
  if (val === 'finished') {
    clearActive()
    emit('finished', results.value)
  }
})
</script>

<style scoped>
.game {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.hud {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.5rem;
}

.hud-secondary {
  grid-template-columns: repeat(3, 1fr);
}

.exit-icon-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.35rem;
  justify-self: start;
}

.level-label {
  text-align: center;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--accent);
}

.timer {
  font-variant-numeric: tabular-nums;
  color: var(--text-dim);
  font-size: 0.95rem;
  justify-self: end;
}

.stat {
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-dim);
}

.stat.wrong {
  color: var(--wrong);
}

.pegs {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  background: var(--surface);
  border-radius: 16px;
  padding: 1rem 0.5rem 0.5rem;
}

.pegs.shake {
  animation: shake 0.3s ease;
}

@keyframes shake {
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.peg-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: none;
  border: 2px solid transparent;
  border-radius: 10px;
  padding: 0.25rem 0;
  cursor: pointer;
  touch-action: manipulation;
}

.peg-column.selected {
  border-color: var(--accent);
}

.peg-column.legal-target {
  border-color: var(--correct);
}

.peg-column.hint-source,
.peg-column.hint-target {
  border-color: var(--accent);
  border-style: dashed;
}

.disk-stack {
  position: relative;
  width: 100%;
  height: 150px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
}

.rod {
  position: absolute;
  top: 0;
  bottom: 0.5rem;
  width: 6px;
  background: var(--surface-2);
  border-radius: 3px;
}

.disk {
  position: relative;
  height: 1.4rem;
  min-height: 1.4rem;
  margin-bottom: 2px;
  border-radius: 6px;
  background: var(--accent);
  color: #10121a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  transition: transform 0.15s ease;
}

.disk.lifted {
  transform: translateY(-8px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.peg-base {
  width: 90%;
  height: 6px;
  background: var(--surface-2);
  border-radius: 3px;
}

.peg-name {
  margin-top: 0.4rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-dim);
}

.actions-row {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.action-btn {
  background: var(--surface-2);
  color: var(--text);
  border: none;
  border-radius: 10px;
  padding: 0.7rem 0.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.paused-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 1rem;
  color: var(--text-dim);
}

.paused-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: 0.06em;
  margin: 0;
}

.resume-btn {
  background: var(--accent);
  color: #10121a;
  border: none;
  border-radius: 10px;
  padding: 0.85rem 1.75rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  min-width: 200px;
}

.restart-btn {
  background: var(--surface-2);
  color: var(--text);
  border: none;
  border-radius: 10px;
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  min-width: 200px;
}

.quit-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  padding: 0.5rem;
}
</style>
