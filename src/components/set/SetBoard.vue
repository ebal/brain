<template>
  <div class="set-board">
    <SetCard
      v-for="card in board"
      :key="card.id"
      :number="card.number"
      :shape="card.shape"
      :color="card.color"
      :shading="card.shading"
      :selected="selected.includes(card.id)"
      :hinted="hintCardIds.includes(card.id)"
      :wrong="feedback === 'invalid' && selected.includes(card.id)"
      :valid="feedback === 'valid' && selected.includes(card.id)"
      :light-colors="lightColors"
      @click="$emit('select', card.id)"
    />
  </div>
</template>

<script setup>
import SetCard from './SetCard.vue'

defineProps({
  board: { type: Array, required: true },
  selected: { type: Array, default: () => [] },
  hintCardIds: { type: Array, default: () => [] },
  feedback: { type: String, default: null },
  lightColors: { type: Boolean, default: false },
})
defineEmits(['select'])
</script>

<style scoped>
.set-board {
  width: 100%;
  max-width: 480px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
}
</style>
