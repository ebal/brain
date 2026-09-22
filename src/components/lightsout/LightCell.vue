<template>
  <button
    class="light-cell"
    :class="{ on: isOn, hint: isHint }"
    :disabled="!interactive"
    :aria-pressed="isOn"
    :aria-label="label"
    @click="$emit('click')"
  >
    <span class="bulb" aria-hidden="true"></span>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  isOn: { type: Boolean, required: true },
  isHint: { type: Boolean, default: false },
  interactive: { type: Boolean, default: true },
  row: { type: Number, required: true },
  col: { type: Number, required: true },
})
defineEmits(['click'])

// aria-pressed above already carries on/off as a toggle-button state for
// anyone using that directly; the label spells it out too since not every
// screen reader announces aria-pressed the same way, and position (this
// is a grid, not a list) is otherwise completely unavailable non-visually.
const label = computed(() => {
  const state = props.isOn ? 'on' : 'off'
  const hint = props.isHint ? ', hinted' : ''
  return `Row ${props.row}, column ${props.col}, light ${state}${hint}`
})
</script>

<style scoped>
/* SPEC "Mobile UX": "ON/OFF must not rely on color alone" — ON is a
   filled, bright bulb; OFF is an outline-only, dim one. The shape/fill
   difference carries the state, not just a color swap. */
.light-cell {
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 2px solid var(--surface-2);
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: border-color 0.1s ease;
}

.light-cell:disabled {
  cursor: default;
}

.bulb {
  width: 55%;
  height: 55%;
  border-radius: 50%;
  border: 2px solid var(--text-dim);
  background: transparent;
  transition: background-color 0.1s ease, border-color 0.1s ease, box-shadow 0.1s ease;
}

.light-cell.on .bulb {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 10px var(--accent);
}

.light-cell.hint {
  border-color: var(--correct);
  border-style: dashed;
}
</style>
