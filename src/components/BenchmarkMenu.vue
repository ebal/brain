<template>
  <div class="benchmark-menu">
    <h1>Benchmark</h1>
    <p class="intro">
      Fixed, standardized runs — difficulty is locked per game so a result today is genuinely
      comparable to one from months ago. Sudoku is left out: puzzle-to-puzzle difficulty varies
      too much even within one tier to make a fair fixed benchmark.
    </p>

    <div class="benchmark-grid">
      <button
        v-for="(config, game) in configs"
        :key="game"
        class="benchmark-card"
        @click="$emit('start', game)"
      >
        <h2>{{ config.label }}</h2>
        <p>{{ config.summary }}</p>
      </button>
    </div>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { BENCHMARK_CONFIGS } from '../constants/benchmark.js'

defineEmits(['start', 'menu'])

const configs = BENCHMARK_CONFIGS
</script>

<style scoped>
.benchmark-menu {
  max-width: 640px;
  width: 100%;
  text-align: center;
}

h1 {
  margin-bottom: 0.75rem;
}

.intro {
  color: var(--text-dim);
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
}

.benchmark-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.benchmark-card {
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: 12px;
  padding: 1.5rem 1.25rem;
  text-align: left;
  cursor: pointer;
  color: var(--text);
  transition: border-color 0.15s ease, transform 0.08s ease;
}

.benchmark-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.benchmark-card h2 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}

.benchmark-card p {
  margin: 0;
  color: var(--accent);
  font-size: 0.85rem;
  font-weight: 700;
}

@media (max-width: 480px) {
  .benchmark-grid {
    grid-template-columns: 1fr;
  }
}

.back-btn {
  display: block;
  margin: 0 auto;
  background: var(--surface-2);
  color: var(--text);
  border: none;
  border-radius: 10px;
  padding: 0.85rem 1.5rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}
</style>
