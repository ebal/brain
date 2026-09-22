// Pure sequence-generation logic — no Vue dependency (SPEC §23/§25).

// Deterministic PRNG (mulberry32), same shape used throughout the project
// (see targettap/sequence.js, nback/sequence.js, ...).
function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeRng(seed) {
  return typeof seed === 'number' ? mulberry32(seed) : Math.random
}

function shuffle(arr, rng) {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function refillBag(bag, totalCells, rng) {
  for (const cell of shuffle(Array.from({ length: totalCells }, (_, i) => i), rng)) bag.push(cell)
}

// SPEC §8: "Prefer no immediate reuse of the same cell; never allow three
// consecutive stimuli in one cell." `bag` is a shared mutable array the
// caller keeps across calls (a shuffled-position bag, refilled whenever it
// empties, so every cell gets fair representation — SPEC §8's "bounded
// distribution"); `recentCells` is the history of previously chosen cells,
// most recent last.
export function chooseSpawnCell(recentCells, bag, totalCells, rng) {
  if (bag.length === 0) refillBag(bag, totalCells, rng)

  const last = recentCells[recentCells.length - 1]
  const secondLast = recentCells[recentCells.length - 2]
  const wouldBeThirdInARow = last !== undefined && last === secondLast

  const topIndex = bag.length - 1
  if (wouldBeThirdInARow && bag[topIndex] === last) {
    const altIndex = bag.findIndex((cell, i) => i !== topIndex && cell !== last)
    if (altIndex !== -1) {
      ;[bag[topIndex], bag[altIndex]] = [bag[altIndex], bag[topIndex]]
    }
    // If no alternative exists (only possible with 1 total cell, never the
    // case here — minimum grid is 2x2), fall through and allow it rather
    // than looping forever.
  }

  return bag.pop()
}

function randomGapMs(config, rng) {
  return config.gapMinMs + Math.floor(rng() * (config.gapMaxMs - config.gapMinMs + 1))
}

// Builds the full pre-generated stimulus list for one level attempt: for
// each of targetCount + distractorCount stimuli, a spawn cell (fairly
// distributed, SPEC §8), a random gap before it appears, and whether it's
// the mole (🐹, tap it) or the distractor (🐰, don't tap it). Targets and
// distractors are shuffled together rather than distractors trailing at
// the end, so distractor exposure is spread through the whole level.
export function generateStimulusSequence(config, seed) {
  const rng = makeRng(seed)
  const totalCells = config.gridSize * config.gridSize
  const isDistractorFlags = shuffle(
    [...Array(config.targetCount).fill(false), ...Array(config.distractorCount).fill(true)],
    rng
  )

  const bag = []
  const recentCells = []
  const stimuli = isDistractorFlags.map((isDistractor) => {
    const cell = chooseSpawnCell(recentCells, bag, totalCells, rng)
    recentCells.push(cell)
    return { cell, isDistractor, gapMs: randomGapMs(config, rng), visibleMs: config.targetVisibleMs }
  })

  const sequence = { levelId: config.id, gridSize: config.gridSize, totalCells, stimuli }
  validateSequence(sequence, config)
  return sequence
}

// SPEC §24-style pre-play validation — throws on any inconsistency rather
// than silently starting a broken level.
export function validateSequence(sequence, config) {
  const { stimuli, gridSize } = sequence
  const total = config.targetCount + config.distractorCount

  if (stimuli.length !== total) {
    throw new Error(`whack-a-mole sequence: expected ${total} stimuli, got ${stimuli.length}`)
  }

  const distractorCount = stimuli.filter((s) => s.isDistractor).length
  if (distractorCount !== config.distractorCount) {
    throw new Error(`whack-a-mole sequence: expected ${config.distractorCount} distractors, got ${distractorCount}`)
  }

  let consecutive = 1
  for (let i = 1; i < stimuli.length; i++) {
    if (stimuli[i].cell === stimuli[i - 1].cell) {
      consecutive += 1
      if (consecutive >= 3) {
        throw new Error(`whack-a-mole sequence: cell ${stimuli[i].cell} spawned three times in a row at index ${i}`)
      }
    } else {
      consecutive = 1
    }
  }

  const totalCells = gridSize * gridSize
  for (const s of stimuli) {
    if (s.cell < 0 || s.cell >= totalCells) {
      throw new Error(`whack-a-mole sequence: cell ${s.cell} is out of range for a ${gridSize}x${gridSize} grid`)
    }
  }

  return true
}

// SPEC §11: a mole-cell tap is a Hit, a distractor-cell tap is a False
// Alarm; a mole timeout is a Miss, a distractor timeout is a Correct
// Rejection. Wrong-cell/gap taps are classified separately as Empty Taps
// by the caller (see useWhackAMoleGame.js) — this only covers the
// "responded to the active stimulus, or let it time out" cases.
export function classifyResponse(stimulus, tapped) {
  if (stimulus.isDistractor) return tapped ? 'falseAlarm' : 'correctRejection'
  return tapped ? 'hit' : 'miss'
}
