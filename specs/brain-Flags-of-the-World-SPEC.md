# Flags of the World — Visual Recognition & Geographic Learning — Specification

## 1. Goal
Add a mobile-first **Flags of the World** learning game to Brain. Show a country name and exactly four flag choices; the player selects the correct flag. The game supports visual recognition, associative memory, geographic knowledge, visual discrimination, and learning through repetition. It is not a clinical assessment.

## 2. Brain entry
**🌍 Flags of the World**

> See the country. Find its flag. Learn the flags of the world.

## 3. Direction of play
V1 is strictly:

```text
COUNTRY NAME → CHOOSE THE FLAG
```

Do not use flag → country as the primary scored mechanic.

## 4. Question format
Each question has one country and four flag cards with exactly one correct answer. The entire card is tappable. In normal play the cards show only flags, not country names.

## 5. Flag assets
Use optimized **local SVG flags**, not emoji, for scored gameplay. Keep them bundled with Brain (for example `public/flags/gr.svg`). No CDN, runtime image service, or remote dependency. Preserve true aspect ratio inside normalized equal-sized cards.

## 6. Country dataset
Keep a curated/versioned local dataset containing at minimum:

```text
code
canonical English name
region
local flag path
```

Capital is optional but useful for brief feedback/future learning. Explicitly define the included countries/territories. The UI must display the actual dataset total; never hardcode 195 unless exactly 195 scored entries ship.

## 7. Progressive campaign
Use **50 levels**, 10 scored questions each. Level 1 starts unlocked. Completion unlocks the next; stars never gate progression. Completed levels remain replayable.

Suggested progression:

| Levels | Focus |
|---|---|
| 1–5 | Highly recognizable/distinctive flags |
| 6–10 | Europe foundations |
| 11–15 | Americas |
| 16–20 | Asia |
| 21–25 | Africa |
| 26–30 | Oceania + mixed |
| 31–40 | Whole-world mixed recognition |
| 41–45 | Similar/confusing flags |
| 46–50 | World mastery |

Previously introduced countries should periodically reappear for reinforcement.

Each level conceptually stores `id`, `version`, `countryPool`, `questionCount: 10`, `distractorTier`, and review weighting. Do not hide difficulty inside an opaque level-number formula.

## 8. Difficulty philosophy
Difficulty increases through less familiar countries, larger learned pools, cross-region mixing, and increasingly similar distractor flags.

Never increase difficulty by shrinking flags/touch targets, imposing tiny response windows, or adding more than four choices.

**Always four choices; harder means better distractors.**

## 9. Distractor tiers
Maintain curated local distractor/confusion data.

- Tier 1: visually distinct wrong flags
- Tier 2: regional distractors
- Tier 3: flags sharing colors/layout features
- Tier 4: strong confusion-set choices

Examples of useful confusion families (only when all members exist in the shipped dataset):

```text
Romania / Chad / Andorra / Moldova
Indonesia / Monaco / Poland / Singapore
Ireland / Côte d'Ivoire
Netherlands / Luxembourg
Australia / New Zealand
```

Advanced levels should use plausible alternatives, not random nonsense choices.

## 10. Fairness
Avoid questions that depend on microscopic details invisible on mobile, obsolete/unversioned flags, intentional cropping, or inconsistent rendering. If two flags cannot be reliably distinguished at the chosen iPhone size, do not pair them until the UI supports it.

## 11. Interaction
For each question:
1. show country name
2. show four flags
3. accept one tap
4. lock input
5. classify
6. show brief learning feedback
7. advance

Randomize correct-answer position and avoid long position streaks. No Submit button.

## 12. Correct/incorrect feedback
Correct:

```text
✓ Correct
Portugal
[correct flag]
```

Optional small secondary data: `Capital: Lisbon`, `Region: Europe`.

Wrong:

```text
✕
Ireland

Correct:
[Ireland flag]

You selected:
[Côte d'Ivoire flag]
Côte d'Ivoire
```

Wrong-answer feedback should remain long enough (roughly 1–1.5s, or tap-to-continue if testing prefers) to compare the flags. Do not turn each answer into a long lesson.

## 13. Timing
No hard per-question timer. Record response time if useful but do not punish thoughtful recognition.

Use `performance.now()` for a count-up level timer from first interactive question through question 10. Time is secondary to accuracy.

## 14. Per-country learning state
Track locally:

```text
countryCode
attempts
correct
wrong
currentCorrectStreak
lastSeenAt
lastWrongAt
mastery
```

Suggested understandable states:

```text
New
Learning
Mastered
Needs Practice
```

Mastery should require repeated correct performance, not one lucky answer. Keep exact heuristics simple and versionable.

## 15. Weak flags / confusion learning
Repeatedly missed countries become `Needs Practice`. Where practical, store which wrong country was selected so Brain learns specific confusions such as Romania ↔ Chad or Ireland ↔ Côte d'Ivoire.

Weak countries may receive somewhat higher future review probability, but never repeat the same failed country immediately on the next question. Space repetition with other questions.

## 16. Practice Weak Flags
Optional mode available when enough weak items exist:

```text
Practice Weak Flags
```

It prefers Needs Practice countries and known confusion-set distractors, updates learning state, but does not affect campaign unlocking. Fill missing distractors from validated similar/regional pools.

## 17. Learning progress
Useful aggregate display:

