<template>
  <button
    type="button"
    class="sync-status"
    :class="`sync-status--${description.tone}`"
    :aria-label="ariaLabel"
    @click="$emit('open')"
  >
    <span v-if="description.icon" class="sync-icon" aria-hidden="true">{{ description.icon }}</span>
    <span class="sync-text">{{ description.text }}</span>
    <span v-if="description.detail" class="sync-detail">· {{ description.detail }}</span>
    <span v-if="syncStatus.state === 'local-only'" class="sync-cta">Enable Sync</span>
  </button>
</template>

<script setup>
// Subtle, always-visible sync status (BRAIN-SYNC-SPEC §41) for the landing
// screen. Informational only — it never blocks or interrupts play, and it
// only exists on builds configured with a sync server.
import { computed } from 'vue'
import { syncStatus, describeSyncStatus } from '../composables/sync/syncStatus.js'

defineEmits(['open'])

const description = computed(() => describeSyncStatus(syncStatus.value))
const ariaLabel = computed(() => {
  const d = description.value
  return `Brain Sync: ${d.text}${d.detail ? `, ${d.detail}` : ''}. Open Brain Sync settings.`
})
</script>

<style scoped>
.sync-status {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem;
  margin-top: 1rem;
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
}

.sync-status:hover {
  color: var(--text);
}

.sync-status--ok .sync-icon {
  color: var(--correct);
}

.sync-status--warn .sync-icon {
  color: #e5a84d;
}

.sync-detail {
  opacity: 0.85;
}

.sync-cta {
  color: var(--accent);
  text-decoration: underline;
  margin-left: 0.25rem;
}
</style>
