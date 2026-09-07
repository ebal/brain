<template>
  <div class="about-brain">
    <p class="brand">Brain</p>
    <h1>About</h1>

    <p class="intro">
      Brain is a small offline suite of cognitive games for attention, memory, reasoning, and
      personal performance tracking. Each game keeps its own scoring, history, and personal
      bests — see each game's own "How to Play" page for its specific rules.
    </p>

    <div class="rule-box">
      Brain measures your performance on these specific tasks, over time. It does not measure —
      and does not claim to measure — general intelligence, brain health, neurological status, or
      clinical cognitive ability.
    </div>

    <p class="intro">
      Repeated practice can improve performance through familiarity with a task's own mechanics,
      not just the ability the task is meant to probe — so a rising score is best read as
      <em>your performance on this specific game improving</em>, not proof of general cognitive
      improvement. That's also why Benchmark mode compares each result only against your own past
      results on the same fixed task, never against a population or against other games.
    </p>

    <p class="intro">
      No account, no backend, no analytics, no tracking. Every game's history and every setting
      lives only in this browser's local storage — nothing is ever sent anywhere. You can export
      or delete all of it at any time from Manage Your Data.
    </p>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
defineEmits(['menu'])
</script>

<style scoped>
.about-brain {
  max-width: 640px;
  width: 100%;
  text-align: center;
}

.brand {
  margin: 0 0 0.25rem;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}

h1 {
  margin-bottom: 1.25rem;
}

.intro {
  color: var(--text-dim);
  line-height: 1.6;
  text-align: left;
}

.intro em {
  color: var(--text);
  font-style: normal;
  font-weight: 600;
}

.rule-box {
  background: var(--surface);
  border: 1px solid var(--accent);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin: 1.25rem 0;
  line-height: 1.5;
  text-align: left;
  color: var(--text);
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
