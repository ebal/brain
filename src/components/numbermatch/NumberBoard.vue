<template>
  <div class="board-scroll">
    <div class="number-board" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
      <NumberCell
        v-for="(value, i) in cells"
        :key="i"
        :value="value"
        :selected="selected === i"
        :hinted="hintedSet.has(i)"
        :invalid="invalidSet.has(i)"
        @click="$emit('tap', i)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import NumberCell from './NumberCell.vue'

const props = defineProps({
  cols: { type: Number, required: true },
  cells: { type: Array, required: true },
  selected: { type: Number, default: null },
  hintPair: { type: Array, default: () => [] },
  invalidPair: { type: Array, default: () => [] },
})
defineEmits(['tap'])

const hintedSet = computed(() => new Set(props.hintPair || []))
const invalidSet = computed(() => new Set(props.invalidPair || []))
</script>

<style scoped>
.board-scroll {
  width: 100%;
  max-height: min(58vh, 480px);
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.number-board {
  display: grid;
  gap: 0.35rem;
  width: 100%;
}
</style>
