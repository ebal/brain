<template>
  <div class="confirm-overlay" @click.self="$emit('cancel')">
    <div
      class="confirm-box"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="messageId"
      @keydown.esc="$emit('cancel')"
      @keydown.tab="handleTab"
    >
      <p :id="messageId" class="confirm-message">{{ message }}</p>
      <div class="confirm-actions">
        <button ref="cancelBtn" class="confirm-cancel" @click="$emit('cancel')">Cancel</button>
        <button ref="okBtn" class="confirm-ok" @click="$emit('confirm')">{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, useId, onMounted, onUnmounted } from 'vue'

defineProps({
  message: { type: String, required: true },
  confirmLabel: { type: String, default: 'Exit' },
})
defineEmits(['confirm', 'cancel'])

// Unique per instance (Vue 3.5's useId()) rather than a hardcoded string —
// every call site mounts at most one of these at a time today, but nothing
// stops that from changing later, and a duplicate id would break
// aria-labelledby silently.
const messageId = useId()

const cancelBtn = ref(null)
const okBtn = ref(null)
let previouslyFocused = null

// Only two focusable elements in this dialog — trapped by hand rather than
// pulling in a focus-trap library for one modal. Cancel is the default
// focus (not OK) since every use of this dialog confirms something
// destructive (exiting/restarting and losing progress) — Enter should
// never confirm that by accident before the user has looked at it.
function handleTab(event) {
  if (event.shiftKey && document.activeElement === cancelBtn.value) {
    event.preventDefault()
    okBtn.value?.focus()
  } else if (!event.shiftKey && document.activeElement === okBtn.value) {
    event.preventDefault()
    cancelBtn.value?.focus()
  }
}

onMounted(() => {
  previouslyFocused = document.activeElement
  cancelBtn.value?.focus()
})

onUnmounted(() => {
  previouslyFocused?.focus?.()
})
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
