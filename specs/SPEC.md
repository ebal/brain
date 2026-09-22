# Stroop Effect Test — Specification

## 1. Background: what a Stroop test actually is

The Stroop effect (Stroop, 1935) is the measurable slowdown and increase in errors that occurs when a person must name the **ink color** a word is printed in, while the word itself spells out a *different* color name (an "incongruent" trial — e.g. the word "RED" printed in blue ink) versus a "congruent" trial where word and ink match, or a neutral trial with no color-word meaning at all.

Key facts from the research that inform this design:

- **The task is always: name the ink color, ignore the word's meaning.** This is what creates cognitive interference — reading is more automatic than color-naming, so the brain wants to blurt out the word instead of the color it's drawn in.
- **Congruent vs incongruent trials** are the classic manipulation. Reaction time (RT) is reliably slower and error rates higher on incongruent trials. The gap (RT<sub>incongruent</sub> − RT<sub>congruent</sub>) is called the **interference score** and is the metric researchers actually care about.
- **Standard computerized versions** run on the order of 100–200 trials, present one stimulus at a time, record RT in milliseconds and accuracy per trial, and typically insert a short pause (~300 ms) between trials to prevent anticipatory responses.
- Typical practice is to record RT **per trial**, not just an aggregate, so accuracy and speed can be broken down by trial type.
- Sources: [Wikipedia — Stroop effect](https://en.wikipedia.org/wiki/Stroop_effect), [Simply Psychology — Stroop Effect](https://www.simplypsychology.org/stroop-effect.html), [Gorilla — Stroop Task](https://support.gorilla.sc/support/educational-resources/classic-psychology-tasks/Stroop-task), [Frontiers — eStroop](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.663786/full).

### Design decision this implies for your app

You asked for "random words of 5/10 basic colors," which maps naturally onto the classic task: show a color **name** rendered in a **font color**, and have the user click the button matching the **font color** (not the word). To keep it a genuine Stroop test rather than a plain color-naming drill, **most trials should be incongruent** (word ≠ ink color) with a smaller fraction of congruent trials mixed in — this is what actually produces the Stroop effect and lets us report an interference score, which is a nice bonus stat beyond what you asked for.

No two identical (word, ink color) trials appear back-to-back.

---

## 2. Game modes (revised — color count and ratio now both scale per difficulty)

Originally all four difficulties shared a fixed 75/25 incongruent/congruent mix and jumped straight from 5 to 10 colors. That meant Easy→Medium and Hard→Very Hard weren't actually *harder* — they were just *longer* (endurance, not difficulty). Revised so each tier is a genuinely tougher version of the Stroop task on two axes at once — more color choices *and* a higher interference ratio:

| Difficulty | Colors | Duration | Incongruent / Congruent mix |
|---|---|---|---|
| Easy | 4 | 30 s | 50% / 50% |
| Medium | 6 | 60 s | 65% / 35% |
| Hard | 8 | 60 s | 80% / 20% |
| Very Hard | 10 | 90 s | 90% / 10% |

**Color palette (ordered, each tier is a superset of the previous):** Red, Blue, Green, Yellow → *+ Purple, Orange* → *+ Cyan, Pink* → *+ Brown, Black*.

The first 4 (Red, Blue, Green, Yellow) match the classic Stroop (1935) color set, so Easy mode is close to the original research task.

Colors are chosen to be visually distinct (important for colorblind accessibility — see §6). Each trial, the word is one of the palette's color names, rendered in a font color also drawn from the palette (weighted per that difficulty's congruent ratio), and the user answers by clicking one of N color-swatch buttons (N = 4, 6, 8, or 10) representing the **ink color**.

No fixed word count — trials run back-to-back for the full duration and however many the player answers in that time counts. A short (~250 ms) gap between trials avoids answer-bleed and matches standard practice.

*Trade-off*: because the trial mix now differs per difficulty, the **interference score** (§3) isn't directly comparable across difficulties anymore — a Very Hard round's interference score reflects near-pure incongruent exposure, an Easy round's reflects a 50/50 mix. Comparisons should be made within the same difficulty over time, not across difficulties.

---

## 3. Metrics captured & shown at end of round

Per trial we log: word shown, ink color, whether congruent, the color clicked, correct/incorrect, and RT in ms.

End-of-round summary:

