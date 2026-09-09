<template>
  <div class="mahjong-board" :style="boardStyle">
    <MahjongTile
      v-for="(slot, i) in slots"
      :key="i"
      :style="tileStyle(slot)"
      :emoji="emoji[i]"
      :removed="removed[i]"
      :free="!removed[i] && freeSet.has(i)"
      :selected="selected === i"
      :hinted="hintedSet.has(i)"
      :mismatch="mismatchSet.has(i)"
      :blocked-flash="blockedFlash === i"
      @click="$emit('tap', i)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MahjongTile from './MahjongTile.vue'
import { getLayout, isTileFree } from '../../composables/emojimahjong/board.js'

const props = defineProps({
  layoutId: { type: String, required: true },
  removed: { type: Array, required: true },
  emoji: { type: Array, required: true },
  selected: { type: Number, default: null },
  hintPair: { type: Array, default: () => [] },
  mismatchPair: { type: Array, default: () => [] },
  blockedFlash: { type: Number, default: null },
})
defineEmits(['tap'])

const slots = computed(() => getLayout(props.layoutId).slots)

// SPEC §7: slots use grid units where same-layer neighbors are 2 apart and
// a stacked tile is offset by 1 — dividing by 2 below converts that
// straight into tile-width steps for layout.
const bounds = computed(() => {
  const xs = slots.value.map((s) => s.x)
  const ys = slots.value.map((s) => s.y)
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
})

const cols = computed(() => (bounds.value.maxX - bounds.value.minX) / 2 + 1)
const rows = computed(() => (bounds.value.maxY - bounds.value.minY) / 2 + 1)

const boardStyle = computed(() => ({ aspectRatio: `${cols.value} / ${rows.value}` }))

const freeSet = computed(() => {
  const state = { layoutId: props.layoutId, removed: props.removed, emoji: props.emoji }
  const set = new Set()
  slots.value.forEach((_, i) => {
    if (!props.removed[i] && isTileFree(state, i)) set.add(i)
  })
  return set
})

const hintedSet = computed(() => new Set(props.hintPair || []))
const mismatchSet = computed(() => new Set(props.mismatchPair || []))

// SPEC §27: "slight offset, shadow, z-index and border to show overlap" —
// no 3D engine, just a small per-layer visual lift.
const LIFT_PCT = 0.6

function tileStyle(slot) {
  const leftPct = ((slot.x - bounds.value.minX) / 2 / cols.value) * 100
  const topPct = ((slot.y - bounds.value.minY) / 2 / rows.value) * 100
  const widthPct = 100 / cols.value
  const lift = slot.z * LIFT_PCT
  return {
    position: 'absolute',
    left: `${leftPct - lift}%`,
    top: `${topPct - lift}%`,
    width: `${widthPct}%`,
    zIndex: slot.z * 10 + 1,
  }
}
</script>

<style scoped>
.mahjong-board {
  position: relative;
  width: 100%;
  max-width: 480px;
}
</style>
