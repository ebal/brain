# Whack-a-Mole — Spatial Attention & Reaction Speed — Specification

## 1. Goal
Add a fast, playful, mobile-first **Whack-a-Mole** game to Brain. Targets appear briefly in random cells. Tap the mole quickly while ignoring distractors introduced later. The game exercises spatial attention, target detection, reaction speed, response inhibition, and sustained attention. It is not a clinical test.

## 2. Brain entry
**🐹 Whack-a-Mole**

> Spot the mole, ignore distractions and react fast. Spatial attention & reaction speed.

## 3. Core rule
A fixed grid of holes/cells is displayed. `🐹 = TAP`. Later, `🐰 = DO NOT TAP`. The entire occupied cell is tappable; precise emoji tapping is not required.

## 4. Outcomes
- Mole + tap = **Hit**
- Mole + no tap = **Miss**
- Distractor + tap = **False Alarm**
- Distractor + no tap = **Correct Rejection**
- Tap on another/empty cell = **Empty Tap**

Track Empty Taps separately because they are spatial/motor errors rather than inhibition failures.

## 5. Progressive levels
Use **50 levels**. Level 1 starts unlocked; completion unlocks the next; completed levels remain replayable.

| Levels | Grid | Challenge |
|---|---:|---|
| 1–5 | 2×2 | Mole only, slow |
| 6–10 | 3×3 | Mole only |
| 11–15 | 3×3 | Faster |
| 16–20 | 3×3 | Introduce 🐰 |
| 21–30 | 3×3 | Faster + distractors |
| 31–40 | 4×4 | Larger spatial search |
| 41–45 | 4×4 | Short response windows |
| 46–50 | 4×4 | Fast mixed-target mastery |

Do not exceed 4×4 in v1; tiny cells would increasingly measure motor precision.

## 6. Level configuration
Each deterministic/versioned level defines conceptually:

```text
id, version, gridSize, duration,
targetCount, distractorCount,
targetVisibleMs, gapMinMs, gapMaxMs,
maxConsecutiveSameCell, starThresholds
```

Do not hide difficulty inside one opaque level-number formula.

## 7. Duration and timing
Keep levels short: roughly 20–25s early, 25–35s middle, 30–45s advanced.

Stimulus cycle:

```text
empty board → random gap → stimulus → response window → disappear → next gap
```

Use controlled random gaps (roughly 300–900ms initially) so rhythmic tapping is ineffective.

Target visibility starts around 1000–1200ms and may fall toward 400–650ms at advanced levels. Tune on a physical iPhone.

## 8. Spawn fairness
Randomize positions with constraints. Prefer no immediate reuse of the same cell; never allow three consecutive stimuli in one cell. Use a shuffled-position bag or bounded distribution so all board regions receive reasonable representation.

Do not spawn multiple stimuli simultaneously in v1.

After `3-2-1-GO`, wait a normal randomized gap before the first stimulus. Every final stimulus must receive its full response window.

## 9. Distractors
Early levels use only 🐹. Introduce 🐰 gradually:

```text
16–20  ~10%
21–30  ~15–20%
31–40  ~20–25%
41–50  ~25–30%
```

Distractors never become the majority.

## 10. Input
The whole cell is the response target. Navigation/header controls are outside the response grid.

Only one classified response may occur per stimulus. Ignore subsequent taps until the next response opportunity. Use only a minimal debounce necessary to prevent one physical touch being interpreted twice.

## 11. Hit / Miss / False Alarm
A mole-cell tap is a Hit. Record RT and hide it immediately. Mole timeout is a Miss. Distractor-cell tap is a False Alarm. Distractor timeout is a Correct Rejection. Wrong-cell/inter-stimulus taps are Empty Taps.

## 12. Reaction time
Use `performance.now()`. RT begins when the mole is visible and interactive and ends on the first valid tap in its cell. Primary RT metrics use Hits only.

## 13. Feedback
Keep feedback brief and non-blocking: ✓ Hit, ✕ False Alarm, subtle flash for Empty Tap, subtle miss indicator. Never pause the stream for feedback.

## 14. Score
Secondary to raw metrics:

```text
Hit                +100
Correct Rejection   +25
Miss                -75
False Alarm        -100
Empty Tap           -25
```

Minimum score 0. No RT speed bonus in v1; direct RT measurement is preferable and avoids encouraging anticipatory tapping.

## 15. Metrics
Calculate:
- Hit Rate = Hits / (Hits + Misses)
- False Alarm Rate = False Alarms / (False Alarms + Correct Rejections)
- Empty Taps
- Median Hit RT
- Average Hit RT
- Fastest Hit RT

## 16. Completion and stars
A level completes after all scheduled stimuli are classified. Mistakes do not block progression.

