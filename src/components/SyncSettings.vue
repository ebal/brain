<template>
  <div class="sync-settings">
    <h1>Brain Sync</h1>

    <!-- ── Not configured on this build ─────────────────────────────── -->
    <section v-if="!available" class="card">
      <p class="card-desc">
        Sync isn't set up on this copy of Brain. Everything still works, and your progress is stored
        on this device. You can move it with Export/Import under Manage Your Data.
      </p>
    </section>

    <!-- ── Recovery code, shown exactly once ────────────────────────── -->
    <section v-else-if="view === 'recovery'" class="card">
      <h2>Your recovery code</h2>
      <p class="card-desc">
        Use it to connect a new device when none of your other devices is at hand. Keep it somewhere
        safe, like a password manager or on paper. It's shown only this once, and Brain can't show it
        again.
      </p>
      <!-- Each group is unbreakable, so a narrow screen wraps between groups, never inside one. -->
      <p class="recovery-code" aria-label="Recovery code">
        <span v-for="(group, i) in recoveryGroups" :key="i" class="code-group">{{ group }}</span>
      </p>
      <button class="secondary-btn" @click="copy(shownRecoveryCode, 'Recovery code copied.')">Copy</button>
      <p class="warning">
        There's no email or password behind Brain Sync. If you lose all your devices <strong>and</strong>
        this code, your cloud copy can't be recovered. Progress already on a device stays there.
      </p>
      <label class="check-label">
        <input v-model="recoverySaved" type="checkbox" />
        I've saved my recovery code
      </label>
      <button class="primary-btn" :disabled="!recoverySaved" @click="closeRecovery">Done</button>
    </section>

    <!-- ── Add a device: show the QR ────────────────────────────────── -->
    <section v-else-if="view === 'add-device'" class="card">
      <h2>Add a device</h2>
      <template v-if="joinedDevice">
        <p class="success-text" role="status">✓ {{ joinedDevice }} is now connected.</p>
        <button class="primary-btn" @click="leaveAddDevice">Done</button>
      </template>
      <template v-else-if="pairing">
        <p class="card-desc">
          On the new device, open Brain → Brain Sync → <strong>Scan QR code</strong>, and point it at
          this code.
        </p>
        <QrCode :value="pairing.payload" label="Pairing QR code" />
        <p class="countdown" aria-live="off">
          {{ secondsLeft > 0 ? `Expires in ${formatCountdown(secondsLeft)}` : 'This code has expired.' }}
        </p>
        <p class="hint-text" role="status">Waiting for the new device…</p>
        <details class="fallback">
          <summary>Can't scan?</summary>
          <p class="hint-text">
            Copy this pairing code to the new device and paste it there. Treat it like a password:
            anyone who has it in the next few minutes can connect a device to your progress.
          </p>
          <button class="secondary-btn" @click="copy(pairing.payload, 'Pairing code copied.')">Copy pairing code</button>
        </details>
        <button v-if="secondsLeft <= 0" class="primary-btn" @click="startAddDevice">New code</button>
        <button class="secondary-btn" @click="leaveAddDevice">Cancel</button>
      </template>
      <p v-else class="hint-text">Creating a pairing code…</p>
    </section>

    <!-- ── Join: scan ───────────────────────────────────────────────── -->
    <section v-else-if="view === 'join-scan'" class="card">
      <h2>Scan QR code</h2>
      <p class="card-desc">
        On a device that already uses Brain Sync, open Brain Sync → <strong>Add Device</strong>.
      </p>
      <label class="field">
        This device's name <span class="optional">(optional)</span>
        <input v-model="newDeviceLabel" type="text" maxlength="64" placeholder="e.g. Blue, My iPhone" />
      </label>
      <QrScanner @detected="joinWithPayload" />
      <button class="secondary-btn" @click="view = 'join-paste'">Paste a pairing code instead</button>
      <button class="secondary-btn" @click="view = 'home'">Cancel</button>
    </section>

    <!-- ── Join: paste ──────────────────────────────────────────────── -->
    <section v-else-if="view === 'join-paste'" class="card">
      <h2>Paste a code</h2>
      <p class="card-desc">
        Either the pairing code from your other device (Add Device → Can't scan?, starts with
        <code>BRAINPAIR1</code>) or your recovery code (<code>XXXX-XXXX-…</code>).
      </p>
      <label class="field">
        Pairing code or recovery code
        <textarea v-model="pastedPayload" rows="3" autocomplete="off" spellcheck="false"></textarea>
      </label>
      <label class="field">
        This device's name <span class="optional">(optional)</span>
        <input v-model="newDeviceLabel" type="text" maxlength="64" placeholder="e.g. Blue, My iPhone" />
      </label>
      <button class="primary-btn" :disabled="busy || !pastedPayload.trim()" @click="joinWithPasted">Connect</button>
      <button class="secondary-btn" @click="view = 'home'">Cancel</button>
    </section>

    <!-- ── Join: recovery code ──────────────────────────────────────── -->
    <section v-else-if="view === 'join-recovery'" class="card">
      <h2>Use recovery code</h2>
      <label class="field">
        Recovery code
        <input
          v-model="enteredRecovery"
          type="text"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
          :aria-invalid="recoveryLooksWrong"
        />
      </label>
      <p v-if="recoveryLooksWrong" class="hint-text warn-text">That doesn't look quite right. Check for a typo.</p>
      <label class="field">
        This device's name <span class="optional">(optional)</span>
        <input v-model="newDeviceLabel" type="text" maxlength="64" placeholder="e.g. Blue, My iPhone" />
      </label>
      <button class="primary-btn" :disabled="busy || !recoveryLooksValid" @click="joinWithRecovery">Connect</button>
      <button class="secondary-btn" @click="view = 'home'">Cancel</button>
    </section>

    <!-- ── Home ─────────────────────────────────────────────────────── -->
    <template v-else>
      <section class="card status-card">
        <p class="status-line" :class="`tone-${status.tone}`" role="status">
          <span v-if="status.icon" aria-hidden="true">{{ status.icon }}</span>
          {{ status.text }}<span v-if="status.detail"> · {{ status.detail }}</span>
        </p>
        <p v-if="lastSyncLabel" class="hint-text">Last synced {{ lastSyncLabel }}</p>
        <button v-if="connected" class="primary-btn" :disabled="busy" @click="handleSyncNow">Sync Now</button>
      </section>

      <!-- Local-only: enable or join -->
      <template v-if="syncStatus.state === 'local-only'">
        <section class="card">
          <h2>Use Brain on more than one device</h2>
          <p class="card-desc">
            Brain Sync keeps your progress in step across your phone, tablet and computer. It's
            optional and anonymous: no account, email or password. Brain keeps working offline
            exactly as now, and everything already on this device is kept and uploaded.
          </p>
          <label class="field">
            Profile name <span class="optional">(optional)</span>
            <input v-model="newProfileName" type="text" maxlength="64" placeholder="e.g. My Brain" />
          </label>
          <label class="field">
            This device's name <span class="optional">(optional)</span>
            <input v-model="newDeviceLabel" type="text" maxlength="64" placeholder="e.g. Blue, My iPhone" />
          </label>
          <button class="primary-btn" :disabled="busy" @click="handleEnable">Enable Brain Sync</button>
        </section>
      </template>

      <!-- Joining: from local-only or after being disconnected/revoked -->
      <section v-if="syncStatus.state === 'local-only' || syncStatus.state === 'needs-pairing'" class="card">
        <h2>{{ syncStatus.state === 'needs-pairing' ? 'Reconnect this device' : 'Already using Brain Sync?' }}</h2>
        <p class="card-desc">
          <template v-if="syncStatus.state === 'needs-pairing'">
            This device was disconnected from Brain Sync. Your progress is safe on this device, and
            you can keep playing. Reconnect to resume syncing.
          </template>
          <template v-else>
            Connect this device to your existing progress. Anything already on this device is kept
            and merged, never overwritten.
          </template>
        </p>
        <button class="primary-btn" @click="view = 'join-scan'">Scan QR code</button>
        <button class="secondary-btn" @click="view = 'join-paste'">Paste pairing code</button>
        <button class="secondary-btn" @click="view = 'join-recovery'">Use recovery code</button>
        <button v-if="syncStatus.state === 'needs-pairing'" class="secondary-btn" @click="confirmAction = 'stop'">
          Stop syncing on this device
        </button>
      </section>

      <!-- Connected -->
      <template v-if="connected">
        <section class="card">
          <h2>Profile</h2>
          <div class="row">
            <span class="profile-name">{{ profile?.displayName || 'Unnamed' }}</span>
            <button class="link-btn" @click="startRename('profile')">Rename</button>
          </div>
        </section>

        <section class="card">
          <h2>Devices</h2>
          <p v-if="devicesError" class="hint-text warn-text">{{ devicesError }}</p>
          <ul class="device-list">
            <li v-for="device in activeDevices" :key="device.deviceId" class="device">
              <div>
                <span class="device-name">{{ device.label || 'Unnamed device' }}</span>
                <span v-if="device.current" class="badge">This device</span>
                <span class="device-meta">Last seen {{ relativeTime(device.lastSeenAt) }}</span>
              </div>
              <div class="device-actions">
                <button class="link-btn" @click="startRename('device', device)">Rename</button>
                <button v-if="!device.current" class="link-btn danger-link" @click="askRevoke(device)">Remove</button>
              </div>
            </li>
          </ul>
          <button class="primary-btn" @click="startAddDevice">Add Device</button>
        </section>

        <section class="card">
          <h2>Recovery code</h2>
          <p v-if="recovery && !recovery.configured" class="warning">
            You don't have a recovery code yet. Create one so you can still get back in if you lose
            access to every device.
          </p>
          <p v-else-if="recovery" class="card-desc">
            Created {{ relativeTime(recovery.rotatedAt) }}. Brain can't show an existing code again.
            Creating a new one replaces it, and the old code stops working. Your devices stay connected.
          </p>
          <button class="secondary-btn" @click="confirmAction = 'rotate'">
            {{ recovery && !recovery.configured ? 'Create recovery code' : 'Create a new recovery code' }}
          </button>
        </section>

        <section class="card danger-zone">
          <h2>Disconnect or delete</h2>
          <p class="card-desc">
            <strong>Disconnect This Device</strong> stops syncing here. Its progress stays on this device.
          </p>
          <button class="secondary-btn" @click="confirmAction = 'disconnect'">Disconnect This Device</button>
          <p class="card-desc">
            <strong>Delete Cloud Data</strong> permanently removes your synced progress and every device
            connection from the server. Progress already on each device stays there.
          </p>
          <label class="confirm-label">
            Type <strong>DELETE</strong> to confirm:
            <input v-model="deleteText" type="text" class="confirm-input" autocomplete="off" />
          </label>
          <button class="danger-btn" :disabled="deleteText !== 'DELETE' || busy" @click="handleDeleteCloud">Delete Cloud Data</button>
        </section>

        <details class="card advanced">
          <summary>Advanced</summary>
          <dl>
            <dt>Sync ID</dt><dd>{{ credential?.syncId }}</dd>
            <dt>Device ID</dt><dd>{{ deviceId }}</dd>
            <dt>Server</dt><dd>{{ credential?.baseUrl }}</dd>
          </dl>
        </details>
      </template>
    </template>

    <div v-if="message" class="message success" role="status">{{ message }}</div>
    <div v-if="error" class="message error" role="alert">{{ error }}</div>

    <!-- Rename -->
    <div v-if="renaming" class="rename-overlay" @click.self="renaming = null">
      <form class="rename-box" @submit.prevent="submitRename" @keydown.esc="renaming = null">
        <label class="field">
          {{ renaming.kind === 'profile' ? 'Profile name' : 'Device name' }}
          <input ref="renameInput" v-model="renaming.value" type="text" maxlength="64" />
        </label>
        <p class="hint-text">Names are just labels. They don't need to be unique and never change how sync works.</p>
        <button class="primary-btn" type="submit" :disabled="busy">Save</button>
        <button class="secondary-btn" type="button" @click="renaming = null">Cancel</button>
      </form>
    </div>

    <ConfirmDialog
      v-if="confirmAction"
      :message="confirmMessage"
      :confirm-label="confirmLabel"
      @confirm="runConfirmed"
      @cancel="confirmAction = null"
    />

    <button v-if="view === 'home'" class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
