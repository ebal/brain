// Standardized configurations for Benchmark mode (IMPROVEMENT-PLAN.md Phase
// 5) — fixed so a result today is genuinely comparable to one from months
// ago. Changing any of these must bump BENCHMARK_VERSION so old and new
// benchmark sessions are never silently mixed into the same comparison.

export const BENCHMARK_VERSION = 1

// Sudoku is deliberately excluded — puzzle-to-puzzle difficulty varies even
// within one labeled tier (a Hard puzzle needing quads is a measurably
// different task from one only needing pairs), so a Sudoku "benchmark" would
// mostly measure which specific puzzle you happened to get, not your
// performance on a fixed, repeatable task. See IMPROVEMENT-PLAN.md Phase 5.
export const BENCHMARK_CONFIGS = {
  stroop: { label: 'Stroop Effect Test', difficultyKey: 'medium', mode: 'color', summary: 'Medium · Color Match' },
  schulte: { label: 'Schulte Tables', difficultyKey: 'classic', summary: '5×5 Classic' },
  nback: { label: 'Number N-Back', difficultyKey: 'classic', summary: '2-Back' },
  set: { label: 'SET', difficultyKey: 'medium', summary: 'Medium' },
  'sequence-memory': { label: 'Sequence Memory', difficultyKey: 'medium', summary: 'Medium' },
  switchtrail: { label: 'Switch Trail', difficultyKey: 'medium', summary: 'Medium · 16 targets' },
  memorypairs: { label: 'Memory Pairs', difficultyKey: 'medium', summary: 'Medium · 8 pairs' },
}