- **Correct answers / Wrong answers** (counts)
- **Total trials attempted**
- **Accuracy rate** = correct / total, as %
- **Average response time** — mean RT across correct answered trials (expected to land ~1.0–1.5 s per your note; this is an *output* of real play, not something hardcoded)
- **Median response time** — median RT across correct answered trials, shown alongside the average to reduce the impact of occasional unusually slow responses
- **Interference score** — avg RT(incongruent) − avg RT(congruent), using correct responses only. Show the interference score only when there are at least 5 valid congruent and 5 valid incongruent responses; otherwise display "Not enough trials". This is a bonus metric that makes this a genuine Stroop measurement rather than a reflex game
- **Total score** — a simple formula rewarding both speed and accuracy:
  `score = correct_answers × 100 − wrong_answers × 50`, with an optional speed bonus per correct answer for RT < 1000 ms (+10). Simple, transparent, tunable later.
- **Best score for this difficulty** — compared against the stored personal best; shown as "New Best!" when beaten.

---

## 4. Persistence: best scores

Since this is a single-user, no-login, container-based app, the simplest correct choice is **browser `localStorage`**, keyed per mode and difficulty (`stroop:best:color:easy`, `...:word:medium`, etc. — see §9's game-mode changelog entry), storing `{ score, accuracy, avgRT, date }`. This persists across container restarts (it lives in the browser, not the container) and requires no backend, no database, and no volume mounts.

*Trade-off noted for the future*: localStorage is per-browser/per-device — best scores won't sync between your laptop and phone. If that's ever wanted, see §7 (future changes).

---

## 5. Architecture

- **Vue 3** (Composition API) + **Vite** for the build.
- Single-page app, no router needed (one screen: menu → game → results, controlled by local state).
- No backend/API — pure static frontend. Vite builds static files.
- **Docker (revised again — single dev service, see §9)**: one plain `node:26-trixie-slim` image, no Dockerfile, no build step at all. The `brain` service bind-mounts the whole project and runs `npm install && npm run dev -- --host 0.0.0.0`, exposing Vite's own dev server (with hot-reload) on `5173:5173`. Runs as `${DOCKER_UID:-1000}:${DOCKER_GID:-1000}` (overridable via a local, gitignored `.env`) instead of root, since it writes into the bind-mounted project (`node_modules`, `.npm-cache`). No backend database; app state (best scores, history) lives in the browser via `localStorage`, so the container stays stateless.
- Superseded: an earlier revision ran two services — an always-on `nginx:alpine` serving a pre-built `./dist` plus an on-demand `node:20-alpine` `builder` profile to (re)produce it — trading instant dev iteration for a hardened, minified production artifact. Dropped because the only real usage was local/personal iteration, where the manual build-then-serve cycle was pure friction; the dev server is a straight downgrade in production-readiness (unminified, dev-only tooling, not meant to be exposed publicly) that this project's actual usage doesn't need. `npm run build && npm run preview` remains the closest built-in equivalent if a production-like check is ever needed.

```
Stroop/
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
    │   ├── AboutPage.vue
    │   ├── HistoryPage.vue
    │   ├── GameScreen.vue
    │   ├── ResultsScreen.vue
    │   └── ColorButton.vue
    ├── composables/
    │   ├── useStroopGame.js      # trial generation, timer, scoring logic (mode-aware)
    │   ├── useBestScores.js      # localStorage read/write, keyed by mode + difficulty
    │   └── useScoreHistory.js    # rolling per-round log, keyed by mode + difficulty
    └── constants/
        └── colors.js             # color palette, difficulty tiers, game modes
```

This keeps game logic (composables) separate from presentation (components), which matters for §7's future changes — most of them are additive changes to `useStroopGame.js` or `colors.js`, not rewrites.

---

## 6. UX details worth deciding now

- **Input method**: on-screen clickable color-swatch buttons (works on desktop and touch/mobile alike). Button positions remain fixed within each difficulty so the test does not add visual-search and changing motor-navigation costs on top of Stroop interference. Optional keyboard shortcuts (1–5 / 1–0) as a fast-follow, not required for v1.
- **Colorblind consideration**: since this is fundamentally a color test, true colorblind accessibility is out of scope for v1 (it would change the nature of the test), but palette colors are chosen to be maximally distinct even under common color-vision deficiencies. Noted as a future option (shape/pattern overlay mode).
- **Countdown/start**: 3-2-1 countdown before each round starts, so the timer doesn't eat reaction time on the very first trial.
- **Mid-round pause between trials**: ~250 ms blank gap after each answer, per standard Stroop implementations, to prevent anticipatory clicking.
- **Visual feedback**: brief flash (green/red border or checkmark/x) on each answer so the game feels responsive, without pausing the timer.

---

## 7. Future changes this design leaves room for

- **Keyboard input mode** for faster play / accessibility.
- **Adjustable congruent/incongruent ratio** (e.g. a "pure interference" mode at 100% incongruent for the research-accurate version).
- **Per-trial history export** (CSV/JSON) if you ever want to analyze your own RT distribution.
- **Server-side persistence** (tiny SQLite + small API service added to the compose file) if you want best scores to sync across devices — the composable boundary (`useBestScores.js`) is designed so swapping localStorage for a fetch call is a localized change.
- **Additional difficulty tiers** or a custom mode (user picks color count + duration) — trivial given `colors.js` already separates 5- and 10-color sets.
- **Sound effects / haptics**, **dark mode**, **i18n** (color names in other languages).
- **Colorblind-friendly alt mode** using patterns/icons in addition to color.

---

## 8. Decisions (finalized)

1. Congruent/incongruent mix: now **scales per difficulty** — see §2 (was a flat 75/25 in v1).
2. Scoring formula: **+100 per correct, −50 per wrong, +10 speed bonus per correct answer under 1s**.
3. ~~Exposed port: **8888** (host) → 80 (container, nginx).~~ Superseded — see §9: the nginx service was dropped, current `dev` service exposes **5173** (Vite's own dev server port) directly.

---

## 9. Changelog since initial build

- **Blue** brightened from `#457b9d` to `#3a86ff` for better visibility.
- Color buttons enlarged slightly (more padding, bigger font, min-height) for easier mobile tapping.
- Fixed a countdown bug where the "Go!" flash never actually rendered before the round started.
- Added an **About / How to Play** page (linked from the main menu): explains the rule, shows static congruent vs. incongruent examples, and includes a live untimed practice trial.
- Congruent/incongruent ratio now scales per difficulty instead of a flat 75/25 (§2).
- Color count per difficulty changed from a flat 5/5/10/10 split to a smooth 4/6/8/10 progression, with a single ordered master color list instead of two separate palettes (§2).
- Stimulus display background lightened (dark surface → light neutral `#eef0f4`) for better contrast across the full color set — darker colors like Black and Brown were hard to read against the old dark background. Yellow, Cyan, and Black hex values were also adjusted slightly to stay legible on the new light background.
- Yellow nudged lighter again (`#d1a300` → `#e0b400`) per user feedback.
- Added a **game mode** toggle on the front page: **Color Match** (classic — tap the ink color) and **Word Match** (tap what the word says, ignoring ink color). Word Match is the "word reading" condition from the Stroop literature and typically shows much less interference, since reading is largely automatic — included as a genuine contrast to the classic task, not just a reskin. Same 4 difficulty tiers apply to both modes; best scores are tracked separately per mode+difficulty (`stroop:best:<mode>:<difficulty>` in localStorage). The About page got a matching mode toggle so its rule text, examples, and live practice trial reflect whichever mode is selected.
- UX priority confirmed as **mobile-first, browser-second** — layout decisions (segmented mode toggle, single-column difficulty grid on small screens, larger tap targets) are made with phone use as the primary case.
- Added a **Score History** view: every finished round (not just new bests) is appended to a capped rolling log (last 20 entries) in localStorage, keyed by mode + difficulty (`stroop:history:<mode>:<difficulty>`). Reachable from the main menu footer and from the Results screen. Shows a simple inline-SVG sparkline of score trend plus a scrollable list of past rounds (date, score, accuracy, avg RT), with mode/difficulty toggles to switch what's shown. New composable: `useScoreHistory.js`.
- **Removed the custom Dockerfile entirely** — replaced with two plain-official-image Compose services: `stroop` (nginx:alpine, bind-mounted `dist/`, always instant to start/stop) and `builder` (node:20-alpine, run on demand only when source changes, under the `build` profile). Motivation: `docker compose up/start/stop` should never require a build, and the running service should be a completely unmodified upstream image.
- Green swatch retuned from `#2a9d8f` (read as teal) to `#2a9d52`, a more unambiguous green.
- `ColorButton` text color/shadow now computed per-swatch from perceived brightness instead of hardcoded white — Yellow and Pink were low-contrast with white text.
- Added a **Colors** section to the About page listing every in-game color as an actual swatch, between the difficulty table and the live practice demo.
- Four swatches retuned to more evocative shades: Blue → royal blue (`#3a86ff` → `#4169e1`), Green → avocado (`#6b8e23`, previously `#2a9d52`), Cyan → a brighter cyan (`#0091ab` → `#00a8cc`), Yellow → a brighter, lighter gold (`#e0b400` → `#e6c200`). All four still keep enough contrast against the light stimulus background (`#eef0f4`) to stay readable as ink color — Yellow is the tightest margin, as it always has been (see the two earlier Yellow tuning passes above); go lighter still only with a legibility check against that background.
- **Simplified Docker to a single `dev` service** (superseding the `stroop`/`builder` split above): runs Vite's own dev server against the bind-mounted source with hot-reload, so there's no build step at all for local iteration — `docker compose up` and edit files. Motivation: in practice this project is only ever run locally/personally, where the nginx+builder split's production-grade artifact wasn't buying anything, just an extra manual build step before every change showed up. Container now runs as `${DOCKER_UID:-1000}:${DOCKER_GID:-1000}` (configurable via a local `.env`) instead of a hardcoded UID, so the compose file isn't tied to one machine.
- Added installable-PWA / offline support (`vite-plugin-pwa`) — see §10.
- Added a third game mode, **Underline Word**: a cued task-switching variant, user-requested. Behaves exactly like Color Match (tap the ink color) except on a random ~25% of trials (`UNDERLINE_RATIO` in `constants/colors.js`), where the word itself is rendered underlined and the target flips to what the word says instead — an independent per-trial coin flip, orthogonal to the existing congruent/incongruent word-vs-ink axis. Forces the player to keep checking which rule applies trial-by-trial rather than settling into one consistent response habit, which is the added cognitive-switching load the mode is for. Same 4 difficulty tiers, same score/history/best-score plumbing as Color/Word Match (`stroop:best:underline:<difficulty>`, `stroop:history:underline:<difficulty>`) — no new persistence code was needed since the mode dimension was already fully generic. About page gained a third mode-toggle position with its own rule explanation, a static underlined-vs-not example pair, and the live practice trial now generates underlined trials too when that mode is selected.

---

## 10. Offline / PWA support

The application is installable as an iPhone (and Android/desktop) Home Screen PWA and remains fully playable without network connectivity once it's been installed/cached once.

Requirements:

- Web App Manifest (`vite.config.js` → `VitePWA({ manifest: ... })`), standalone display mode, app name/icons/theme color.
- Service Worker precaching the entire built app shell (HTML, JS, CSS, manifest, icons) via Workbox — generated automatically from the production build, not hand-written.
- No runtime network dependency exists for gameplay in the first place — audited: zero `fetch`/`axios`/`WebSocket`/CDN/remote-font references anywhere in `src/`, so there was nothing to special-case for offline; the precached shell *is* the whole app.
- Existing `localStorage` persistence (best scores, history, stats — every game in the suite) is untouched and works identically offline, since it was never network-backed to begin with.
- Registration is explicit (`src/main.js`, via `virtual:pwa-register`) rather than auto-injected, so success/failure is visible in the console.
- **Only present in the production build** (`npm run build` + serving `dist/`, e.g. via `npm run preview`) — the `dev` service (`npm run dev`) intentionally serves the app without a Service Worker, exactly as before; nothing about local development changed.
- **Secure context requirement**: Service Worker registration and installability require HTTPS (or `localhost`), a browser-enforced rule with no app-level workaround. The `dev`/build setup itself stays HTTP-only; reaching it as a real secure-context HTTPS origin (for installing on a physical phone) is handled by whatever's in front of it (e.g. a reverse proxy doing TLS termination), not by this project.
- Verified end-to-end in a real (non-devtools-emulated) offline browser session: Service Worker registers and activates, Cache Storage holds exactly the app-shell files (no external URLs), a played round's `localStorage` entry survives two consecutive reloads performed while genuinely offline, and the app remains fully interactive (menus, starting a new round) throughout — not just a frozen static shell.