// Brain Sync settings (BRAIN-SYNC-SPEC §9-§13, §39, §41-§42). Every network
// call here is an explicit user action or a refresh of this screen; none of
// it is ever on a gameplay path, and any failure leaves local progress
// exactly as it is.
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import QrCode from './sync/QrCode.vue'
import QrScanner from './sync/QrScanner.vue'
import { SYNC_SERVER_URL, isSyncAvailable } from '../composables/sync/config.js'
import { syncStatus, describeSyncStatus, refreshSyncStatus } from '../composables/sync/syncStatus.js'
import { startSyncRuntime, stopSyncRuntime, syncNow } from '../composables/sync/syncRuntime.js'
import { isValidRecoveryCode, normalizeRecoveryCode } from '../composables/sync/recoveryCode.js'
import { disableSync } from '../composables/sync/outbox.js'
import { getDeviceId } from '../composables/persistence/device.js'
import * as api from '../composables/sync/syncApi.js'

defineEmits(['menu'])

const available = isSyncAvailable()
const view = ref('home') // home | recovery | add-device | join-scan | join-paste | join-recovery
const busy = ref(false)
const message = ref(null)
const error = ref(null)

const credential = ref(api.getStoredCredential())
const deviceId = getDeviceId()
const profile = ref(null)
const devices = ref([])
const devicesError = ref(null)
const recovery = ref(null)

