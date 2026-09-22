<template>
  <div class="about">
    <h1>How to Play</h1>

    <p class="intro">
      A country's name appears — pick its flag from four choices. Tapping a flag answers
      immediately; there's no Submit button, and no timer pressure. Take your time.
    </p>

    <p class="intro">
      After each answer you'll see the correct flag, and if you were wrong, the flag you
      picked instead — a quick way to compare the two before moving on.
    </p>

    <h2>Levels &amp; difficulty</h2>
    <p class="intro">
      50 levels, 10 questions each. Level 1 starts unlocked, and finishing a level — mistakes
      or not — unlocks the next one; stars reward accuracy but never gate progress. Early
      levels use the world's most recognizable flags; later ones mix in whole regions, then
      the full world, then deliberately similar-looking flags (Chad vs. Romania, Indonesia
      vs. Monaco, and other classic mix-ups) once you've seen enough of the dataset to make
      that a fair challenge rather than a guess.
    </p>

    <h2>Learning states</h2>
    <div class="outcome-table">
      <div class="outcome-row"><span class="outcome-case">Never attempted</span><span class="outcome-result new">New</span></div>
      <div class="outcome-row"><span class="outcome-case">Seen, not yet mastered</span><span class="outcome-result learning">Learning</span></div>
      <div class="outcome-row"><span class="outcome-case">3+ correct in a row</span><span class="outcome-result mastered">Mastered</span></div>
      <div class="outcome-row"><span class="outcome-case">Missed recently</span><span class="outcome-result needs-practice">Needs Practice</span></div>
    </div>
    <p class="intro">
      Brain also remembers which wrong flag you picked for a missed country, so a repeated
      mix-up (like Ireland vs. Côte d'Ivoire) can show up again as a distractor later — that's
      deliberate, not a bug.
    </p>

    <h2>Practice Weak Flags</h2>
    <p class="intro">
      Once you have a handful of Needs Practice countries, a Practice Weak Flags button
      appears on the level menu. It's a short, unlocked-anytime round focused on exactly
      those flags — it updates your learning progress but never affects level unlocks or
      stars.
    </p>

    <p class="intro">
      This is a recognition and geography-learning game, not a cognitive or IQ test — a
      rising score just means you've learned more flags.
    </p>

    <h2>Flag artwork</h2>
    <p class="intro">
      Flag SVGs are from
      <a href="https://github.com/hampusborgos/country-flags" target="_blank" rel="noopener noreferrer">hampusborgos/country-flags</a>,
      public domain (sourced from Wikimedia Commons). All flags ship bundled with Brain and
      work fully offline.
    </p>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
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

.intro a {
  color: var(--accent);
}

.outcome-table {
  background: var(--surface);
  border-radius: 12px;
  overflow: hidden;
  margin: 0.5rem 0 1rem;
}

.outcome-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
}

.outcome-row:not(:last-child) {
  border-bottom: 1px solid var(--surface-2);
}

.outcome-case {
  color: var(--text-dim);
}

.outcome-result {
  font-weight: 700;
}

.outcome-result.new {
  color: var(--text-dim);
}

.outcome-result.learning {
  color: var(--accent);
}

.outcome-result.mastered {
  color: var(--correct);
}

.outcome-result.needs-practice {
  color: var(--wrong);
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
