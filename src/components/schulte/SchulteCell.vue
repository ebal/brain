<template>
  <button
    class="schulte-cell"
    :class="[state, { interactive }]"
    :disabled="state === 'correct' || !interactive"
    @click="$emit('click')"
  >
    {{ number }}
  </button>
</template>

<script setup>
defineProps({
  number: { type: Number, required: true },
  state: { type: String, default: 'pending' }, // pending | correct | wrong
  interactive: { type: Boolean, default: true },
})
defineEmits(['click'])
</script>

<style scoped>
.schulte-cell {
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  white-space: nowrap;
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: 8px;
  color: var(--text);
  /* Set directly on the button rather than inherited from the grid — browsers
     don't reliably inherit font-size into form controls like <button>, which
     is why sizing it on the container alone wasn't taking effect. */
  font-size: calc(var(--board-width, 480px) / var(--grid-size, 5) * 0.5);
  line-height: 1;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: background-color 0.1s ease, border-color 0.1s ease, opacity 0.1s ease;
}

.schulte-cell:disabled {
  cursor: default;
}

.schulte-cell.correct {
  background: var(--surface-2);
  border-color: var(--surface-2);
  color: var(--text-dim);
  opacity: 0.6;
}

.schulte-cell.wrong {
  background: var(--wrong);
  border-color: var(--wrong);
  color: #fff;
}

.schulte-cell.pending.interactive:hover {
  border-color: var(--accent);
}
</style>