const newProfileName = ref('')
const newDeviceLabel = ref('')
const shownRecoveryCode = ref('')
const recoverySaved = ref(false)
const pastedPayload = ref('')
const enteredRecovery = ref('')
const deleteText = ref('')
const renaming = ref(null) // { kind: 'profile' | 'device', deviceId?, value }
const renameInput = ref(null)
const confirmAction = ref(null) // 'rotate' | 'disconnect' | 'stop' | { revoke: device }

const status = computed(() => describeSyncStatus(syncStatus.value))
const connected = computed(() => ['synced', 'pending', 'offline', 'unavailable'].includes(syncStatus.value.state) && !!credential.value)
const activeDevices = computed(() => devices.value.filter((d) => !d.revokedAt))
const lastSyncLabel = computed(() => (syncStatus.value.lastSyncAt ? relativeTime(syncStatus.value.lastSyncAt) : null))
const recoveryGroups = computed(() => shownRecoveryCode.value.split('-').map((group, i, all) => (i < all.length - 1 ? `${group}-` : group)))
const recoveryLooksValid = computed(() => isValidRecoveryCode(enteredRecovery.value))
const recoveryLooksWrong = computed(() => normalizeRecoveryCode(enteredRecovery.value) !== null && !recoveryLooksValid.value)

