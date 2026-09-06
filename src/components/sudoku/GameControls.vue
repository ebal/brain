<template>
  <div class="controls">
    <button class="ctrl-btn" :class="{ active: notesMode }" @click="$emit('notes')">
      <span class="icon">✏️</span>
      <span class="label">Notes</span>
    </button>
    <button class="ctrl-btn" @click="$emit('erase')">
      <span class="icon">⌫</span>
      <span class="label">Erase</span>
    </button>
    <button class="ctrl-btn" :disabled="!canUndo" @click="$emit('undo')">
      <span class="icon">↶</span>
      <span class="label">Undo</span>
    </button>
    <button class="ctrl-btn" @click="$emit('hint')">
      <span class="icon">💡</span>
      <span class="label">Hint</span>
    </button>
    <button class="ctrl-btn" @click="$emit('pause')">
      <span class="icon">⏸</span>
      <span class="label">Pause</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  notesMode: { type: Boolean, default: false },
  canUndo: { type: Boolean, default: true },
})
defineEmits(['notes', 'erase', 'undo', 'hint', 'pause'])
</script>

<style scoped>
.controls {
  width: min(95vw, 480px);
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.4rem;
}

.ctrl-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.6rem 0.2rem;
  border: none;
  border-radius: 10px;
  background: var(--surface);
  color: var(--text-dim);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
}

.ctrl-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.ctrl-btn.active {
  background: var(--accent);
  color: #10121a;
}

.icon {
  font-size: 1.15rem;
  line-height: 1;
}
</style>
