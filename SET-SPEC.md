# SET — Visual Perception and Pattern Recognition — Specification

## 1. Background: what SET is

SET is a visual pattern-recognition card game built around **81 unique cards**. Every card has four independent properties, each with three possible values:

| Property | Values |
|---|---|
| Number | 1, 2, 3 |
| Shape | Diamond, Oval, Squiggle |
| Color | Red, Green, Purple |
| Shading | Solid, Striped, Open |

Because there are four properties with three values each, `3 × 3 × 3 × 3 = 81` unique cards.

The player's task is to find groups of exactly **three cards** that form a valid SET. For each property independently, the three cards must be either **all the same** or **all different**. A property with exactly two matching values and one different value makes the selection invalid.

The game primarily exercises visual scanning, selective attention, pattern recognition and logical classification.

---

## 2. The SET rule

For three selected cards to form a SET, all four properties must independently satisfy:

```text
all same OR all different
```

Example:

```text
Card A: 1 red solid diamond
Card B: 2 green solid oval
Card C: 3 purple solid squiggle
```

This is a SET because number, color and shape are all different, while shading is all the same.

An invalid example:

```text
Card A: 1 red solid diamond
Card B: 2 red solid oval
Card C: 3 green solid squiggle
```

Color is `red, red, green`, which is neither all the same nor all different.

Given any two cards, exactly one card in the complete deck completes their SET. The game engine should use the mathematical rule rather than a manually maintained list.

---

## 3. Card representation

Represent each card using four values from `0..2`:

```text
{
  number: 0..2,
  shape: 0..2,
  color: 0..2,
  shading: 0..2
}
```

Suggested mapping:

```text
number:  0=one, 1=two, 2=three
shape:   0=diamond, 1=oval, 2=squiggle
color:   0=red, 1=green, 2=purple
shading: 0=solid, 1=striped, 2=open
```

For every property of three cards, `(a + b + c) % 3 === 0` must hold. All four properties must satisfy this condition.

---

## 4. Game mode

V1 is a **single-player timed SET game**.

Start with **12 cards** displayed simultaneously. The player searches for a SET and taps three cards.

If valid:

1. increment Sets Found
2. record find time
3. remove the three cards
4. deal replacement cards as required
5. continue

If no SET exists among 12 cards, automatically deal **3 additional cards**. The board may temporarily contain 15, 18 or more cards.

When a SET is found on an expanded board, do not automatically replace those three cards if removing them moves the board back toward 12 cards.

The game ends when the deck is exhausted and no SET remains on the table.

---

## 5. Difficulty

Difficulty changes assistance, not the mathematical SET rule.

### Easy

- normal 12-card board
- timer
- invalid selections explain why they failed
- progressive Hint button
- automatic no-SET detection
- strong selection highlighting

### Medium

- normal 12-card board
- timer
- invalid selection reports only `Not a SET`
- progressive hints available
- no detailed property explanation during play

### Hard

- same standard SET rules
- timer
- no detailed invalid-selection explanation
- hints available but counted
- reduced visual assistance
- no artificial increase in normal card count

Hard should remain enjoyable. Do not make it difficult using confusing colors, tiny cards or excessive visual density.

---

## 6. Starting a game

Main menu:

```text
SET

Easy
Medium
Hard

Continue Game
History
How to Play
```

`Continue Game` appears when an unfinished game exists.

Starting a game creates and shuffles the 81-card deck, deals 12 cards, verifies whether a SET exists, automatically adds three if necessary, and starts timing when the board becomes interactive.

---

## 7. Selecting cards

Tap a card to select it. Selected cards receive a clear highlight. Maximum selection is three cards. Tapping a selected card again deselects it.

When the third card is selected, validate automatically.

Valid:

```text
SET!
```

Invalid:

```text
Not a SET
```

Invalid selections increment the mistake counter. After brief feedback, clear the selection without removing cards.

---

## 8. Easy-mode explanation

In Easy mode, an invalid selection explains the first failing property, eg.:

