// Human-technique Sudoku solver, used to classify puzzle difficulty by the
// hardest technique actually required — never by clue count or backtracking
// depth (SPEC §3). Also doubles as the "does this require guessing?" check:
// if the puzzle can't be fully solved using the techniques below, it needs
// something beyond this project's Hard tier (or outright guessing) and
// should be rejected by the generator.

const SIZE = 9

export const TECHNIQUE_RANK = {
  nakedSingle: 0,
  hiddenSingle: 1,
  nakedPair: 2,
  hiddenPair: 3,
  lockedCandidate: 4,
  nakedTriple: 5,
  hiddenTriple: 6,
  nakedQuad: 7,
  hiddenQuad: 8,
}

export const EASY_TECHNIQUES = ['nakedSingle', 'hiddenSingle']
export const MEDIUM_TECHNIQUES = [...EASY_TECHNIQUES, 'nakedPair', 'hiddenPair', 'lockedCandidate']
// Quads are the natural, still-basic extension of the pair/triple subset
// technique (not an expert technique like X-Wing/Swordfish) — included here
// because measured generation showed genuine "needs triples and nothing
// more" puzzles are vanishingly rare: most puzzles that get past pairs need
// either a quad or something explicitly excluded from this project's scope.
export const HARD_TECHNIQUES = [...MEDIUM_TECHNIQUES, 'nakedTriple', 'hiddenTriple', 'nakedQuad', 'hiddenQuad']

function cellIndex(r, c) {
  return r * SIZE + c
}

function allUnits() {
  const units = []
  for (let r = 0; r < SIZE; r++) units.push(Array.from({ length: SIZE }, (_, c) => cellIndex(r, c)))
  for (let c = 0; c < SIZE; c++) units.push(Array.from({ length: SIZE }, (_, r) => cellIndex(r, c)))
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const cells = []
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cells.push(cellIndex(br * 3 + i, bc * 3 + j))
      units.push(cells)
    }
  }
  return units
}

const UNITS = allUnits()

function computeCandidates(grid) {
  // Map<cellIndex, Set<value>> — only for empty cells.
  const candidates = new Map()
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] !== 0) continue
      const used = new Set()
      for (let i = 0; i < SIZE; i++) {
        used.add(grid[r][i])
        used.add(grid[i][c])
      }
      const br = Math.floor(r / 3) * 3
      const bc = Math.floor(c / 3) * 3
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) used.add(grid[br + i][bc + j])
      const cands = new Set()
      for (let v = 1; v <= 9; v++) if (!used.has(v)) cands.add(v)
      candidates.set(cellIndex(r, c), cands)
    }
  }
  return candidates
}

function combinations(arr, k) {
  const results = []
  function go(start, chosen) {
    if (chosen.length === k) {
      results.push([...chosen])
      return
    }
    for (let i = start; i < arr.length; i++) {
      chosen.push(arr[i])
      go(i + 1, chosen)
      chosen.pop()
    }
  }
  go(0, [])
  return results
}

// --- Techniques. Each returns true if it made any change (placement or
// candidate elimination), given the current candidates map. Grid mutations
// happen directly for placements; candidate mutations happen in-place on the
// Set objects for eliminations. ---

// Peer cells (same row, column, or box) for a given cell index — used to
// propagate a placement's constraint immediately, so a later single doesn't
// act on a stale candidate set that no longer accounts for this value.
function peersOf(idx) {
  const r = Math.floor(idx / SIZE)
  const c = idx % SIZE
  const peers = new Set()
  for (let i = 0; i < SIZE; i++) {
    if (i !== c) peers.add(cellIndex(r, i))
    if (i !== r) peers.add(cellIndex(i, c))
  }
  const br = Math.floor(r / 3) * 3
  const bc = Math.floor(c / 3) * 3
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const pIdx = cellIndex(br + i, bc + j)
      if (pIdx !== idx) peers.add(pIdx)
    }
  }
  return peers
}