const confirmMessage = computed(() => {
  const action = confirmAction.value
  if (action === 'rotate') return recovery.value?.configured
    ? 'Create a new recovery code? Your current code will stop working immediately.'
    : 'Create a recovery code for Brain Sync?'
  if (action === 'disconnect') return 'Disconnect this device from Brain Sync? Its progress stays on this device.'
  if (action === 'stop') return 'Stop syncing on this device? Its progress stays on this device.'
  if (action?.revoke) return `Remove "${action.revoke.label || 'Unnamed device'}" from Brain Sync? It stops syncing but keeps its own progress.`
  return ''
})
const confirmLabel = computed(() => {
  const action = confirmAction.value
  if (action === 'rotate') return 'Create'
  if (action === 'disconnect' || action === 'stop') return 'Disconnect'
  return 'Remove'
})

// ---- helpers --------------------------------------------------------------

const FRIENDLY_ERRORS = {
  invalid_pairing_token: 'That pairing code has expired (they last 5 minutes) or was already used. Ask the other device for a new one.',
  invalid_pairing_payload: 'That isn\'t a pairing code or a recovery code. A pairing code starts with BRAINPAIR1; a recovery code looks like XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX.',
  cannot_pair_with_self: 'That code came from this device. Scan it on the new device instead.',
  invalid_recovery_code: 'That recovery code isn\'t right. If you created a new one, only the newest code works.',
  invalid_recovery_code_format: 'That recovery code has a typo. Check it and try again.',
  rate_limited: 'Too many attempts. Please wait a while and try again.',
  label_too_long: 'That name is too long.',
}

