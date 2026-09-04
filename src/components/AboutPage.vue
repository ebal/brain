<template>
  <div class="about">
    <h1>How to Play</h1>

    <div class="mode-toggle">
      <button
        v-for="m in modes"
        :key="m.key"
        class="mode-btn"
        :class="{ active: activeMode === m.key }"
        @click="activeMode = m.key"
      >
        {{ m.label }}
      </button>
    </div>

    <p class="intro">
      The <strong>Stroop Effect</strong> is a classic psychology phenomenon: reading a word is
      more automatic than naming a color, so when the two conflict, your brain hesitates.
    </p>

    <div class="rule-box">
      <template v-if="activeMode === 'color'">
        The rule: tap the button that matches the <strong>color the word is printed in</strong>
        — ignore what the word actually says. This is the classic, harder version of the test.
      </template>
      <template v-else>
        The rule: tap the button that matches <strong>what the word says</strong> — ignore the
        color it's printed in. This direction is much easier, since reading is automatic.
      </template>
    </div>

    <h2>Two kinds of trials</h2>
    <div class="examples-static">
      <div v-for="(ex, i) in examples" :key="i" class="example-card">
        <div class="example-word" :style="{ color: ex.ink.hex }">{{ ex.display }}</div>
        <p class="example-caption">
          <strong>{{ ex.congruent ? 'Congruent' : 'Incongruent' }}</strong> —
          <template v-if="activeMode === 'color'">
            the word says "{{ ex.wordName }}" but it's printed in
            <strong :style="{ color: ex.ink.hex }">{{ ex.ink.name }}</strong> ink.
            Correct answer: <strong>{{ ex.ink.name }}</strong>.
          </template>
          <template v-else>
            it's printed in {{ ex.ink.name }} ink, but the word itself says "{{ ex.wordName }}".
            Correct answer: <strong>{{ ex.wordName }}</strong>.
          </template>
        </p>
      </div>
    </div>

    <h2>Difficulty levels</h2>
    <p class="intro">
      Each level adds more color choices <em>and</em> more incongruent (tricky) trials, so it's a
      genuinely harder version of the task, not just a longer one. Levels apply the same way in
      both modes, with separate best scores tracked per mode.
    </p>
    <div class="difficulty-table">
      <div class="difficulty-row difficulty-row--head">
        <span>Level</span>
        <span>Colors</span>
        <span>Duration</span>
        <span>Tricky trials</span>
      </div>
      <div v-for="d in difficulties" :key="d.key" class="difficulty-row">
        <span>{{ d.label }}</span>
        <span>{{ d.colorCount }}</span>
        <span>{{ d.duration }}s</span>
        <span>{{ Math.round((1 - d.congruentRatio) * 100) }}%</span>
      </div>
    </div>

    <h2>Colors</h2>
    <p class="intro">
      Every color used in the game, shown in its actual in-game ink color. Lower difficulties use
      just the first few; higher difficulties add the rest.
    </p>
    <div class="colors-grid">
      <ColorButton v-for="c in COLOR_PALETTE" :key="c.name" :color="c" />
    </div>

    <h2>Try it yourself</h2>
    <p class="intro">No timer, no scoring — just get a feel for it before you play for real.</p>

    <div class="demo">
      <div class="stimulus-area" :class="feedback ? `feedback-${feedback}` : ''">
        <div class="word" :style="{ color: example.color.hex }">{{ example.word }}</div>
      </div>

      <p class="feedback-text" :class="feedback">
        <template v-if="feedback === 'correct'">
          Correct! The target was <strong>{{ target }}</strong>.
        </template>
        <template v-else-if="feedback === 'wrong'">
          Not quite — the target was <strong>{{ target }}</strong>.
        </template>
        <template v-else-if="activeMode === 'color'">
          Tap the button matching the ink color above.
        </template>
        <template v-else>
          Tap the button matching what the word says.
        </template>
      </p>

      <div class="options-grid">
        <ColorButton
          v-for="c in palette"
          :key="c.name"
          :color="c"
          @click="answer(c.name)"
        />
      </div>

      <button class="next-btn" @click="newExample">Try Another Example</button>
    </div>

    <button class="back-btn" @click="$emit('menu')">Back to Menu</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ColorButton from './ColorButton.vue'