// Places `val` at `idx`, removes its candidate entry, and immediately
// eliminates `val` from every peer's remaining candidates — without this,
// a later technique call would place a value based on a stale candidate set
// that doesn't yet reflect this placement, and could produce a wrong value.
function placeValue(grid, candidates, idx, val) {
  const r = Math.floor(idx / SIZE)
  const c = idx % SIZE
  grid[r][c] = val
  candidates.delete(idx)
  for (const peerIdx of peersOf(idx)) {
    candidates.get(peerIdx)?.delete(val)
  }
}

function applyNakedSingle(grid, candidates) {
  let changed = false
  for (const [idx, cands] of [...candidates]) {
    if (cands.size === 1) {
      placeValue(grid, candidates, idx, [...cands][0])
      changed = true
    }
  }
  return changed
}

function applyHiddenSingle(grid, candidates) {
  let changed = false
  for (const unit of UNITS) {
    const posByVal = new Map()
    for (const idx of unit) {
      const cands = candidates.get(idx)
      if (!cands) continue
      for (const v of cands) {
        if (!posByVal.has(v)) posByVal.set(v, [])
        posByVal.get(v).push(idx)
      }
    }
    for (const [v, cells] of posByVal) {
      if (cells.length === 1) {
        const idx = cells[0]
        if (!candidates.has(idx)) continue
        placeValue(grid, candidates, idx, v)
        changed = true
      }
    }
  }
  return changed
}

function applyNakedSubset(candidates, size) {
  let changed = false
  for (const unit of UNITS) {
    const cellsWithSmallCands = unit.filter((idx) => {
      const cands = candidates.get(idx)
      return cands && cands.size >= 2 && cands.size <= size
    })
    for (const combo of combinations(cellsWithSmallCands, size)) {
      const union = new Set()
      for (const idx of combo) for (const v of candidates.get(idx)) union.add(v)
      if (union.size !== size) continue

      for (const idx of unit) {
        if (combo.includes(idx)) continue
        const cands = candidates.get(idx)
        if (!cands) continue
        for (const v of union) {
          if (cands.delete(v)) changed = true
        }
      }
    }
  }
  return changed
}

function applyHiddenSubset(candidates, size) {
  let changed = false
  for (const unit of UNITS) {
    const posByVal = new Map()
    for (const idx of unit) {
      const cands = candidates.get(idx)
      if (!cands) continue
      for (const v of cands) {
        if (!posByVal.has(v)) posByVal.set(v, [])
        posByVal.get(v).push(idx)
      }
    }
    const candidateValues = [...posByVal.keys()].filter((v) => posByVal.get(v).length >= 1 && posByVal.get(v).length <= size)

    for (const combo of combinations(candidateValues, size)) {
      const cellsUnion = new Set()
      for (const v of combo) for (const idx of posByVal.get(v)) cellsUnion.add(idx)
      if (cellsUnion.size !== size) continue

      for (const idx of cellsUnion) {
        const cands = candidates.get(idx)
        for (const v of [...cands]) {
          if (!combo.includes(v)) {
            cands.delete(v)
            changed = true
          }
        }
      }
    }
  }
  return changed
}

