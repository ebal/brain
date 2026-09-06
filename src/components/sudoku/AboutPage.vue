<template>
  <div class="about">
    <h1>How to Play</h1>

    <p class="intro">
      Fill every empty cell with a number from 1–9 so that each <strong>row</strong>,
      <strong>column</strong>, and <strong>3×3 box</strong> contains every number exactly once.
      The starting numbers (bold) are fixed clues and can't be changed.
    </p>

    <h2>Playing a cell</h2>
    <ul class="steps-list">
      <li>Tap an empty cell to select it — its row, column, box, and any cells sharing its value light up.</li>
      <li>Tap a number on the pad below the board to fill it in.</li>
      <li>An incorrect number briefly flashes red and counts as a mistake — it's never placed, so you can always keep going.</li>
    </ul>

    <h2>Notes (pencil marks)</h2>
    <p class="intro">
      Toggle <strong>Notes</strong> to jot down candidate numbers instead of committing to one — useful
      for tracking possibilities as you narrow them down. A cell can hold several notes at once:
    </p>
    <div class="notes-example">
      <SudokuCell :value="0" :notes="[1, 3, 5, 9]" />
    </div>
    <p class="intro">
      When you correctly place a value, that number is automatically cleared from notes in every
      cell sharing its row, column, and box — no manual cleanup needed. Notes never count as mistakes.
    </p>

    <h2>Erase, Undo, Hint</h2>
    <ul class="steps-list">
      <li><strong>Erase</strong> clears a value or notes you entered — it can't touch original clues or hints.</li>
      <li><strong>Undo</strong> reverses your last move, including any notes it auto-cleared — but it never un-counts elapsed time, mistakes, or hints already taken.</li>
      <li><strong>Hint</strong> fills your selected empty cell (or a random one) with its correct value. A hinted cell becomes fixed. Hints are unlimited, but a puzzle solved with any hints can't set a new <strong>Clean Best</strong> time — that's reserved for zero-hint solves.</li>
    </ul>

    <h2>Timer &amp; Pause</h2>
    <p class="intro">
      The clock starts the moment the puzzle appears and pauses automatically if you switch away
      from the app, or if you tap <strong>Pause</strong> yourself. While paused, the board is hidden
      so you can't keep studying it — tap Resume to continue exactly where you left off.
    </p>

    <h2>Difficulty</h2>
    <p class="intro">
      Difficulty is judged by which logical techniques a puzzle actually requires to solve — never by
      how many clues it starts with. <strong>Easy</strong> focuses mostly on finding single possible
      numbers. <strong>Medium</strong> adds candidate pairs and simple elimination across rows/columns
      within a box. <strong>Hard</strong> requires more careful multi-step reasoning, but is deliberately
      kept below expert-level Sudoku — no puzzle here should ever require guessing.
    </p>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import SudokuCell from './SudokuCell.vue'

defineEmits(['menu'])
</script>

<style scoped>
.about {
  max-width: 640px;
  width: 100%;
}

h1 {
  text-align: center;
  margin-bottom: 1rem;
}

h2 {
  margin: 2rem 0 0.75rem;
  font-size: 1.15rem;
}

.intro {
  color: var(--text-dim);
  line-height: 1.6;
}

.steps-list {
  color: var(--text-dim);
  line-height: 1.6;
  padding-left: 1.25rem;
}

.steps-list li {
  margin-bottom: 0.5rem;
}

.steps-list strong,
.intro strong {
  color: var(--text);
}

.notes-example {
  width: 96px;
  margin: 1rem auto;
  --cell-value-font: 2.2rem;
  --cell-note-font: 0.85rem;
}

.notes-example :deep(.sudoku-cell) {
  border-radius: 10px;
  border: 1px solid var(--surface-2);
}

.back-btn {
  display: block;
  margin: 2rem auto 0;
  background: var(--accent);
  color: #10121a;
  border: none;
  border-radius: 10px;
  padding: 0.85rem 1.5rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}
</style>
