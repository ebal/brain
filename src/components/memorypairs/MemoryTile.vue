<template>
  <button
    class="memory-tile"
    :class="[state, { wrong }]"
    :disabled="state === 'matched'"
    @click="$emit('click')"
  >
    <span v-if="state !== 'facedown'" class="emoji">{{ emoji }}</span>
  </button>
</template>

<script setup>
defineProps({
  emoji: { type: String, required: true },
  state: { type: String, default: 'facedown' }, // facedown | revealed | matched
  wrong: { type: Boolean, default: false }, // brief mismatch flash
})
defineEmits(['click'])
</script>

<style scoped>
.memory-tile {
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 2px solid var(--surface-2);
  border-radius: 10px;
  cursor: pointer;
  padding: 0;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: background-color 0.12s ease, border-color 0.12s ease, opacity 0.12s ease, transform 0.08s ease;
}

.memory-tile:not(:disabled):active {
  transform: scale(0.95);
}

.emoji {
  font-size: clamp(1.3rem, 6vw, 2.2rem);
  line-height: 1;
}

.memory-tile.revealed {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
}

.memory-tile.matched {
  border-color: var(--correct);
  background: color-mix(in srgb, var(--correct) 12%, var(--surface));
  opacity: 0.6;
  cursor: default;
}

.memory-tile.wrong {
  border-color: var(--wrong);
  background: color-mix(in srgb, var(--wrong) 18%, var(--surface));
}
</style>
