// Deck generation — pure, no Vue dependency (SPEC §20/§21).

function mulberry32(seed) {
  let a = seed >>> 0
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

export function cardId(card) {
  return `${card.number}${card.shape}${card.color}${card.shading}`
}

// Cartesian product of the four properties — exactly 81 unique cards.
export function createDeck() {
  const deck = []
  for (let number = 0; number < 3; number++) {
    for (let shape = 0; shape < 3; shape++) {
      for (let color = 0; color < 3; color++) {
        for (let shading = 0; shading < 3; shading++) {
          const card = { number, shape, color, shading }
          deck.push({ ...card, id: cardId(card) })
        }
      }
    }
  }
  return deck
}

export function shuffleDeck(deck, rng = Math.random) {
  const a = [...deck]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