Suggested stars:

```text
★★★ Hit Rate >=95%, False Alarm Rate <=5%, Empty Taps=0
★★☆ Hit Rate >=85%, False Alarm Rate <=15%
★☆☆ completed
```

For levels without distractors, ignore False Alarm Rate. Tune thresholds after play-testing. Stars never gate the next level.

## 17. Results
Example:

```text
LEVEL 27 COMPLETE
★★★

Score               2,840
Hits                18 / 20
Misses                   2
False Alarms             1
Correct Rejections       5
Empty Taps               1
Hit Rate               90%
False Alarm Rate       17%
Median Reaction       361 ms
Average Reaction      382 ms
Fastest Reaction      284 ms

[ NEXT LEVEL ]
[ PLAY AGAIN ]
```

Keep the initial Results view concise.

## 18. Personal bests and progression
Track per level: Stars, Score, Hit Rate, False Alarm Rate, Empty Taps, and eligible Median RT. RT bests require reasonable accuracy (e.g. Hit Rate >=85% and, where relevant, False Alarm Rate <=15%).

Provide a simple level selector with stars/locks and overall `27 / 50 completed`. Track highest unlocked level, total stars, 3-star levels, aggregate outcome counts, and play time. No universal cognitive score.

## 19. App switching
No manual Pause is required. If hidden, pause timing, hide/discard the active stimulus without classification, and preserve completed events. Resume with `3-2-1`, then a fresh gap/stimulus.

Because levels are short, complex mid-level persistence is optional. Campaign progress and bests must always persist.

## 20. Visual/mobile design
Use emoji for v1: 🐹 target, 🐰 distractor. No remote sprites/assets.

Use a stable CSS grid. Cells never resize when stimuli appear. Entire grid fits iPhone portrait without scrolling. Cells are generous touch targets. No hover dependency, text selection, double-tap zoom, or layout shift. Safe-area aware.

Do not use Canvas/WebGL/Phaser/PixiJS. Normal Vue state, CSS and timers are sufficient.

## 21. Tutorial
Levels 1–2 naturally teach mole tapping. Before Level 1, show `🐹 TAP` with a short 2×2 practice. When distractors first appear, show once:

```text
🐹 TAP
🐰 DON'T TAP
```

Allow a short practice. Do not repeatedly show tutorials.

## 22. Determinism
Level configuration is fixed, while each run may use a seed for spawn positions/gaps. Support deterministic seeded runs internally for testing/debugging while retaining replay variety.

## 23. Architecture
Integrate with Brain's existing Vue/Vite structure; do not add a game engine. Keep sequence generation/classification logic pure where practical:

```javascript
getLevelConfig(levelId)
generateStimulusSequence(config, rng)
chooseSpawnCell(previousCell, bag, rng)
classifyResponse(stimulus, response)
calculateWhackMetrics(events)
calculateStars(result, config)
```

## 24. Tests
Test 50 unique valid configs, intended grid sizes/distractor introduction, exact target/distractor counts, one active stimulus, same-cell constraints, fair spatial distribution, full final response windows, all five classifications, repeated-tap suppression, `performance.now()` Hit RT, interrupted-stimulus discard, metric calculations, score constants, stars, unlocking, and replay safety.

## 25. Offline / PWA
All level configs, emoji, generation, scoring, progression and history are local. No API/CDN/remote images/audio. Cold-start must work from the installed Brain PWA in Airplane Mode. Introduce zero runtime network dependencies.

## 26. Future
Not v1: simultaneous moles, moving targets, power-ups, combos, lives, bosses, mandatory audio/haptics, skins, multiplayer, leaderboards, or global Brain Score.

## 27. Final v1 decisions
1. **Whack-a-Mole**, 50 progressive levels.
2. 🐹 target; 🐰 later distractor.
3. Exactly one active stimulus.
4. Whole occupied cell tappable.
5. Empty/wrong-cell taps tracked separately.
6. Progress 2×2 → 3×3 → max 4×4.
7. Short 20–45s levels.
8. Controlled random gaps and fair spatial distribution.
9. Avoid consecutive same-cell spawns.
10. Full response window for every stimulus.
11. Hit/Miss/False Alarm/Correct Rejection/Empty Tap metrics.
12. `performance.now()` for Hit RT.
13. Score: +100/+25/-75/-100/-25 respectively.
14. No RT speed bonus.
15. Stars measure mastery but never gate progression.
16. Completion unlocks next level.
17. Backgrounded stimulus discarded.
18. Campaign progress/bests local.
19. CSS grid + emoji, no game-engine dependency.
20. Mobile/iPhone-first.
21. No backend.
22. Full offline/PWA.
