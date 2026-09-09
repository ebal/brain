<template>
  <div v-if="value === null" class="number-cell empty" />
  <button
    v-else
    class="number-cell"
    :class="{ selected, hinted, invalid }"
    @click="$emit('click')"
  >
    {{ value }}
  </button>
</template>

<script setup>
defineProps({
  value: { type: Number, default: null },
  selected: { type: Boolean, default: false },
  hinted: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
})
defineEmits(['click'])
</script>

<style scoped>
.number-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(0.85rem, 4vw, 1.4rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: var(--surface);
  border: 2px solid var(--surface-2);
  border-radius: 8px;
  padding: 0;
  cursor: pointer;
  color: var(--text);
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: transform 0.08s ease, border-color 0.12s ease, background-color 0.12s ease;
}

.number-cell.empty {
  background: transparent;
  border-color: transparent;
}

.number-cell:not(.empty):active {
  transform: scale(0.92);
}

.number-cell.selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 18%, var(--surface));
}

.number-cell.hinted {
  border-color: var(--correct);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--correct) 55%, transparent);
}

.number-cell.invalid {
  border-color: var(--wrong);
  background: color-mix(in srgb, var(--wrong) 18%, var(--surface));
}
</style>
