// In-memory stand-in for the Phase 4 Brain Sync API, implementing the
// syncClient.js transport contract with the server-side semantics the spec
// requires: idempotent by operationId (§28), semantic merge on accept
// (mergeEngine), per-key revisions and cursors (§29), and a failure mode
// switch for offline/timeout/unauthorized tests. Test/dev use only — never
// imported by the app.

import { mergeData, mergeKey, syncableData } from './mergeEngine.js'
import { stableStringify } from '../persistence/ids.js'

export function createMockSyncServer() {
  let data = {}
  let revision = 0
  const revisions = {}
  const applied = new Set()
  const learningEvents = new Map()
  let mode = 'online' // 'online' | 'offline' | 'hang' | 'unauthorized' | 'garbage' | 'lose-response'
  const log = []

  function apply(op) {
    if (op.entityType === 'learningEvent') {
      learningEvents.set(op.entityId, op.payload)
      return
    }
    const key = op.entityType === 'session' ? op.payload?.key : op.entityId
    const value = op.entityType === 'session' ? [op.payload?.entry] : op.payload
    const merged = mergeKey(key, data[key], value)
    if (merged !== undefined) data = { ...data, [key]: merged }
  }

  async function sync(request) {
    log.push(request)
    if (mode === 'offline') throw new TypeError('Failed to fetch')
    if (mode === 'hang') return new Promise(() => {})
    if (mode === 'unauthorized') throw Object.assign(new Error('unauthorized'), { status: 401 })
    if (mode === 'garbage') return { acknowledged: 'nope' }

    const before = structuredClone(data)
    for (const op of request.operations) {
      if (applied.has(op.operationId)) continue
      apply(op)
      applied.add(op.operationId)
    }
    data = mergeData(syncableData(data), {}) // re-derive progression
    for (const key of Object.keys(data)) {
      if (stableStringify(data[key]) !== stableStringify(before[key])) revisions[key] = ++revision
    }
    const since = typeof request.cursor === 'number' ? request.cursor : 0
    const changes = {}
    for (const [key, rev] of Object.entries(revisions)) if (rev > since) changes[key] = data[key]
    // Applied server-side, but the reply never reaches the device (§46).
    if (mode === 'lose-response') throw new TypeError('network connection lost')
    return structuredClone({ acknowledged: request.operations.map((op) => op.operationId), changes, cursor: revision })
  }

  return {
    transport: { sync },
    setMode: (m) => { mode = m },
    get data() { return data },
    get learningEvents() { return learningEvents },
    get requests() { return log },
    get appliedCount() { return applied.size },
  }
}
