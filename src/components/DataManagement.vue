<template>
  <div class="data-management">
    <h1>Your Data</h1>
    <p class="intro">
      Everything below reads and writes only your own device's local storage — nothing here ever
      touches a network.
    </p>

    <section class="card">
      <h2>Export</h2>
      <p class="card-desc">
        A full backup (history, stats, personal bests, and any in-progress game) for every game,
        as one JSON file you can keep or move to another device.
      </p>
      <button class="primary-btn" @click="handleExportJSON">Export All Data (JSON)</button>
      <button class="secondary-btn" @click="handleExportCSV">Export History (CSV)</button>
      <p class="footprint">Currently using ~{{ footprintLabel }} of local storage.</p>
    </section>

    <section class="card">
      <h2>Import</h2>
      <p class="card-desc">Restore from a previously exported JSON file.</p>
      <input
        ref="fileInput"
        type="file"
        accept="application/json"
        class="file-input"
        @change="handleFileSelected"
      />

      <div v-if="importError" class="message error">{{ importError }}</div>

      <div v-if="pendingImport" class="import-preview">
        <p>
          This file has <strong>{{ pendingImport.summary.totalKeys }}</strong> data record(s):
        </p>
        <ul class="summary-list">
          <li v-for="(count, game) in pendingImport.summary.byGame" :key="game" v-show="count > 0">
            {{ gameLabel(game) }}: {{ count }}
          </li>
        </ul>
        <p class="mode-question">How should this be applied?</p>
        <div class="import-actions">
          <button class="primary-btn" @click="confirmImport('merge')">
            Merge with existing data
          </button>
          <button class="danger-btn" @click="confirmImport('replace')">
            Replace all existing data
          </button>
          <button class="secondary-btn" @click="cancelImport">Cancel</button>
        </div>
        <p class="hint-text">
          Merge keeps everything from both — history from each game is combined, and your current
          personal bests are kept over the imported ones on conflict. Replace wipes your current
          data first.
        </p>
      </div>

      <div v-if="importResult" class="message success">
        Import complete ({{ importResult.mode }}) — {{ importResult.keysWritten }} record(s) written.
      </div>
    </section>

    <section class="card danger-zone">
      <h2>Delete All Data</h2>
      <p class="card-desc">
        Permanently erases every game's history, stats, personal bests, and any in-progress game
        from this device. This cannot be undone — export a backup first if you're not sure.
      </p>
      <label class="confirm-label">
        Type <strong>DELETE</strong> to confirm:
        <input v-model="deleteConfirmText" type="text" class="confirm-input" autocomplete="off" />
      </label>
      <button class="danger-btn" :disabled="deleteConfirmText !== 'DELETE'" @click="handleDeleteAll">
        Delete All Data
      </button>
      <div v-if="deleteResult" class="message success">
        Deleted {{ deleteResult.keysDeleted }} record(s).
      </div>
    </section>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  buildExport,
  buildHistoryCSV,
  describeExport,
  validateImportFile,
  applyImport,
  deleteAllData,
  storageFootprintChars,
} from '../composables/dataPortability.js'

defineEmits(['menu'])

const fileInput = ref(null)
const importError = ref(null)
const pendingImport = ref(null) // { parsed, summary } | null
const importResult = ref(null)
const deleteConfirmText = ref('')
const deleteResult = ref(null)

