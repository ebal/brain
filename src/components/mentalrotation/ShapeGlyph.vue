<template>
  <svg class="shape-glyph" :viewBox="viewBox" preserveAspectRatio="xMidYMid meet">
    <rect
      v-for="([r, c], i) in cells"
      :key="i"
      :x="c + PAD"
      :y="r + PAD"
      :width="1 - PAD * 2"
      :height="1 - PAD * 2"
      :rx="CORNER"
    />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

// Purely a geometry renderer — no notion of "correct" (SPEC §33: never
// encode the answer through different scale/alignment/stroke/quality).
// Identical rendering for the reference and every candidate; only the
// wrapping card (selection/feedback state) varies.
const props = defineProps({
  cells: { type: Array, required: true },
})

const PAD = 0.08
const CORNER = 0.12
const MARGIN = 0.35

const viewBox = computed(() => {
  const rows = props.cells.map(([r]) => r)
  const cols = props.cells.map(([, c]) => c)
  const minR = Math.min(...rows), maxR = Math.max(...rows)
  const minC = Math.min(...cols), maxC = Math.max(...cols)
  const w = maxC - minC + 1 + MARGIN * 2
  const h = maxR - minR + 1 + MARGIN * 2
  return `${minC - MARGIN} ${minR - MARGIN} ${w} ${h}`
})
</script>

<style scoped>
.shape-glyph {
  width: 100%;
  height: 100%;
  display: block;
}

.shape-glyph rect {
  fill: var(--accent);
}
</style>
