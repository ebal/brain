<template>
  <g
    class="marble-hole"
    :class="{ occupied, empty: !occupied, selected, legal, 'last-move': lastMove }"
    :transform="`translate(${x} ${y})`"
    role="button"
    tabindex="0"
    :aria-label="label"
    :aria-pressed="selected"
    @click="$emit('click')"
    @keydown.enter="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <circle class="pit" :r="radius" />
    <circle v-if="occupied" class="marble" :r="radius * 0.82" />
    <circle v-if="occupied" class="marble-shine" :cx="-radius * 0.28" :cy="-radius * 0.28" :r="radius * 0.22" />
    <circle v-if="legal && !occupied" class="legal-ring" :r="radius * 0.42" />
    <circle v-if="selected" class="selected-ring" :r="radius * 1.22" />
  </g>
</template>

<script setup>
// This is an SVG <g>, not a <button> — unlike every other board-cell fix
// in this pass, it had ZERO keyboard semantics to begin with: a <g> is
// never natively focusable, so role="button" + tabindex="0" +
// Enter/Space keydown handlers are all doing real work here, not just
// adding a label on top of already-working keyboard support.
import { computed } from 'vue'

const props = defineProps({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  radius: { type: Number, required: true },
  occupied: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  legal: { type: Boolean, default: false },
  lastMove: { type: Boolean, default: false },
  row: { type: Number, required: true },
  col: { type: Number, required: true },
})
defineEmits(['click'])

const label = computed(() => {
  const position = `Row ${props.row + 1}, position ${props.col + 1}`
  const state = [props.occupied ? 'marble' : 'empty']
  if (props.legal) state.push('legal jump destination')
  if (props.selected) state.push('selected')
  if (props.lastMove) state.push('part of the last move')
  return `${position}, ${state.join(', ')}`
})
</script>

<style scoped>
.marble-hole {
  cursor: pointer;
  touch-action: manipulation;
}

/* A plain browser outline on an SVG <g> renders inconsistently across
   browsers (Safari in particular) — an explicit ring on the pit itself
   guarantees a visible focus indicator for keyboard users. */
.marble-hole:focus-visible {
  outline: none;
}

.marble-hole:focus-visible .pit {
  stroke: var(--accent);
  stroke-width: 0.06;
}

.pit {
  fill: var(--surface-2);
  stroke: var(--surface);
  stroke-width: 0.02;
}

.marble {
  fill: var(--accent);
}

.marble-shine {
  fill: #ffffff;
  opacity: 0.35;
  pointer-events: none;
}

.legal-ring {
  fill: none;
  stroke: var(--accent);
  stroke-width: 0.06;
  opacity: 0.75;
}

.selected-ring {
  fill: none;
  stroke: var(--correct);
  stroke-width: 0.07;
}

.last-move .pit {
  stroke: var(--text-dim);
  stroke-width: 0.03;
}
</style>
