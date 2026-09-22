import { describe, it, expect } from 'vitest'
import { METRIC_VERSIONS } from './metricVersions.js'

describe('METRIC_VERSIONS', () => {
  it('covers every game in the suite', () => {
    const expectedGames = [
      'stroop',
      'schulte',
      'nback',
      'sudoku',
      'set',
      'sequence-memory',
      'switchtrail',
      'memorypairs',
      'marblejump',
      'mentalrotation',
      'emojimahjong',
      'numbermatch',
      'oddoneout',
      'targettap',
      'hanoi',
      'lightsout',
      'whackamole',
      'flagsoftheworld',
    ]
    for (const game of expectedGames) {
      expect(METRIC_VERSIONS).toHaveProperty(game)
    }
    expect(Object.keys(METRIC_VERSIONS)).toHaveLength(expectedGames.length)
  })

  it('every game is at version 1, except Emoji Mahjong (2) after its full level-based redesign', () => {
    for (const [game, version] of Object.entries(METRIC_VERSIONS)) {
      expect(version).toBe(game === 'emojimahjong' ? 2 : 1)
    }
  })
})
