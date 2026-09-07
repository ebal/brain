<template>
  <div class="board" :style="boardStyle">
    <TrailTarget
      v-for="target in layout"
      :key="target.label"
      :label="target.label"
      :x="target.x"
      :y="target.y"
      :state="target.state"
      :revealed="revealed"
      :color="target.color"
      :flash-wrong="target.label === wrongLabel"
      @tap="$emit('tap', $event)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TrailTarget from './TrailTarget.vue'
import { BOARD_WIDTH, BOARD_HEIGHT } from '../../composables/switchtrail/trailLayout.js'

defineProps({
  layout: { type: Array, required: true },
  revealed: { type: Boolean, default: true },
  wrongLabel: { type: String, default: null },
})
defineEmits(['tap'])

const boardStyle = computed(() => ({ aspectRatio: `${BOARD_WIDTH} / ${BOARD_HEIGHT}` }))
</script>

<style scoped>
.board {
  position: relative;
  width: min(90vw, 340px);
  margin: 0 auto;
  background: var(--surface);
  border-radius: 16px;
  user-select: none;
}
</style>