import { paletteFor, COLOR_PALETTE, DIFFICULTIES, MODES } from '../constants/colors.js'

const props = defineProps({
  initialMode: { type: String, default: 'color' },
})
defineEmits(['menu'])

const palette = paletteFor(4)
const difficulties = Object.values(DIFFICULTIES)
const modes = MODES
const activeMode = ref(props.initialMode)

function colorByName(name) {
  return COLOR_PALETTE.find((c) => c.name === name)
}

// Ink colors are looked up from COLOR_PALETTE (never hardcoded) so these
// examples can't drift out of sync when the palette's hex values change.
const STATIC_EXAMPLES = [
  { display: 'RED', wordName: 'Red', ink: colorByName('Blue') },
  { display: 'GREEN', wordName: 'Green', ink: colorByName('Green') },
]

const examples = computed(() =>
  STATIC_EXAMPLES.map((ex) => ({ ...ex, congruent: ex.wordName === ex.ink.name }))
)

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generate() {
  const word = pickRandom(palette)
  const congruent = Math.random() < 0.5
  const color = congruent ? word : pickRandom(palette.filter((c) => c.name !== word.name))
  return { word: word.name, color }
}

const example = ref(generate())
const feedback = ref(null)

const target = computed(() =>
  activeMode.value === 'word' ? example.value.word : example.value.color.name
)

function answer(colorName) {
  feedback.value = colorName === target.value ? 'correct' : 'wrong'
}

function newExample() {
  example.value = generate()
  feedback.value = null
}
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
  margin: 2rem 0 1rem;
  font-size: 1.15rem;
}

.mode-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  background: var(--surface);
  padding: 0.35rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.mode-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  padding: 0.85rem 0.5rem;
  border-radius: 9px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}

.mode-btn.active {
  background: var(--accent);
  color: #10121a;
}

.intro {
  color: var(--text-dim);
  line-height: 1.6;
}

.rule-box {
  background: var(--surface);
  border: 1px solid var(--accent);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin: 1.25rem 0;
  line-height: 1.5;
}

.examples-static {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.example-card {
  background: var(--surface);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
}

.example-word {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 0.75rem;
}

.example-caption {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-dim);
  line-height: 1.5;
  text-align: left;
}

.difficulty-table {
  background: var(--surface);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.difficulty-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 1fr;
  padding: 0.65rem 1rem;
  font-size: 0.9rem;
}

.difficulty-row:not(:last-child) {
  border-bottom: 1px solid var(--surface-2);
}

.difficulty-row--head {
  color: var(--text-dim);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.colors-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.demo {
  background: var(--surface);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.stimulus-area {
  width: 100%;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--stimulus-bg);
  border-radius: 16px;
  border: 3px solid transparent;
  transition: border-color 0.15s ease;
}

.stimulus-area.feedback-correct {
  border-color: var(--correct);
}

.stimulus-area.feedback-wrong {
  border-color: var(--wrong);
}

.word {
  font-size: 2.75rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.feedback-text {
  margin: 0;
  min-height: 1.4em;
  color: var(--text-dim);
  text-align: center;
}

.feedback-text.correct {
  color: var(--correct);
}

.feedback-text.wrong {
  color: var(--wrong);
}

.options-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.next-btn {
  background: var(--surface-2);
  color: var(--text);
  border: none;
  border-radius: 10px;
  padding: 0.7rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
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

@media (max-width: 480px) {
  .examples-static {
    grid-template-columns: 1fr;
  }

  .colors-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .options-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .word {
    font-size: 2.1rem;
  }
}
</style>
