// Runs puzzle generation off the main thread, so a slow attempt run never
// freezes the UI (Easy/Medium generate live and are consistently fast; Hard
// is served from a small pre-vetted pool — see sudokuGenerator.js and
// hardPool.json for why live generation isn't reliable for Hard).
import { generatePuzzle } from './sudokuGenerator.js'
import hardPool from '../../constants/sudoku/hardPool.json'

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

self.onmessage = (e) => {
  const { requestId, difficultyKey } = e.data
  try {
    let result
    if (difficultyKey === 'hard') {
      if (!hardPool.length) throw new Error('hard puzzle pool is empty')
      const entry = pickRandom(hardPool)
      result = { puzzle: entry.puzzle, solution: entry.solution, difficulty: 'hard' }
    } else {
      result = generatePuzzle(difficultyKey)
    }
    self.postMessage({ requestId, ok: true, result })
  } catch (error) {
    self.postMessage({ requestId, ok: false, error: error.message })
  }
}
