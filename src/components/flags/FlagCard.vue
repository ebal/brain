<template>
  <button
    class="flag-card"
    :class="{ correct: state === 'correct', wrong: state === 'wrong', dimmed: state === 'dimmed' }"
    :disabled="disabled"
    :aria-label="revealName ? country.name : 'Flag option'"
    @click="$emit('click')"
  >
    <span class="flag-box">
      <img :src="`/flags/${country.code}.svg`" :alt="revealName ? country.name : ''" class="flag-img" draggable="false" />
    </span>
    <span v-if="revealName" class="flag-name">{{ country.name }}</span>
  </button>
</template>

<script setup>
// SPEC §22: every card uses identical box/border/padding regardless of a
// given flag's own aspect ratio, so asset dimensions never hint the answer.
// `country` codes/serves the SVG straight from public/flags/ — a static
// asset, not bundled/hashed by Vite, so a plain root-relative <img src> is
// correct here (no new URL()/import).
defineProps({
  country: { type: Object, required: true }, // { code, name, ... } from countries.js
  disabled: { type: Boolean, default: false },
  revealName: { type: Boolean, default: false }, // feedback state: show the name under the flag
  state: { type: String, default: null }, // null | 'correct' | 'wrong' | 'dimmed'
})
defineEmits(['click'])
</script>

<style scoped>
.flag-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: var(--surface);
  border: 2px solid var(--surface-2);
  border-radius: 14px;
  padding: 0.6rem;
  cursor: pointer;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;
  transition: border-color 0.15s ease, transform 0.08s ease, opacity 0.15s ease;
}

.flag-card:not(:disabled):hover {
  border-color: var(--accent);
}

.flag-card:disabled {
  cursor: default;
}

.flag-card.correct {
  border-color: var(--correct);
}

.flag-card.wrong {
  border-color: var(--wrong);
}

.flag-card.dimmed {
  opacity: 0.45;
}

.flag-box {
  width: 100%;
  aspect-ratio: 3 / 2;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--stimulus-bg);
  border-radius: 8px;
  overflow: hidden;
  padding: 0.35rem;
}

.flag-img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  pointer-events: none;
}

.flag-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
  text-align: center;
}
</style>
