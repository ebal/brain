<template>
  <button
    class="hole"
    :class="{ active: state !== 'empty' }"
    :disabled="!interactive"
    @click="$emit('click')"
  >
    <span v-if="state === 'mole'" class="emoji" aria-hidden="true">🐹</span>
    <span v-else-if="state === 'distractor'" class="emoji" aria-hidden="true">🐰</span>
  </button>
</template>

<script setup>
defineProps({
  state: { type: String, default: 'empty' }, // 'empty' | 'mole' | 'distractor'
  interactive: { type: Boolean, default: true },
})
defineEmits(['click'])
</script>

<style scoped>
.hole {
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 2px solid var(--surface-2);
  border-radius: 50%;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: border-color 0.08s ease, transform 0.08s ease;
}

.hole:disabled {
  cursor: default;
}

.hole.active {
  border-color: var(--accent);
}

.emoji {
  font-size: clamp(1.6rem, 9vw, 3rem);
  line-height: 1;
  animation: pop 0.12s ease-out;
}

@keyframes pop {
  from { transform: scale(0.6); }
  to { transform: scale(1); }
}
</style>