const footprintLabel = computed(() => {
  const chars = storageFootprintChars()
  if (chars < 1024) return `${chars} B`
  return `${(chars / 1024).toFixed(1)} KB`
})

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function downloadBlob(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function handleExportJSON() {
  const exported = buildExport()
  downloadBlob(JSON.stringify(exported, null, 2), 'application/json', `brain-export-${timestamp()}.json`)
}

function handleExportCSV() {
  downloadBlob(buildHistoryCSV(), 'text/csv', `brain-history-${timestamp()}.csv`)
}

function gameLabel(game) {
  const labels = {
    stroop: 'Stroop',
    schulte: 'Schulte Tables',
    nback: 'Number N-Back',
    sudoku: 'Sudoku',
    set: 'SET',
    'sequence-memory': 'Sequence Memory',
    switchtrail: 'Switch Trail',
  }
  return labels[game] || game
}

function handleFileSelected(event) {
  importError.value = null
  pendingImport.value = null
  importResult.value = null
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    let parsed
    try {
      parsed = JSON.parse(reader.result)
    } catch {
      importError.value = 'This file is not valid JSON.'
      resetFileInput()
      return
    }
    try {
      validateImportFile(parsed)
      pendingImport.value = { parsed, summary: describeExport(parsed) }
    } catch (err) {
      importError.value = err.message
      resetFileInput()
    }
  }
  reader.onerror = () => {
    importError.value = 'Could not read that file.'
    resetFileInput()
  }
  reader.readAsText(file)
}

function resetFileInput() {
  if (fileInput.value) fileInput.value.value = ''
}

function confirmImport(mode) {
  const result = applyImport(pendingImport.value.parsed, mode)
  importResult.value = result
  pendingImport.value = null
  resetFileInput()
}

function cancelImport() {
  pendingImport.value = null
  resetFileInput()
}

function handleDeleteAll() {
  if (deleteConfirmText.value !== 'DELETE') return
  deleteResult.value = deleteAllData()
  deleteConfirmText.value = ''
}
</script>

<style scoped>
.data-management {
  max-width: 640px;
  width: 100%;
}

h1 {
  text-align: center;
  margin-bottom: 0.5rem;
}

.intro {
  color: var(--text-dim);
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  line-height: 1.5;
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

.card-desc {
  color: var(--text-dim);
  font-size: 0.88rem;
  line-height: 1.5;
  margin: 0 0 1rem;
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
  color: #10121a;
}

.danger-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.footprint {
  color: var(--text-dim);
  font-size: 0.8rem;
  margin: 0.5rem 0 0;
}

.file-input {
  display: block;
  color: var(--text-dim);
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.message {
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  font-size: 0.85rem;
  margin-top: 0.75rem;
}

.message.error {
  background: color-mix(in srgb, var(--wrong) 18%, var(--surface));
  color: var(--text);
}

.message.success {
  background: color-mix(in srgb, var(--correct) 18%, var(--surface));
  color: var(--text);
}

.import-preview {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--surface-2);
}

.summary-list {
  margin: 0.5rem 0;
  padding-left: 1.25rem;
  font-size: 0.85rem;
  color: var(--text-dim);
}

.mode-question {
  font-weight: 700;
  font-size: 0.9rem;
  margin: 0.75rem 0 0.5rem;
}

.import-actions {
  display: flex;
  flex-wrap: wrap;
}

.hint-text {
  color: var(--text-dim);
  font-size: 0.78rem;
  line-height: 1.5;
  margin: 0.5rem 0 0;
}

.danger-zone {
  border: 1px solid color-mix(in srgb, var(--wrong) 40%, transparent);
}

.confirm-label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-dim);
  margin-bottom: 0.75rem;
}

.confirm-input {
  display: block;
  margin-top: 0.35rem;
  width: 100%;
  max-width: 200px;
  background: var(--surface-2);
  border: 1px solid var(--surface-2);
  border-radius: 8px;
  padding: 0.5rem 0.7rem;
  color: var(--text);
  font-size: 0.9rem;
}

.back-btn {
  display: block;
  margin: 1.5rem auto 0;
  background: var(--surface-2);
  color: var(--text);
  border: none;
  border-radius: 10px;
  padding: 0.85rem 1.5rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 480px) {
  .primary-btn,
  .secondary-btn,
  .danger-btn {
    display: block;
    width: 100%;
    margin: 0 0 0.5rem 0;
    text-align: center;
  }

  .import-actions {
    flex-direction: column;
  }
}
</style>
