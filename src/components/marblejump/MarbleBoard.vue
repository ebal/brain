<template>
  <svg class="marble-board" :viewBox="viewBox" preserveAspectRatio="xMidYMid meet">
    <MarbleHole
      v-for="cell in cells"
      :key="cell.idx"
      :x="cell.x"
      :y="cell.y"
      :radius="RADIUS"
      :occupied="occupied[cell.idx] === 1"
      :selected="selected === cell.idx"
      :legal="legalDestinations.includes(cell.idx)"
      :last-move="lastMoveCells.includes(cell.idx)"
      @click="$emit('tap', cell.idx)"
    />
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import MarbleHole from './MarbleHole.vue'
import { buildBoard } from '../../composables/marblejump/board.js'

const props = defineProps({
  n: { type: Number, required: true },
  occupied: { type: Array, required: true },
  selected: { type: Number, default: null },
  legalDestinations: { type: Array, default: () => [] },
  lastMoveCells: { type: Array, default: () => [] },
})
defineEmits(['tap'])

// Equilateral-triangle layout: each row is one ROW_HEIGHT (sqrt(3)/2) below
// the last, and each row's cells are centered under the apex.
const ROW_HEIGHT = 0.8660254
const RADIUS = 0.38
const MARGIN = 0.62

const cells = computed(() =>
  buildBoard(props.n).cells.map((c) => ({
    ...c,
    x: c.col - c.row / 2,
    y: c.row * ROW_HEIGHT,
  }))
)

const viewBox = computed(() => {
  const n = props.n
  const w = Math.max(0, n - 1) + MARGIN * 2
  const h = Math.max(0, n - 1) * ROW_HEIGHT + MARGIN * 2
  const x0 = -(n - 1) / 2 - MARGIN
  const y0 = -MARGIN
  return `${x0} ${y0} ${w} ${h}`
})
</script>

<style scoped>
.marble-board {
  width: 100%;
  max-width: 420px;
  aspect-ratio: 1 / 0.95;
}
</style>