```text
Not a SET

Color:
Red · Red · Purple

Color must be all the same
or all different.
```

If several properties fail, explaining the first is enough.

---

## 9. Hints

Hints are progressive and should not immediately reveal all three cards.

- First hint: highlight one card belonging to an available SET.
- Second hint: highlight a second card from the same SET.
- Third hint: highlight the complete SET.

Each press increments `Hints used`. Reset hint progression whenever the board changes.

A hint-assisted game counts as completed but cannot replace the **Clean Best** result.

---

## 10. No-SET detection

After every board change, determine all available SETs.

If there are zero SETs and cards remain in the deck, automatically deal three more cards.

If the deck is empty and no SET remains, end the game.

Implement an internal `findAllSets(cards)` function. Do not expose all available SETs during normal play.

---

## 11. Deck generation

Generate all 81 cards programmatically from the Cartesian product of the four properties. Shuffle with Fisher-Yates or an equivalent unbiased shuffle.

Development/tests must verify:

```text
deck.length === 81
uniqueCards === 81
```

No duplicate cards are permitted.

---

## 12. Timer and pause

The timer begins when the first playable board appears. Use `performance.now()` for active timing.

Pause when the player presses Pause or the app/browser becomes hidden. Hide the cards while paused so the board cannot be studied with the timer stopped.

Persist accumulated elapsed time for Continue Game.

---

## 13. Metrics

Track:

- Sets found
- invalid selections / mistakes
- hints used
- elapsed time
- time of each valid SET
- cards remaining in deck
- current board size

For each SET found store:

```text
{
  cards,
  foundAt,
  searchTime,
  boardSize
}
```

End-of-game summary:

- **Completion time**
- **Sets found**
- **Mistakes**
- **Hints used**
- **Average SET find time**
- **Median SET find time**
- **Fastest SET**
- **Slowest SET**
- **Clean game**
- **Best clean time**

Average and median search-time statistics use successfully found SETs only.

---

## 14. Score and personal best

There is **no synthetic points score** in v1.

Primary measurements are completion time, Sets found, mistakes, hints and median find time.

A **Clean Game** means `hints used = 0`. Mistakes remain recorded but do not disqualify it.

Personal best is tracked separately for Easy, Medium and Hard. Primary comparison is the lowest clean completion time, with fewer mistakes as the tie-breaker.

---

## 15. Statistics and history

Track per difficulty:

- games started/completed
- completion rate
- best clean time
- average and median completion time
- average and median SET find time
- average mistakes
- average hints
- clean games
- total SETs found
- current completion streak
- best completion streak

Keep the last **30 completed games**.

Each history entry stores:

```text
{
  gameId,
  difficulty,
  completionTime,
  setsFound,
  mistakes,
  hints,
  avgFindTime,
  medianFindTime,
  cleanGame,
  completedAt
}
```

History filters: `All | Easy | Medium | Hard`.

---

## 16. Autosave / Continue Game

Save after every board-changing action using:

```text
set:active
```

Store the game ID, difficulty, deck, board, selection, Sets found, mistakes, hints, hint state, elapsed time, SET history and timestamps.

Completing or explicitly abandoning the game removes the active entry.

Persistence keys:

```text
set:active
set:history
set:stats:easy
set:stats:medium
set:stats:hard
```

Use browser `localStorage`. No backend/database.

---

## 17. Card rendering

Generate cards using **HTML/CSS/SVG**, not downloaded card images.

Each card displays one, two or three identical symbols. Shapes are Diamond, Oval and Squiggle. Shading is Solid, Striped or Open. Colors are Red, Green and Purple.

Striped SVG patterns must inherit the card color correctly. Cards should be recognizable without text labels.

This keeps rendering sharp, lightweight and completely offline-capable.

---

## 18. Mobile-first layout

Mobile is the primary interface.

For 12 cards prefer approximately a `3 columns × 4 rows` layout. Expanded boards adapt responsively.

Requirements:

