<template>
  <button
    class="oddoneout-cell"
    :class="{ wrong: isWrong, 'multi-char': value.length > 1 }"
    :disabled="!interactive"
    @click="$emit('click')"
  >
    {{ value }}
  </button>
</template>

<script setup>
defineProps({
  value: { type: String, required: true },
  isWrong: { type: Boolean, default: false }, // brief flash on the last mistapped cell (SPEC §13)
  interactive: { type: Boolean, default: true },
})
defineEmits(['click'])
</script>

<style scoped>
/* SPEC §10: every cell shares exactly the same font family/size/weight/
   letter-spacing/line-height/alignment — only the character differs. The
   odd cell gets no separate visual treatment beyond the brief, deliberate
   .wrong flash on a MISTAPPED cell (never on the odd cell itself, SPEC §26). */
.oddoneout-cell {
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
  /* Same "set on the button itself" approach as SchulteCell.vue — font-size
     doesn't reliably inherit into <button> from the grid container. */
  font-size: calc(var(--board-width, 480px) / var(--grid-size, 5) * 0.5);
  font-weight: 700;
  letter-spacing: normal;
  line-height: 1;
  text-align: center;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: background-color 0.1s ease, border-color 0.1s ease;
}

/* Two-character stimuli (68/86 etc., SPEC §4/§9) need a smaller size to fit
   without shrinking the single-character cells around them. */
.oddoneout-cell.multi-char {
  font-size: calc(var(--board-width, 480px) / var(--grid-size, 5) * 0.32);
}

.oddoneout-cell:disabled {
  cursor: default;
}

.oddoneout-cell.wrong {
  background: var(--wrong);
  border-color: var(--wrong);
  color: #fff;
}
</style>
