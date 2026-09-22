<template>
  <button
    v-if="!removed"
    class="mahjong-tile"
    :class="{ free, blocked: !free, selected, hinted, mismatch, 'blocked-flash': blockedFlash }"
    :aria-label="stateLabel"
    @click="$emit('click')"
  >
    <span class="emoji" aria-hidden="true">{{ emoji }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  emoji: { type: String, required: true },
  removed: { type: Boolean, default: false },
  free: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  hinted: { type: Boolean, default: false },
  mismatch: { type: Boolean, default: false },
  blockedFlash: { type: Boolean, default: false },
})
defineEmits(['click'])

// The emoji itself is aria-hidden (its exact identity matters for sighted
// matching, not for a screen-reader description) — state is what a
// non-visual player actually needs to know before tapping.
const stateLabel = computed(() => {
  const parts = [props.free ? 'Free tile' : 'Blocked tile']
  if (props.selected) parts.push('selected')
  if (props.hinted) parts.push('hinted')
  return parts.join(', ')
})
</script>

<style scoped>
.mahjong-tile {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 2px solid var(--surface-2);
  border-radius: 8px;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.25), 0 3px 6px rgba(0, 0, 0, 0.2);
  padding: 0;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: transform 0.08s ease, border-color 0.12s ease, background-color 0.12s ease, filter 0.12s ease, box-shadow 0.12s ease;
}

/* Free needs its own positive treatment, not just "not dimmed" — a
   brighter border and a more raised shadow, so the free/blocked gap reads
   at a glance instead of needing side-by-side comparison. */
.mahjong-tile.free {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--surface-2));
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.3), 0 5px 10px rgba(0, 0, 0, 0.3);
}

/* Flatter (reduced shadow), darker (blended toward black) and mildly
   desaturated (filter, not opacity — opacity alone barely reads on a
   dark background). The emoji is inside the same filtered element, so it
   dims and desaturates too, but mildly enough to stay identifiable. */
.mahjong-tile.blocked {
  background: color-mix(in srgb, black 22%, var(--surface));
  filter: saturate(0.6) brightness(0.82);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.15);
}

.mahjong-tile.free:not(.selected):active {
  transform: scale(0.93);
}

.emoji {
  font-size: clamp(0.8rem, 3.6vw, 1.6rem);
  line-height: 1;
}

.mahjong-tile.selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 18%, var(--surface));
}

.mahjong-tile.hinted {
  border-color: var(--correct);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--correct) 60%, transparent), 0 2px 0 rgba(0, 0, 0, 0.25);
}

.mahjong-tile.mismatch {
  border-color: var(--wrong);
  background: color-mix(in srgb, var(--wrong) 18%, var(--surface));
}

.mahjong-tile.blocked-flash {
  animation: blocked-shake 0.4s ease;
}

@keyframes blocked-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8%); }
  75% { transform: translateX(8%); }
}
</style>