```text
Countries Seen       142
Mastered              96
Learning              31
Needs Practice        15
```

This is learned geography knowledge, not a cognitive/IQ score.

## 18. Stars
Accuracy dominates:

```text
★★★ 10/10
★★☆  8–9/10
★☆☆  completed
```

Completion always unlocks the next level.

## 19. Score
Score is optional/secondary. If Brain requires one, keep it simple: `Correct +100`, `Incorrect +0`. Do not make speed a major component. Correct/10 and stars are more meaningful.

## 20. Results
Example:

```text
LEVEL 18 COMPLETE

★★☆

Correct           8 / 10
Accuracy              80%
Best Streak             5
Time                 01:14

Needs Practice
[Ireland flag] Ireland
[Estonia flag] Estonia

Best             10 / 10

[ NEXT LEVEL ]
[ PLAY AGAIN ]
```

Keep the first Results view concise.

## 21. Personal bests / progression
Per level track best Stars, correct count, Accuracy, streak, and Time among equivalent 10/10 results. Provide a simple star/lock level grid and `18 / 50 completed`. No decorative world map.

## 22. Mobile UX
Primary target: iPhone portrait. Prefer a **2×2 flag-card grid** with all choices visible without scrolling. Entire card tappable, generous targets, consistent card dimensions, centered flag, preserved aspect ratio, no cropping, no hover/text selection/double-tap zoom, safe-area aware.

All candidate cards must use equivalent image area, border, padding/background, and rendering quality so asset dimensions never reveal the answer.

Country name is the main prompt: large/readable, with long names wrapping cleanly rather than shrinking excessively.

## 23. Asset validation and licensing
Every country entry must map to a valid local SVG. Add checks for unique codes/names, asset existence, valid level references, confusion-set references, and displayed dataset total.

Use a flag asset set whose license permits redistribution. Document source/license. Do not copy artwork/assets from the referenced quiz website.

Version the dataset conceptually (`flagsDatasetVersion: 1`) because names, designs, inclusion policy, or levels may change.

## 24. Persistence
Persist highest unlocked level, stars/bests per level, per-country learning state, weak/confusion history, last completed level, and dataset version using Brain's existing persistence architecture.

If backgrounded mid-level: pause timer, hide choices, preserve completed questions, and do not mark the unanswered question wrong. Resume safely with the same country (candidate order may be restored or regenerated deterministically).

## 25. Architecture
Integrate with existing Brain Vue/Vite conventions. Conceptually:

```text
components/flags/
composables/flags/
game/flags/
data/flags/
public/flags/
```

Pure logic may include:

```javascript
getCountry(code)
getLevel(levelId)
selectDistractors(country, tier, learningState, rng)
generateQuestion(country, config, rng)
updateCountryLearning(state, answer)
calculateMastery(countryState)
calculateStars(result)
```

Do not redesign Brain.

## 26. Determinism and tests
Support internal seeded generation for question order, distractors, and answer position.

Test:
- unique dataset codes/names
- every SVG exists
- every level/confusion reference valid
- exactly four choices
- exactly one correct
- no duplicate choices
- answer position randomized
- distractor tier respected
- seeded reproducibility
- correct/wrong learning updates
- mastery/Needs Practice transitions
- no immediate failed-country repetition
- Level 1 initially unlocked
- completion unlocks next
- stars improve but never regress
- 10/10 = 3 stars; 8–9 = 2; completion = 1
- interrupted unanswered question is not marked wrong

## 27. Offline / PWA
Everything must work offline: all SVGs, country data, levels, confusion sets, learning logic, progression and history are local. No API/CDN/remote images/fonts. Cold-start from installed Brain PWA must work in Airplane Mode.

Ensure all flag assets are included in the production/PWA caching strategy.

Measure total SVG size, `dist` impact, and precache impact. Optimize SVGs without changing flag correctness; do not add a large flag library dependency merely for convenience.

## 28. Benchmark
Do **not** add Flags of the World to Brain Benchmark. This is learned geographic knowledge/recognition; improvement means the player learned more flags.

## 29. Future
Not v1: flag→country mode, capitals quiz, map quiz, multiplayer, leaderboard, Daily Challenge, online country API, cloud sync, population ranking, or speed mode.

## 30. Final decisions
1. **Flags of the World**.
2. Country name → choose flag.
3. Exactly four choices, normally 2×2.
4. Local optimized SVG flags, not emoji, for scored play.
5. Versioned local country dataset; display actual supported total.
6. 50 levels × 10 questions.
7. Completion unlocks next; stars do not gate.
8. ★★★ 10/10, ★★☆ 8–9/10, ★☆☆ completion.
9. No hard per-question timer; accuracy dominates.
10. Difficulty comes from knowledge + distractor similarity, never more than four choices.
11. Curated confusion sets for advanced levels.
12. Wrong feedback shows correct flag and selected wrong flag/country.
13. Per-country learning state and Needs Practice tracking.
14. Optional Practice Weak Flags mode.
15. No immediate failed-country repetition.
16. Preserve true flag aspect ratio in normalized cards.
17. Document flag-asset source/license.
18. Persist campaign/learning locally.
19. Mobile/iPhone-first.
20. Existing Brain architecture; no backend.
21. Full offline/PWA; all flag assets cached locally.
22. Measure bundle/precache impact.
23. Not part of Brain Benchmark.
