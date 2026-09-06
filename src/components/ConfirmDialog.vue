<template>
  <div class="confirm-overlay" @click.self="$emit('cancel')">
    <div class="confirm-box">
      <p class="confirm-message">{{ message }}</p>
      <div class="confirm-actions">
        <button class="confirm-cancel" @click="$emit('cancel')">Cancel</button>
        <button class="confirm-ok" @click="$emit('confirm')">{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  message: { type: String, required: true },
  confirmLabel: { type: String, default: 'Exit' },
})
defineEmits(['confirm', 'cancel'])
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1.5rem;
}

.confirm-box {
  background: var(--surface);
  border-radius: 16px;
  padding: 1.5rem;
  max-width: 320px;
  width: 100%;
  text-align: center;
}

.confirm-message {
  color: var(--text);
  margin: 0 0 1.25rem;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
}

.confirm-actions button {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
}

.confirm-cancel {
  background: var(--surface-2);
  color: var(--text);
}

.confirm-ok {
  background: var(--wrong);
  color: #10121a;
}
</style>