function applyLockedCandidates(candidates) {
  let changed = false

  // Pointing: within a box, if a value's candidates all share one row (or
  // column), eliminate it from the rest of that row/column outside the box.
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const boxCells = []
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) boxCells.push(cellIndex(br * 3 + i, bc * 3 + j))

      const posByVal = new Map()
      for (const idx of boxCells) {
        const cands = candidates.get(idx)
        if (!cands) continue
        for (const v of cands) {
          if (!posByVal.has(v)) posByVal.set(v, [])
          posByVal.get(v).push(idx)
        }
      }

      for (const [v, cells] of posByVal) {
        const rows = new Set(cells.map((idx) => Math.floor(idx / SIZE)))
        const cols = new Set(cells.map((idx) => idx % SIZE))
        if (rows.size === 1) {
          const row = [...rows][0]
          for (let c = 0; c < SIZE; c++) {
            const idx = cellIndex(row, c)
            if (boxCells.includes(idx)) continue
            const cands = candidates.get(idx)
            if (cands && cands.delete(v)) changed = true
          }
        }
        if (cols.size === 1) {
          const col = [...cols][0]
          for (let r = 0; r < SIZE; r++) {
            const idx = cellIndex(r, col)
            if (boxCells.includes(idx)) continue
            const cands = candidates.get(idx)
            if (cands && cands.delete(v)) changed = true
          }
        }
      }
    }
  }

  // Claiming (box-line reduction): within a row (or column), if a value's
  // candidates all share one box, eliminate it from the rest of that box.
  function claimingForLine(lineCells) {
    const posByVal = new Map()
    for (const idx of lineCells) {
      const cands = candidates.get(idx)
      if (!cands) continue
      for (const v of cands) {
        if (!posByVal.has(v)) posByVal.set(v, [])
        posByVal.get(v).push(idx)
      }
    }
    for (const [v, cells] of posByVal) {
      const boxes = new Set(cells.map((idx) => {
        const r = Math.floor(idx / SIZE)
        const c = idx % SIZE
        return Math.floor(r / 3) * 3 + Math.floor(c / 3)
      }))
      if (boxes.size !== 1) continue
      const boxId = [...boxes][0]
      const br = Math.floor(boxId / 3) * 3
      const bc = (boxId % 3) * 3
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const idx = cellIndex(br + i, bc + j)
          if (lineCells.includes(idx)) continue
          const cands = candidates.get(idx)
          if (cands && cands.delete(v)) changed = true
        }
      }
    }
  }

  for (let r = 0; r < SIZE; r++) claimingForLine(Array.from({ length: SIZE }, (_, c) => cellIndex(r, c)))
  for (let c = 0; c < SIZE; c++) claimingForLine(Array.from({ length: SIZE }, (_, r) => cellIndex(r, c)))

  return changed
}

const TECHNIQUE_FNS = {
  nakedSingle: (grid, candidates) => applyNakedSingle(grid, candidates),
  hiddenSingle: (grid, candidates) => applyHiddenSingle(grid, candidates),
  nakedPair: (_grid, candidates) => applyNakedSubset(candidates, 2),
  hiddenPair: (_grid, candidates) => applyHiddenSubset(candidates, 2),
  lockedCandidate: (_grid, candidates) => applyLockedCandidates(candidates),
  nakedTriple: (_grid, candidates) => applyNakedSubset(candidates, 3),
  hiddenTriple: (_grid, candidates) => applyHiddenSubset(candidates, 3),
  nakedQuad: (_grid, candidates) => applyNakedSubset(candidates, 4),
  hiddenQuad: (_grid, candidates) => applyHiddenSubset(candidates, 4),
}

// Solves as much of `puzzleGrid` as possible using only the given technique
// set, always preferring the simplest applicable technique each pass.
// Returns { solved, hardestTechnique, grid } — `solved` is only true if every
// cell was filled using nothing beyond `allowedTechniques`.
export function solveWithTechniques(puzzleGrid, allowedTechniques) {
  const grid = puzzleGrid.map((row) => [...row])
  const candidates = computeCandidates(grid)
  let hardestRank = -1

  let progressed = true
  while (progressed) {
    progressed = false
    for (const technique of allowedTechniques) {
      const changed = TECHNIQUE_FNS[technique](grid, candidates)
      if (changed) {
        hardestRank = Math.max(hardestRank, TECHNIQUE_RANK[technique])
        progressed = true
        break // restart from the simplest technique after any change
      }
    }
  }

  const solved = grid.every((row) => row.every((v) => v !== 0))
  const hardestTechnique = hardestRank === -1
    ? null
    : Object.keys(TECHNIQUE_RANK).find((t) => TECHNIQUE_RANK[t] === hardestRank)

  return { solved, hardestTechnique, grid }
}

// Classifies a puzzle as 'easy' | 'medium' | 'hard' | null (null = requires
// techniques beyond this project's Hard tier, or outright guessing — reject).
export function classifyDifficulty(puzzleGrid) {
  if (solveWithTechniques(puzzleGrid, EASY_TECHNIQUES).solved) return 'easy'
  if (solveWithTechniques(puzzleGrid, MEDIUM_TECHNIQUES).solved) return 'medium'
  if (solveWithTechniques(puzzleGrid, HARD_TECHNIQUES).solved) return 'hard'
  return null
}
