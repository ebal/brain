<template>
  <div class="memory-grid">
    <MemoryCell
      v-for="i in 9"
      :key="i - 1"
      :is-active="activeCell === i - 1 || (tapFeedback?.cell === i - 1 && tapFeedback.correct)"
      :is-wrong="tapFeedback?.cell === i - 1 && !tapFeedback.correct"
      @click="interactive && $emit('select', i - 1)"
    />
  </div>
</template>

<script setup>
import MemoryCell from './MemoryCell.vue'

defineProps({
  activeCell: { type: Number, default: null },
  tapFeedback: { type: Object, default: null },
  interactive: { type: Boolean, default: false },
})
defineEmits(['select'])
</script>

<style scoped>
.memory-grid {
  width: 100%;
  max-width: 380px;
  aspect-ratio: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 0.75rem;
}
</style>
