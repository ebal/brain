// Pure scoring math — no Vue dependency (Flags-of-the-World SPEC §18-§19).

const POINTS_PER_CORRECT = 100 // SPEC §19: score is optional/secondary, no speed component

export function calculateScore({ correctCount }) {
  return correctCount * POINTS_PER_CORRECT
}

// SPEC §18/§26: 10/10 = 3 stars, 8-9/10 = 2 stars, any other completion = 1 star.
export function calculateStars({ correctCount, totalCount }) {
  if (correctCount >= totalCount) return 3
  if (correctCount >= totalCount - 2) return 2
  return 1
}
