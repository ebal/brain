<template>
  <button
    class="memory-cell"
    :class="{ active: isActive, wrong: isWrong }"
    @click="$emit('click')"
  ></button>
</template>

<script setup>
defineProps({
  isActive: { type: Boolean, default: false },
  isWrong: { type: Boolean, default: false },
})
defineEmits(['click'])
</script>

<style scoped>
.memory-cell {
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  background: var(--surface);
  border: 2px solid var(--surface-2);
  border-radius: 10px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: background-color 0.08s ease, border-color 0.08s ease;
}

.memory-cell.active {
  background: var(--accent);
  border-color: var(--accent);
}

.memory-cell.wrong {
  background: var(--wrong);
  border-color: var(--wrong);
}
</style>
