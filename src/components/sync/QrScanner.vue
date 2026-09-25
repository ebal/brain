<template>
  <div class="scanner">
    <video v-show="state === 'scanning'" ref="video" class="scanner-video" playsinline muted aria-label="Camera preview"></video>
    <p v-if="state === 'starting'" class="scanner-note">Starting the camera…</p>
    <p v-else-if="state === 'scanning'" class="scanner-note">
      Point the camera at the QR code shown on your other device.
    </p>
    <p v-else-if="state === 'error'" class="scanner-note scanner-error" role="alert">{{ error }}</p>
  </div>
</template>

<script setup>
// In-app QR scanning for pairing (§10/§11). Runs inside the app — not the
// phone's camera app — so the pairing secret goes straight to this
// installation (on iOS, the Home Screen app and Safari don't share storage).
// The camera stream is stopped as soon as a code is read or the screen is
// left.
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { createFrameDecoder } from '../../composables/sync/qr.js'

const emit = defineEmits(['detected'])

const video = ref(null)
const state = ref('starting') // starting | scanning | error | done
const error = ref(null)
let stream = null
let timer = null
let stopped = false

function stop() {
  stopped = true
  clearTimeout(timer)
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
}

onMounted(async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    state.value = 'error'
    error.value = 'This browser can\'t use the camera here. Paste the pairing code or use your recovery code instead.'
    return
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
    if (stopped) return stop()
    video.value.srcObject = stream
    await video.value.play()
    const decode = await createFrameDecoder()
    state.value = 'scanning'
    const tick = async () => {
      if (stopped) return
      try {
        const text = await decode(video.value)
        if (text) {
          state.value = 'done'
          stop()
          emit('detected', text)
          return
        }
      } catch {
        // a bad frame — keep scanning
      }
      timer = setTimeout(tick, 200)
    }
    tick()
  } catch (err) {
    stop()
    state.value = 'error'
    error.value = err?.name === 'NotAllowedError'
      ? 'Camera access was declined. Paste the pairing code or use your recovery code instead.'
      : 'Couldn\'t start the camera. Paste the pairing code or use your recovery code instead.'
  }
})

onBeforeUnmount(stop)
</script>

<style scoped>
.scanner {
  text-align: center;
}

.scanner-video {
  width: min(80vw, 320px);
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 12px;
  background: #000;
}

.scanner-note {
  color: var(--text-dim);
  font-size: 0.88rem;
  line-height: 1.5;
}

.scanner-error {
  color: #e5a84d;
}
</style>
