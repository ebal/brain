<template>
  <button
    class="sudoku-cell"
    :class="[
      { 'box-right': boxRight, 'box-bottom': boxBottom },
      { fixed: isFixed, hinted: isHinted, editable: !isFixed && !isHinted },
      { selected: isSelected, 'peer-highlight': isPeerHighlight && !isSelected },
      { 'value-highlight': isSameValueHighlight && !isSelected },
      { wrong: isWrong },
    ]"
    @click="$emit('click')"
  >
    <span v-if="value" class="value">{{ value }}</span>
    <div v-else-if="notes.length" class="notes-grid">
      <span v-for="n in 9" :key="n" class="note">{{ notes.includes(n) ? n : '' }}</span>
    </div>
  </button>
</template>

<script setup>
defineProps({
  value: { type: Number, default: 0 },
  notes: { type: Array, default: () => [] },
  isFixed: { type: Boolean, default: false },
  isHinted: { type: Boolean, default: false },
  isSelected: { type: Boolean, default: false },
  isPeerHighlight: { type: Boolean, default: false },
  isSameValueHighlight: { type: Boolean, default: false },
  isWrong: { type: Boolean, default: false },
  boxRight: { type: Boolean, default: false },
  boxBottom: { type: Boolean, default: false },
})
defineEmits(['click'])
</script>

<style scoped>
.sudoku-cell {
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: 0;
  color: var(--text);
  line-height: 1;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: background-color 0.1s ease;
  padding: 0;
}

.sudoku-cell.box-right {
  border-right: 2px solid var(--text-dim);
}

.sudoku-cell.box-bottom {
  border-bottom: 2px solid var(--text-dim);
}

.sudoku-cell.peer-highlight {
  background: var(--surface-2);
}

.sudoku-cell.value-highlight {
  background: color-mix(in srgb, var(--accent) 18%, var(--surface));
}

.sudoku-cell.selected {
  background: color-mix(in srgb, var(--accent) 40%, var(--surface));
}

.sudoku-cell.wrong {
  background: var(--wrong) !important;
}

.value {
  /* Fixed fraction of the actual cell width (board width / 9), computed in
     the parent — not a container-query unit. See Brain's own Schulte Tables
     history for why: cqmin misbehaves when combined with aspect-ratio
     inside a CSS Grid fr-track parent. */
  font-size: var(--cell-value-font);
  font-weight: 700;
}

.sudoku-cell.fixed .value {
  color: var(--text);
  font-weight: 800;
}

.sudoku-cell.editable .value {
  color: var(--accent);
  font-weight: 700;
}

.sudoku-cell.hinted .value {
  color: var(--correct);
  font-weight: 700;
}

.notes-grid {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 8%;
}

.note {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--cell-note-font);
  font-weight: 600;
  color: var(--text-dim);
  line-height: 1;
}
</style>
