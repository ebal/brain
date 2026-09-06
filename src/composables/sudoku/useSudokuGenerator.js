// Thin promise-based wrapper around generator.worker.js. One worker is
// created lazily and reused for the lifetime of the tab.
let worker = null
let nextRequestId = 1
const pending = new Map()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./generator.worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = (e) => {
      const { requestId, ok, result, error } = e.data
      const resolver = pending.get(requestId)
      if (!resolver) return
      pending.delete(requestId)
      if (ok) resolver.resolve(result)
      else resolver.reject(new Error(error))
    }
  }
  return worker
}

export function useSudokuGenerator() {
  function generate(difficultyKey) {
    return new Promise((resolve, reject) => {
      const requestId = nextRequestId++
      pending.set(requestId, { resolve, reject })
      getWorker().postMessage({ requestId, difficultyKey })
    })
  }

  return { generate }
}
