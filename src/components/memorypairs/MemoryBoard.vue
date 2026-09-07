<template>
  <div
    class="memory-board"
    :style="{ '--portrait-cols': portraitCols, '--landscape-cols': cols }"
  >
    <MemoryTile
      v-for="tile in tiles"
      :key="tile.id"
      :emoji="tile.emoji"
      :state="tile.state"
      :wrong="wrongIds.includes(tile.id)"
      @click="$emit('tap', tile.id)"
    />
  </div>
</template>

<script setup>
import MemoryTile from './MemoryTile.vue'

defineProps({
  tiles: { type: Array, required: true },
  cols: { type: Number, required: true },
  portraitCols: { type: Number, required: true },
  wrongIds: { type: Array, default: () => [] },
})
defineEmits(['tap'])
</script>

<style scoped>
/* Mobile-first default (SPEC §24): the narrower, taller portrait layout.
   Tile count and pair count never change — only how many columns the same
   flat tile array wraps into. */
.memory-board {
  width: 100%;
  max-width: 480px;
  display: grid;
  grid-template-columns: repeat(var(--portrait-cols), 1fr);
  gap: 0.5rem;
}

@media (min-width: 600px) {
  .memory-board {
    grid-template-columns: repeat(var(--landscape-cols), 1fr);
  }
}
</style>
