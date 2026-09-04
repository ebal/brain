# Stroop Effect Test

A browser-based [Stroop effect](https://en.wikipedia.org/wiki/Stroop_effect) test built with Vue 3 and Vite. You're shown a color name rendered in an ink color and must click the swatch matching the **ink color**, ignoring what the word says — the classic cognitive-interference task from Stroop's 1935 research. Most trials are deliberately incongruent (word ≠ ink color), which is what produces the measurable slowdown the test is named for.

## Features

- **Two game modes**: Color Match (tap the ink color — the classic task) and Word Match (tap what the word says — the "word reading" control condition, which shows much less interference).
- **Four difficulty tiers** that scale on two axes at once — more color choices and a higher incongruent ratio:

  | Difficulty | Colors | Duration | Incongruent / Congruent mix |
  | --- | --- | --- | --- |
  | Easy | 4 | 30 s | 50% / 50% |
  | Medium | 6 | 60 s | 65% / 35% |
  | Hard | 8 | 60 s | 80% / 20% |
  | Very Hard | 10 | 90 s | 90% / 10% |

- **End-of-round stats**: accuracy, average response time, interference score (avg RT<sub>incongruent</sub> − avg RT<sub>congruent</sub>), and a speed/accuracy-weighted total score.
- **Score history**: the last 20 rounds per mode + difficulty, with a sparkline trend, stored in the browser via `localStorage` — no backend, no login.
- **About / How to Play** page: rule explanation, congruent/incongruent examples, a full reference of every in-game color, and a live untimed practice trial.
- Mobile-first layout with large tap targets.

See [`SPEC.md`](./SPEC.md) for the full design rationale and changelog.

## Installation

### Requirements

- [Node.js](https://nodejs.org/) 20+ and npm — for local development.
- [Docker](https://www.docker.com/) and Docker Compose — optional, if you'd rather not install Node locally (see below).

### From source

```bash
git clone https://github.com/ebal/Stroop-Effect-Test.git
cd Stroop-Effect-Test
npm install
```

## Usage

### Local development

```bash
npm run dev
```

Starts the Vite dev server (with hot reload) — open the printed local URL in your browser.

### Production build

```bash
npm run build   # outputs static files to ./dist
npm run preview # serve the build locally to sanity-check it
```

### Docker (dev server, no build step)

Runs the Vite dev server itself inside the container, directly against the bind-mounted source,
with full hot-reload — no Node install on the host, no build, no rebuild step.

```bash
docker compose up
```

Open `http://localhost:5173` — edit any file and the browser updates instantly. Stop with
`docker compose stop`.

Note this runs Vite's own dev server (unminified, dev-only tooling) rather than serving an
optimized production build — fine for local/personal use, but if you ever want a hardened
production deployment (e.g. nginx serving a minified `npm run build` output), that's a deliberate
step back up in complexity this repo no longer ships out of the box; `npm run build && npm run
preview` (below) is the closest built-in equivalent.

#### File ownership

The container bind-mounts the whole project and writes into it (`node_modules`, `.npm-cache`), so
it runs as `${DOCKER_UID:-1000}:${DOCKER_GID:-1000}` instead of root — otherwise those files would
end up root-owned on your host. The default (`1000:1000`) matches the first regular user on most
single-user Linux installs; if your account uses a different UID/GID, set it once in a local `.env`
file (already gitignored, so it stays machine-specific):

```bash
printf "DOCKER_UID=%s\nDOCKER_GID=%s\n" "$(id -u)" "$(id -g)" > .env
```

Compose picks up `.env` automatically from then on — no need to pass anything on the command line.

## Project structure

```
stroop/
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
    │   ├── useStroopGame.js      # trial generation, timer, scoring logic
    │   ├── useBestScores.js      # localStorage read/write, keyed by mode + difficulty
    │   └── useScoreHistory.js    # rolling per-round log, keyed by mode + difficulty
    └── constants/
        └── colors.js             # color palette, difficulty tiers, game modes
```

## License

[MIT](./LICENSE)