function explain(err) {
  if (err?.code && FRIENDLY_ERRORS[err.code]) return FRIENDLY_ERRORS[err.code]
  if (err?.status === 401) return 'This device is no longer connected to Brain Sync. Your progress is safe on this device.'
  return 'Couldn\'t reach Brain Sync. Your progress is safe on this device. Try again when you\'re online.'
}

async function run(task) {
  busy.value = true
  error.value = null
  message.value = null
  try {
    return await task()
  } catch (err) {
    error.value = explain(err)
    return undefined
  } finally {
    busy.value = false
    refreshSyncStatus()
  }
}

function relativeTime(iso) {
  if (!iso) return 'never'
  const seconds = Math.round((Date.now() - Date.parse(iso)) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return new Date(iso).toLocaleDateString()
}

function formatCountdown(total) {
  const m = Math.floor(total / 60)
  const s = String(total % 60).padStart(2, '0')
  return `${m}:${s}`
}

async function copy(text, confirmation) {
  try {
    await navigator.clipboard.writeText(text)
    message.value = confirmation
  } catch {
    error.value = 'Couldn\'t copy. Select the text and copy it by hand.'
  }
}

async function loadAccount() {
  credential.value = api.getStoredCredential()
  if (!connected.value) return
  devicesError.value = null
  try {
    const [p, d, r] = await Promise.all([api.getProfile(), api.listDevices(), api.getRecoveryStatus()])
    profile.value = p
    devices.value = d
    recovery.value = r
  } catch (err) {
    devicesError.value = explain(err)
  }
}

// ---- enable / join ----------------------------------------------------------

async function afterConnect(successText) {
  credential.value = api.getStoredCredential()
  startSyncRuntime()
  const result = await syncNow()
  message.value = result.status === 'synced' ? successText : 'Connected. Your progress will sync when Brain Sync is reachable.'
  await loadAccount()
}

async function handleEnable() {
  const created = await run(() => api.createIdentity({
    baseUrl: SYNC_SERVER_URL,
    displayName: newProfileName.value || undefined,
    deviceLabel: newDeviceLabel.value || undefined,
  }))
  if (!created) return
  shownRecoveryCode.value = created.recoveryCode
  recoverySaved.value = false
  view.value = 'recovery'
  afterConnect('Brain Sync is on. Your progress is backed up.')
}

async function joinWithPayload(text) {
  const joined = await run(() => api.pairWithPayload(text, { deviceLabel: newDeviceLabel.value || undefined }))
  if (!joined) {
    if (view.value === 'join-scan') view.value = 'join-paste'
    return
  }
  pastedPayload.value = ''
  view.value = 'home'
  await afterConnect('Connected. Progress from your other devices is here now too.')
}

async function joinWithPasted() {
  const joined = await run(() => api.joinWithCode(pastedPayload.value, { baseUrl: SYNC_SERVER_URL, deviceLabel: newDeviceLabel.value || undefined }))
  if (!joined) return
  pastedPayload.value = ''
  view.value = 'home'
  await afterConnect('Connected. Progress from your other devices is here now too.')
}

async function joinWithRecovery() {
  const joined = await run(() => api.recoverWithCode(SYNC_SERVER_URL, enteredRecovery.value, { deviceLabel: newDeviceLabel.value || undefined }))
  if (!joined) return
  enteredRecovery.value = ''
  view.value = 'home'
  await afterConnect('Connected. Progress from your other devices is here now too.')
}

function closeRecovery() {
  shownRecoveryCode.value = ''
  recoverySaved.value = false
  view.value = 'home'
}

// ---- add device ---------------------------------------------------------------

const pairing = ref(null) // { payload, expiresAt }
const secondsLeft = ref(0)
const joinedDevice = ref(null)
let countdownTimer = null
let pollTimer = null

function stopAddDeviceTimers() {
  clearInterval(countdownTimer)
  clearInterval(pollTimer)
}

async function startAddDevice() {
  stopAddDeviceTimers()
  view.value = 'add-device'
  pairing.value = null
  joinedDevice.value = null
  const known = new Set(activeDevices.value.map((d) => d.deviceId))
  const created = await run(() => api.createPairingPayload())
  if (!created) {
    view.value = 'home'
    return
  }
  pairing.value = created
  const tick = () => {
    secondsLeft.value = Math.max(0, Math.round((Date.parse(created.expiresAt) - Date.now()) / 1000))
  }
  tick()
  countdownTimer = setInterval(tick, 1000)
  pollTimer = setInterval(async () => {
    if (secondsLeft.value <= 0) return
    try {
      const list = await api.listDevices()
      const added = list.find((d) => !d.revokedAt && !known.has(d.deviceId))
      if (added) {
        devices.value = list
        joinedDevice.value = added.label || 'The new device'
        stopAddDeviceTimers()
      }
    } catch {
      // keep waiting; the QR is still valid
    }
  }, 3000)
}

async function leaveAddDevice() {
  stopAddDeviceTimers()
  if (!joinedDevice.value && pairing.value) {
    // Don't leave a usable pairing secret behind.
    try {
      await api.cancelPairing()
    } catch {
      // it expires within minutes anyway
    }
  }
  pairing.value = null
  view.value = 'home'
  loadAccount()
}

// ---- connected actions ------------------------------------------------------------

async function handleSyncNow() {
  const result = await run(() => syncNow())
  if (!result) return
  if (result.status === 'synced') message.value = 'Synced.'
  else if (result.status === 'offline') message.value = 'You\'re offline. Progress is saved on this device and will sync later.'
  else if (result.status === 'unauthorized') error.value = explain({ status: 401 })
  else error.value = explain(null)
}

function startRename(kind, device) {
  renaming.value = kind === 'profile'
    ? { kind, value: profile.value?.displayName ?? '' }
    : { kind, deviceId: device.deviceId, value: device.label ?? '' }
  nextTick(() => renameInput.value?.focus())
}

async function submitRename() {
  const { kind, deviceId: id, value } = renaming.value
  const done = await run(() => (kind === 'profile' ? api.renameProfile(value) : api.renameDevice(id, value)))
  if (done === undefined) return
  renaming.value = null
  await loadAccount()
}

function askRevoke(device) {
  confirmAction.value = { revoke: device }
}

async function handleDeleteCloud() {
  const done = await run(async () => {
    await api.deleteCloudData()
    return true
  })
  if (!done) return
  stopSyncRuntime()
  deleteText.value = ''
  credential.value = null
  profile.value = null
  devices.value = []
  message.value = 'Cloud data deleted. Your progress on this device is untouched.'
}

async function runConfirmed() {
  const action = confirmAction.value
  confirmAction.value = null
  if (action === 'rotate') {
    const rotated = await run(() => api.rotateRecoveryCode())
    if (!rotated) return
    shownRecoveryCode.value = rotated.recoveryCode
    recoverySaved.value = false
    recovery.value = { configured: true, rotatedAt: rotated.rotatedAt }
    view.value = 'recovery'
  } else if (action === 'disconnect') {
    await run(() => api.disconnectThisDevice())
    stopSyncRuntime()
    credential.value = null
    message.value = 'This device is disconnected. Its progress stays here.'
  } else if (action === 'stop') {
    api.forgetCredential()
    disableSync()
    stopSyncRuntime()
    credential.value = null
    message.value = 'Syncing stopped on this device. Its progress stays here.'
  } else if (action?.revoke) {
    const done = await run(() => api.revokeDevice(action.revoke.deviceId))
    if (done) await loadAccount()
  }
}

watch(() => syncStatus.value.state, () => loadAccount())

onMounted(() => {
  refreshSyncStatus()
  if (available) {
    startSyncRuntime()
    loadAccount()
  }
})

onBeforeUnmount(() => {
  stopAddDeviceTimers()
  if (pairing.value && !joinedDevice.value) api.cancelPairing().catch(() => {})
})
</script>

<style scoped>
.sync-settings {
  max-width: 640px;
  width: 100%;
}

h1 {
  text-align: center;
  margin-bottom: 1rem;
}

.card {
  background: var(--surface);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.card h2 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
}

.card-desc,
.hint-text {
  color: var(--text-dim);
  font-size: 0.88rem;
  line-height: 1.5;
  margin: 0 0 1rem;
}

.card-desc code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85em;
}

