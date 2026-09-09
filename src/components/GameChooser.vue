<template>
  <div class="chooser">
    <p class="brand">Brain</p>
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
      <button class="game-card" @click="$emit('choose', 'marblejump')">
        <h2>Marble Jump</h2>
        <p>Jump over marbles and remove them. Planning, look-ahead &amp; spatial reasoning.</p>
      </button>
      <button class="game-card" @click="$emit('choose', 'mentalrotation')">
        <h2>Mental Rotation</h2>
        <p>Find the same shape after it's been rotated. Spatial reasoning &amp; visualization.</p>
      </button>
      <button class="game-card" @click="$emit('choose', 'emojimahjong')">
        <h2>Emoji Mahjong</h2>
        <p>Match free emoji tiles and clear the board. Visual search &amp; planning.</p>
      </button>
      <button class="game-card" @click="$emit('choose', 'numbermatch')">
        <h2>Number Match</h2>
        <p>Match identical numbers or pairs that add up to 10. Numerical search &amp; planning.</p>
      </button>
    </div>

    <div class="footer-links">
      <button class="data-link" @click="$emit('choose', 'benchmark-menu')">Run a Benchmark</button>
      <button class="data-link" @click="$emit('choose', 'activity')">Activity</button>
    </div>
    <div class="footer-links footer-links--tertiary">
      <button class="data-link" @click="$emit('choose', 'data')">Manage Your Data</button>
      <button class="data-link" @click="$emit('choose', 'about')">About</button>
      <a
        class="data-link github-link"
        href="https://github.com/ebal/brain"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View source on GitHub"
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path
            fill="currentColor"
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
          />
        </svg>
      </a>
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

.brand {
  margin: 0 0 0.5rem;
  font-size: clamp(2.25rem, 9vw, 3rem);
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--accent);
}

h1 {
  margin: 0 0 1.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-dim);
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

.footer-links--tertiary {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--surface-2);
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

.github-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
</style>
