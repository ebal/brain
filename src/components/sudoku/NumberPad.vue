<template>
  <div class="number-pad">
    <button
      v-for="n in 9"
      :key="n"
      class="num-btn"
      :class="{ 'notes-mode': notesMode }"
      @click="$emit('press', n)"
    >
      {{ n }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  notesMode: { type: Boolean, default: false },
})
defineEmits(['press'])
</script>

<style scoped>
.number-pad {
  width: min(92vw, 480px);
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 0.35rem;
}

.num-btn {
  aspect-ratio: 1;
  border: none;
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: background-color 0.1s ease;
}

.num-btn:active {
  background: var(--surface-2);
}

.num-btn.notes-mode {
  border: 2px solid var(--accent);
  color: var(--accent);
}
</style>