- large tap targets
- no overlapping cards
- symbols remain distinguishable
- selected cards clearly visible
- efficient viewport usage
- minimal scrolling during normal 12-card play
- timer/stats secondary to the board
- no hover dependency
- disable accidental text selection
- avoid double-tap zoom where practical

Do not shrink expanded boards until cards become unreadable merely to guarantee zero scrolling.

---

## 19. About / How to Play

Explain the central rule plainly:

> Select three cards. For every property - number, shape, color and shading - the three cards must be either all the same or all different.

Show visual valid and invalid examples, including a property-by-property explanation.

Include an untimed interactive practice board. Practice results are never stored.

---

## 20. Architecture

Keep the project consistent with Stroop, Schulte, N-Back and Sudoku:

- **Vue 3** Composition API
- **Vite**
- single-page application
- no backend/API
- browser `localStorage`
- mobile-first
- Docker Compose
- `node:20-alpine`
- Vite development server
- bind-mounted source / hot reload
- `${DOCKER_UID:-1000}:${DOCKER_GID:-1000}` container user

Suggested structure:

```text
SetGame/
├── SPEC.md
├── docker-compose.yml
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.js
    ├── App.vue
    ├── components/
    │   ├── MainMenu.vue
    │   ├── SetBoard.vue
    │   ├── SetCard.vue
    │   ├── GameScreen.vue
    │   ├── ResultsScreen.vue
    │   ├── HistoryPage.vue
    │   └── AboutPage.vue
    ├── composables/
    │   ├── useSetGame.js
    │   ├── useSetStorage.js
    │   └── useSetStats.js
    └── game/
        ├── deck.js
        ├── setValidator.js
        └── setFinder.js
```

---

## 21. Core game functions

Keep mathematical game logic independent from Vue.

At minimum:

```javascript
createDeck()
shuffleDeck(deck)
isSet(cardA, cardB, cardC)
findCompletingCard(cardA, cardB)
findAllSets(cards)
```

Unit-test these invariants:

```text
createDeck() → exactly 81 unique cards
any two unique cards → exactly one completing card
isSet() → symmetric regardless of card order
findAllSets() → no duplicate combinations
```

---

## 22. Offline / PWA support

The application must work completely offline after its initial installation/cache.

Requirements:

- installable as an iPhone Home Screen PWA
- Web App Manifest
- Service Worker
- application-shell precaching
- no runtime CDN dependencies
- no external fonts/images required for gameplay
- cards rendered locally
- `localStorage` persistence works offline
- active games can continue offline
- history/statistics work offline
- installed app launches when Docker host, DNS and network are unavailable

The normal offline experience is the actual game, not an offline error page.

---

## 23. Future changes

Not part of v1:

- multiplayer
- competitive real-time mode
- Daily SET
- fixed-duration challenge
- puzzle mode with exactly one SET
- adaptive difficulty
- shareable seeded games
- achievements
- CSV/JSON export
- server-side sync
- alternative/accessibility palettes
- dark mode
- i18n

---

## 24. Decisions for v1

1. Standard **81-card** SET deck.
2. Four properties: number, shape, color, shading.
3. Three values per property.
4. A SET requires every property to be **all same or all different**.
5. Single-player.
6. Start with **12 cards**.
7. Automatically add three cards when no SET exists.
8. Follow standard board-size replacement behavior.
9. Easy / Medium / Hard.
10. Hard remains enjoyable rather than artificially extreme.
11. Three-card selection validates automatically.
12. Invalid selections count as mistakes.
13. Easy explains invalid SETs.
14. Progressive hints: one card → two cards → complete SET.
15. Hint-assisted games cannot replace Clean Best.
16. No synthetic points score.
17. Completion and SET-find times are primary metrics.
18. Record average and **median** SET-find time.
19. Autosave active game.
20. Keep last **30 completed games**.
21. Generate cards locally with HTML/CSS/SVG.
22. Browser `localStorage`.
23. Mobile-first.
24. No backend/database.
25. Docker Compose / Vue / Vite architecture.
26. Full offline/PWA support.
27. Core SET mathematics isolated and unit tested.
