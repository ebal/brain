<template>
  <div class="game">
    <div v-if="generating" class="generating">
      <p>Generating {{ difficultyKey }} puzzle…</p>
    </div>

    <template v-else-if="status === 'paused'">
      <div class="paused-overlay">
        <p class="paused-title">PAUSED</p>
        <button class="resume-btn" @click="handleResume">Resume</button>
      </div>
    </template>

    <template v-else>
      <div class="hud">
        <div class="hud-left">
          <span class="difficulty-label">{{ difficultyLabel }}</span>
        </div>
        <span class="timer">{{ formattedTime }}</span>
      </div>
      <div class="hud">
        <span class="stat">Mistakes {{ mistakes }}</span>
        <span class="stat">Hints {{ hints }}</span>
      </div>

      <SudokuBoard
        :values="values"
        :notes="notes"
        :fixed-cells="fixedCells"
        :hinted-cells="hintedCells"
        :selected="selected"
        :wrong-cell="wrongFlash"
        @select="handleSelect"
      />

      <NumberPad :notes-mode="notesMode" @press="handleNumber" />

      <GameControls
        :notes-mode="notesMode"
        :can-undo="canUndo"
        @notes="handleToggleNotes"
        @erase="handleErase"
        @undo="handleUndo"
        @hint="handleHint"
        @pause="handlePause"
      />
    </template>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import SudokuBoard from './SudokuBoard.vue'
import NumberPad from './NumberPad.vue'
import GameControls from './GameControls.vue'
import { useSudokuGame } from '../../composables/sudoku/useSudokuGame.js'
import { useSudokuGenerator } from '../../composables/sudoku/useSudokuGenerator.js'
import { useSudokuStorage } from '../../composables/sudoku/useSudokuStorage.js'
import { useSudokuStats } from '../../composables/sudoku/useSudokuStats.js'
import { SUDOKU_DIFFICULTIES } from '../../constants/sudoku/difficulties.js'

const props = defineProps({
  difficultyKey: { type: String, default: null },
  continueGame: { type: Boolean, default: false },
})
const emit = defineEmits(['finished'])

const game = useSudokuGame()
const {
  status, values, notes, fixedCells, hintedCells, selected, notesMode, moveHistory,
  mistakes, hints, elapsedTime, wrongFlash, difficulty, results,
} = game

const { generate } = useSudokuGenerator()
const { getActive, saveActive, clearActive } = useSudokuStorage()
const { recordStart, recordCompletion } = useSudokuStats()

const generating = ref(false)
const canUndo = computed(() => moveHistory.value.length > 0)

const difficultyLabel = computed(() => {
  const key = difficulty.value || props.difficultyKey
  return SUDOKU_DIFFICULTIES[key]?.label || ''
})

const formattedTime = computed(() => {
  const totalSeconds = Math.floor(elapsedTime.value / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
})

function autosave() {
  if (status.value === 'playing' || status.value === 'paused') {
    saveActive(game.snapshot())
  }
}

function handleSelect(row, col) {
  game.selectCell(row, col)
}

function handleNumber(n) {
  game.enterNumber(n)
  autosave()
}

function handleErase() {
  game.eraseCell()
  autosave()
}

function handleUndo() {
  game.undo()
  autosave()
}

function handleHint() {
  game.useHint()
  autosave()
}

function handleToggleNotes() {
  game.toggleNotesMode()
}

function handlePause() {
  game.pause()
  autosave()
}

function handleResume() {
  game.resumeTimer()
}

function handleVisibilityChange() {
  if (document.hidden && status.value === 'playing') handlePause()
}

function moveSelection(dr, dc) {
  const base = selected.value || { row: 0, col: 0 }
  const row = Math.min(8, Math.max(0, base.row + dr))
  const col = Math.min(8, Math.max(0, base.col + dc))
  game.selectCell(row, col)
}

function handleKeydown(e) {
  if (status.value !== 'playing') return
  if (e.key >= '1' && e.key <= '9') {
    handleNumber(Number(e.key))
  } else if (e.key === 'Backspace' || e.key === 'Delete') {
    handleErase()
  } else if (e.key.toLowerCase() === 'n') {
    handleToggleNotes()
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    handleUndo()
  } else if (e.key === 'ArrowUp') moveSelection(-1, 0)
  else if (e.key === 'ArrowDown') moveSelection(1, 0)
  else if (e.key === 'ArrowLeft') moveSelection(0, -1)
  else if (e.key === 'ArrowRight') moveSelection(0, 1)
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  if (props.continueGame) {
    const saved = getActive()
    if (saved) game.resumeFromSave(saved)
    return
  }

  generating.value = true
  try {
    const generated = await generate(props.difficultyKey)
    game.start(props.difficultyKey, generated)
    recordStart(props.difficultyKey)
    autosave()
  } finally {
    generating.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (status.value === 'playing' || status.value === 'paused') autosave()
  game.reset()
})

watch(status, (val) => {
  if (val === 'finished') {
    const r = results.value
    const summary = recordCompletion(difficulty.value, r)
    clearActive()
    emit('finished', { ...r, ...summary })
  }
})
</script>

<style scoped>
.game {
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.generating,
.paused-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 1rem;
  color: var(--text-dim);
}

.paused-title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: 0.1em;
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
}

.hud {
  width: min(92vw, 480px);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.difficulty-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--accent);
  text-transform: capitalize;
}

.timer {
  font-variant-numeric: tabular-nums;
  color: var(--text-dim);
  font-size: 0.95rem;
}

.stat {
  font-size: 0.85rem;
  color: var(--text-dim);
}
</style>
