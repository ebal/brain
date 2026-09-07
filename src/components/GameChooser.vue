<template>
  <div class="chooser">
    <h1>Choose a Game</h1>

    <div class="game-grid">
      <button class="game-card" @click="$emit('choose', 'stroop')">
        <h2>Stroop Effect Test</h2>
        <p>Name the ink color, ignore the word. Classic cognitive-interference task.</p>
      </button>
      <button class="game-card" @click="$emit('choose', 'schulte')">
        <h2>Schulte Tables</h2>
        <p>Find the numbers in order, as fast as you can. Visual search &amp; attention.</p>
      </button>
      <button class="game-card" @click="$emit('choose', 'nback')">
        <h2>Number N-Back</h2>
        <p>Does this number match the one N steps back? Working memory &amp; attention.</p>
      </button>
      <button class="game-card" @click="$emit('choose', 'sudoku')">
        <h2>Sudoku</h2>
        <p>Classic 9×9 logic puzzle. Notes, hints, undo, and a real difficulty rating.</p>
      </button>
      <button class="game-card" @click="$emit('choose', 'set')">
        <h2>SET</h2>
        <p>Spot three cards that make a SET. Visual perception &amp; pattern recognition.</p>
      </button>
      <button class="game-card" @click="$emit('choose', 'sequence-memory')">
        <h2>Sequence Memory</h2>
        <p>Watch the pattern, then repeat it. Visual &amp; spatial memory.</p>
      </button>
      <button class="game-card" @click="$emit('choose', 'switchtrail')">
        <h2>Switch Trail</h2>
        <p>Alternate between numbers and letters before time runs out. Cognitive flexibility &amp; visual attention.</p>
      </button>
      <button class="game-card" @click="$emit('choose', 'memorypairs')">
        <h2>Memory Pairs</h2>
        <p>Flip tiles and find matching emoji pairs. Visual memory &amp; spatial recall.</p>
      </button>
    </div>

    <div class="footer-links">
      <button class="data-link" @click="$emit('choose', 'activity')">Activity</button>
      <button class="data-link" @click="$emit('choose', 'benchmark-menu')">Run a Benchmark</button>
      <button class="data-link" @click="$emit('choose', 'data')">Manage Your Data</button>
    </div>
  </div>
</template>

<script setup>
defineEmits(['choose'])
</script>

<style scoped>
.chooser {
  max-width: 640px;
  width: 100%;
  text-align: center;
}

h1 {
  margin-bottom: 1.5rem;
}

.game-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.game-card {
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: 12px;
  padding: 1.5rem 1.25rem;
  text-align: left;
  cursor: pointer;
  color: var(--text);
  transition: border-color 0.15s ease, transform 0.08s ease;
}

.game-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.game-card h2 {
  margin: 0 0 0.5rem;
  font-size: 1.2rem;
}

.game-card p {
  margin: 0;
  color: var(--text-dim);
  font-size: 0.9rem;
  line-height: 1.5;
}

@media (max-width: 480px) {
  .game-grid {
    grid-template-columns: 1fr;
  }
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.data-link {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: underline;
}

.data-link:hover {
  color: var(--accent);
}
</style>
