<template>
  <button
    class="color-btn"
    :style="{ '--btn-color': color.hex, '--btn-text': textColor, '--btn-text-shadow': textShadow }"
    @click="$emit('click')"
  >
    {{ color.name }}
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  color: { type: Object, required: true },
})
defineEmits(['click'])

// Perceived-brightness (YIQ) check so light swatches (e.g. Yellow, Pink) get
// dark text instead of low-contrast white.
const textColor = computed(() => {
  const hex = props.color.hex.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 150 ? '#10121a' : '#ffffff'
})

const textShadow = computed(() =>
  textColor.value === '#ffffff'
    ? '0 1px 2px rgba(0, 0, 0, 0.5)'
    : '0 1px 2px rgba(255, 255, 255, 0.35)'
)
</script>

<style scoped>
.color-btn {
  background: var(--btn-color);
  border: none;
  border-radius: 10px;
  padding: 1.4rem 0.6rem;
  min-height: 3.25rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--btn-text);
  text-shadow: var(--btn-text-shadow);
  cursor: pointer;
  transition: transform 0.08s ease, filter 0.08s ease;
}

.color-btn:hover {
  filter: brightness(1.12);
}

.color-btn:active {
  transform: scale(0.95);
}
</style>
