import { createActiveLevelStorage } from '../storage.js'

export function useSudokuStorage() {
  return createActiveLevelStorage('sudoku:active')
}