.warning {
  background: rgba(229, 168, 77, 0.12);
  border-left: 3px solid #e5a84d;
  padding: 0.6rem 0.8rem;
  border-radius: 6px;
  font-size: 0.88rem;
  line-height: 1.5;
  margin: 0 0 1rem;
}

.warn-text {
  color: #e5a84d;
}

.success-text {
  color: var(--correct);
  font-weight: 700;
}

.status-line {
  margin: 0 0 0.5rem;
  font-weight: 700;
}

.tone-ok span[aria-hidden] {
  color: var(--correct);
}

.tone-warn span[aria-hidden] {
  color: #e5a84d;
}

.primary-btn,
.secondary-btn,
.danger-btn {
  display: inline-block;
  border: none;
  border-radius: 10px;
  padding: 0.7rem 1.1rem;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  margin: 0 0.5rem 0.5rem 0;
}

.primary-btn {
  background: var(--accent);
  color: #10121a;
}

.secondary-btn {
  background: var(--surface-2);
  color: var(--text);
}

.danger-btn {
  background: var(--wrong);
  color: #fff;
}

.primary-btn:disabled,
.danger-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.link-btn {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 0.85rem;
  text-decoration: underline;
  padding: 0.25rem;
}

.danger-link {
  color: var(--wrong);
}

