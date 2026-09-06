<template>
  <button
    class="set-card"
    :class="{ selected, wrong, hinted, correct: valid }"
    @click="$emit('click')"
  >
    <svg viewBox="0 0 200 300" class="card-svg">
      <defs>
        <pattern :id="patternId" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="white" />
          <line x1="0" y1="0" x2="0" y2="8" :stroke="colorHex" stroke-width="3" />
        </pattern>
      </defs>
      <g v-for="(y, i) in symbolPositions" :key="i" :transform="`translate(20, ${y})`">
        <path
          v-if="shape === 0"
          d="M 80 0 L 160 35 L 80 70 L 0 35 Z"
          :fill="fillValue"
          :stroke="colorHex"
          stroke-width="6"
          stroke-linejoin="round"
        />
        <rect
          v-else-if="shape === 1"
          width="160"
          height="70"
          rx="35"
          ry="35"
          :fill="fillValue"
          :stroke="colorHex"
          stroke-width="6"
        />
        <path
          v-else
          d="M 10,45 C 5,25 15,5 35,5 C 55,5 55,20 70,20
             C 90,20 95,0 120,5 C 150,10 160,30 150,45
             C 155,60 145,65 130,65 C 105,65 105,50 85,50
             C 65,50 65,68 40,68 C 15,68 12,60 10,45 Z"
          :fill="fillValue"
          :stroke="colorHex"
          stroke-width="6"
          stroke-linejoin="round"
        />
      </g>
    </svg>
  </button>
</template>

<script>
// Module scope — runs once per module load, not once per instance — so this
// keeps incrementing across every card rather than resetting to 0 each time
// (which is what happens to any counter declared inside <script setup>).
let patternIdCounter = 0
</script>

<script setup>
import { computed } from 'vue'
import { COLOR_HEX } from '../../constants/set/cardProperties.js'

const patternId = `set-stripe-${patternIdCounter++}`

const props = defineProps({
  number: { type: Number, required: true },
  shape: { type: Number, required: true },
  color: { type: Number, required: true },
  shading: { type: Number, required: true },
  selected: { type: Boolean, default: false },
  wrong: { type: Boolean, default: false },
  hinted: { type: Boolean, default: false },
  valid: { type: Boolean, default: false },
})
defineEmits(['click'])

const colorHex = computed(() => COLOR_HEX[props.color])

const fillValue = computed(() => {
  if (props.shading === 0) return colorHex.value // solid
  if (props.shading === 1) return `url(#${patternId})` // striped
  return 'none' // open
})

const symbolPositions = computed(() => {
  const count = props.number + 1
  const symbolHeight = 70
  const gap = 20
  const totalHeight = count * symbolHeight + (count - 1) * gap
  const startY = (300 - totalHeight) / 2
  return Array.from({ length: count }, (_, i) => startY + i * (symbolHeight + gap))
})
</script>

<style scoped>
.set-card {
  width: 100%;
  height: 100%;
  aspect-ratio: 2 / 3;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6%;
  background: var(--surface);
  border: 2px solid var(--surface-2);
  border-radius: 10px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: border-color 0.12s ease, background-color 0.12s ease, transform 0.08s ease;
}

.set-card:active {
  transform: scale(0.97);
}

.card-svg {
  width: 100%;
  height: 100%;
}

.set-card.selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
}

.set-card.hinted {
  border-color: var(--correct);
}

.set-card.wrong {
  border-color: var(--wrong);
  background: color-mix(in srgb, var(--wrong) 18%, var(--surface));
}

.set-card.correct {
  border-color: var(--correct);
  background: color-mix(in srgb, var(--correct) 18%, var(--surface));
}
</style>
