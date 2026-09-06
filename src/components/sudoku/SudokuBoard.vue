<template>
  <div class="board-wrap">
    <div class="sudoku-grid">
      <SudokuCell
        v-for="i in 81"
        :key="i"
        :value="values[rowOf(i - 1)][colOf(i - 1)]"
        :notes="notes[rowOf(i - 1)][colOf(i - 1)]"
        :is-fixed="fixedCells[rowOf(i - 1)][colOf(i - 1)]"
        :is-hinted="hintedCells[rowOf(i - 1)][colOf(i - 1)]"
        :is-selected="isSelected(rowOf(i - 1), colOf(i - 1))"
        :is-peer-highlight="isPeer(rowOf(i - 1), colOf(i - 1))"
        :is-same-value-highlight="isSameValue(rowOf(i - 1), colOf(i - 1))"
        :is-wrong="isWrong(rowOf(i - 1), colOf(i - 1))"
        :box-right="(colOf(i - 1) + 1) % 3 === 0 && colOf(i - 1) !== 8"
        :box-bottom="(rowOf(i - 1) + 1) % 3 === 0 && rowOf(i - 1) !== 8"
        @click="$emit('select', rowOf(i - 1), colOf(i - 1))"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SudokuCell from './SudokuCell.vue'

const props = defineProps({
  values: { type: Array, required: true },
  notes: { type: Array, required: true },
  fixedCells: { type: Array, required: true },
  hintedCells: { type: Array, required: true },
  selected: { type: Object, default: null },
  wrongCell: { type: Object, default: null },
})
defineEmits(['select'])

function rowOf(i) {
  return Math.floor(i / 9)
}
function colOf(i) {
  return i % 9
}

const selectedValue = computed(() => {
  if (!props.selected) return 0
  return props.values[props.selected.row][props.selected.col]
})

function isSelected(row, col) {
  return props.selected?.row === row && props.selected?.col === col
}

function isPeer(row, col) {
  if (!props.selected) return false
  const { row: sr, col: sc } = props.selected
  if (row === sr || col === sc) return true
  return Math.floor(row / 3) === Math.floor(sr / 3) && Math.floor(col / 3) === Math.floor(sc / 3)
}

function isSameValue(row, col) {
  if (!selectedValue.value) return false
  return props.values[row][col] === selectedValue.value
}

function isWrong(row, col) {
  return props.wrongCell?.row === row && props.wrongCell?.col === col
}
</script>

<style scoped>
.board-wrap {
  width: min(92vw, 480px);
  aspect-ratio: 1;
}

.sudoku-grid {
  --cell-value-font: calc(min(92vw, 480px) / 9 * 0.55);
  --cell-note-font: calc(min(92vw, 480px) / 27 * 0.7);
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  grid-template-rows: repeat(9, 1fr);
  border: 2px solid var(--text-dim);
  user-select: none;
}
</style>
