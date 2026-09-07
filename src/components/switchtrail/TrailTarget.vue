<template>
  <button
    class="trail-target"
    :class="{ done: state === 'done', wrong: flashWrong }"
    :style="style"
    :aria-label="revealed ? `Target ${label}` : 'Hidden target'"
    @click="$emit('tap', label)"
  >
    <span v-if="revealed" class="label">{{ label }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { BOARD_WIDTH, BOARD_HEIGHT, TARGET_RADIUS } from '../../composables/switchtrail/trailLayout.js'
import { textColorFor } from '../../constants/cellColors.js'

const props = defineProps({
  label: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  state: { type: String, default: 'pending' }, // 'pending' | 'done'
  revealed: { type: Boolean, default: true },
  flashWrong: { type: Boolean, default: false },
  color: { type: String, default: null }, // Random Color variant — a per-label hex, or null
})
defineEmits(['tap'])

// Base position/size — always applied regardless of variant (SPEC §22: numbers
// and letters otherwise share identical size/weight; only the .done (muted)
// state differs by default, and only after the label is revealed).
const style = computed(() => {
  const base = {
    left: `${(props.x / BOARD_WIDTH) * 100}%`,
    top: `${(props.y / BOARD_HEIGHT) * 100}%`,
    width: `${((TARGET_RADIUS * 2) / BOARD_WIDTH) * 100}%`,
    height: `${((TARGET_RADIUS * 2) / BOARD_HEIGHT) * 100}%`,
  }
  // Random Color variant — only while pending, revealed, and not mid wrong-
  // tap flash. Unlike Schulte, a wrong tap here doesn't change `state` (it
  // stays 'pending', only `flashWrong` pulses) — an inline style always
  // outranks a CSS class, so without excluding flashWrong here the random
  // background would silently swallow the .wrong red flash below.
  if (props.revealed && props.state === 'pending' && props.color && !props.flashWrong) {
    base.background = props.color
    base.color = textColorFor(props.color)
  }
  return base
})
</script>

<style scoped>
.trail-target {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  /* border-radius only affects paint, not hit-testing — without this, the
     square bounding box stays fully clickable, and two targets placed near
     minSpacing on a diagonal can have overlapping invisible corners that
     steal taps meant for the neighboring circle. Clipping the hit area to
     match the visible circle exactly is what actually fixes that. */
  clip-path: circle(50%);
  background: var(--surface);
  border: 2px solid var(--surface-2);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(0.8rem, 3.2vw, 1.1rem);
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  user-select: none;
  touch-action: manipulation;
  transition: background 0.12s ease, border-color 0.12s ease, opacity 0.12s ease;
}

.trail-target.done {
  opacity: 0.35;
  border-color: var(--correct);
  cursor: default;
}

/* style.css sets a global button:active { transform: scale(0.97) } for tap
   feedback — a plain `transform` on this element would win, replacing (not
   combining with) the translate(-50%, -50%) above and snapping the target
   away from its actual position for the duration of the press. Re-stating
   both in one declaration, scoped here so it outranks the global rule, is
   what keeps the target under the finger/cursor while still scaling. */
.trail-target:not(:disabled):active {
  transform: translate(-50%, -50%) scale(0.97);
}

.trail-target.wrong {
  border-color: var(--wrong);
  background: color-mix(in srgb, var(--wrong) 25%, var(--surface));
}
</style>