.field {
  display: block;
  font-size: 0.85rem;
  color: var(--text-dim);
  margin-bottom: 0.9rem;
}

.field input,
.field textarea,
.confirm-input {
  display: block;
  width: 100%;
  margin-top: 0.35rem;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--surface-2);
  border-radius: 8px;
  padding: 0.6rem 0.7rem;
  font-size: 1rem; /* ≥16px: no iOS zoom-on-focus */
  font-family: inherit;
}

.field textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
  resize: vertical;
}

.optional {
  opacity: 0.7;
}

.check-label,
.confirm-label {
  display: block;
  font-size: 0.88rem;
  margin: 0 0 1rem;
}

.recovery-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: clamp(1rem, 4.5vw, 1.3rem);
  letter-spacing: 0.05em;
  text-align: center;
  background: var(--bg);
  border-radius: 8px;
  padding: 0.9rem 0.5rem;
  margin: 0 0 0.75rem;
  user-select: all;
}

.code-group {
  display: inline-block;
  white-space: nowrap;
}

.countdown {
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--text-dim);
  font-size: 0.85rem;
}

.fallback {
  margin: 0.5rem 0 1rem;
}

.fallback summary {
  cursor: pointer;
  color: var(--text-dim);
  font-size: 0.85rem;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.profile-name {
  font-weight: 700;
}

.device-list {
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
}

.device {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--surface-2);
}

.device-name {
  font-weight: 700;
  margin-right: 0.5rem;
}

.device-meta {
  display: block;
  color: var(--text-dim);
  font-size: 0.8rem;
  margin-top: 0.15rem;
}

.device-actions {
  flex-shrink: 0;
}

.badge {
  font-size: 0.72rem;
  background: var(--surface-2);
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
  color: var(--text-dim);
}

.danger-zone {
  border: 1px solid rgba(229, 72, 77, 0.35);
}

.advanced summary {
  cursor: pointer;
  color: var(--text-dim);
  font-size: 0.85rem;
}

.advanced dl {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
}

.advanced dt {
  color: var(--text-dim);
}

.advanced dd {
  margin: 0 0 0.5rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
}

.message {
  border-radius: 10px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  line-height: 1.4;
}

.message.success {
  background: rgba(47, 191, 113, 0.14);
  color: var(--correct);
}

.message.error {
  background: rgba(229, 72, 77, 0.14);
  color: #ff8a8e;
}

.rename-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 20;
}

.rename-box {
  background: var(--surface);
  border-radius: 12px;
  padding: 1.25rem;
  width: min(420px, 100%);
}

.back-btn {
  display: block;
  margin: 1.5rem auto 0;
  background: none;
  border: 1px solid var(--surface-2);
  color: var(--text-dim);
  border-radius: 10px;
  padding: 0.6rem 1.2rem;
  cursor: pointer;
}
</style>
