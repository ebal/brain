<template>
  <g
    class="marble-hole"
    :class="{ occupied, empty: !occupied, selected, legal, 'last-move': lastMove }"
    :transform="`translate(${x} ${y})`"
    @click="$emit('click')"
  >
    <circle class="pit" :r="radius" />
    <circle v-if="occupied" class="marble" :r="radius * 0.82" />
    <circle v-if="occupied" class="marble-shine" :cx="-radius * 0.28" :cy="-radius * 0.28" :r="radius * 0.22" />
    <circle v-if="legal && !occupied" class="legal-ring" :r="radius * 0.42" />
    <circle v-if="selected" class="selected-ring" :r="radius * 1.22" />
  </g>
</template>

<script setup>
defineProps({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  radius: { type: Number, required: true },
  occupied: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  legal: { type: Boolean, default: false },
  lastMove: { type: Boolean, default: false },
})
defineEmits(['click'])
</script>

<style scoped>
.marble-hole {
  cursor: pointer;
  touch-action: manipulation;
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
