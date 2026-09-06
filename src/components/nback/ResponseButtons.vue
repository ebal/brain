<template>
  <div class="response-buttons">
    <button
      class="response-btn no-match"
      :disabled="disabled"
      @click="$emit('answer', 'noMatch')"
    >
      NO MATCH
    </button>
    <button
      class="response-btn match"
      :disabled="disabled"
      @click="$emit('answer', 'match')"
    >
      MATCH
    </button>
  </div>
</template>

<script setup>
defineProps({
  disabled: { type: Boolean, default: false },
})
defineEmits(['answer'])
</script>

<style scoped>
.response-buttons {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.response-btn {
  padding: 1.5rem 1rem;
  min-height: 5rem;
  border-radius: 14px;
  border: none;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: transform 0.08s ease, filter 0.08s ease, opacity 0.1s ease;
}

.response-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.response-btn:not(:disabled):active {
  transform: scale(0.96);
}

.response-btn.no-match {
  background: var(--surface-2);
  color: var(--text);
}

.response-btn.match {
  background: var(--accent);
  color: #10121a;
}

.response-btn:not(:disabled):hover {
  filter: brightness(1.1);
}
</style>
