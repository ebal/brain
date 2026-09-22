<template>
  <button
    class="memory-cell"
    :class="{ active: isActive, wrong: isWrong }"
    :disabled="!interactive"
    :aria-label="`Row ${row}, column ${col}`"
    @click="$emit('click')"
  ></button>
</template>

<script setup>
// No aria-pressed here — unlike Lights Out, a cell has no persistent
// on/off state to report (SPEC: "cells have no permanent identity, only a
// temporary flash"). Position is the only thing that stays stable and
// worth announcing; the active/wrong flash is inherently a fast, visual-
// only cue that a screen reader couldn't usefully keep up with either way.
defineProps({
  isActive: { type: Boolean, default: false },
  isWrong: { type: Boolean, default: false },
  interactive: { type: Boolean, default: false },
  row: { type: Number, required: true },
  col: { type: Number, required: true },
})
defineEmits(['click'])
</script>

<style scoped>
.memory-cell {
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  background: var(--surface);
  border: 2px solid var(--surface-2);
  border-radius: 10px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: background-color 0.08s ease, border-color 0.08s ease;
}

.memory-cell:disabled {
  cursor: default;
}

.memory-cell.active {
  background: var(--accent);
  border-color: var(--accent);
}

.memory-cell.wrong {
  background: var(--wrong);
  border-color: var(--wrong);
}
</style>
