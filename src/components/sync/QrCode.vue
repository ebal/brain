<template>
  <svg
    class="qr"
    :viewBox="`0 0 ${size} ${size}`"
    role="img"
    :aria-label="label"
    shape-rendering="crispEdges"
  >
    <!-- Always dark-on-white, whatever the app theme: scanners expect it. -->
    <rect width="100%" height="100%" fill="#ffffff" />
    <path :d="path" fill="#000000" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { qrMatrix, qrPath } from '../../composables/sync/qr.js'

const props = defineProps({
  value: { type: String, required: true },
  label: { type: String, default: 'QR code' },
})

const matrix = computed(() => qrMatrix(props.value))
const size = computed(() => matrix.value.length)
const path = computed(() => qrPath(matrix.value))
</script>

<style scoped>
.qr {
  display: block;
  width: min(72vw, 280px);
  height: auto;
  margin: 0 auto;
  border-radius: 8px;
}
</style>
