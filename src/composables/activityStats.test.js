// Fixed before any Date operations so the local-day tests below are
// deterministic regardless of what timezone the test runner's host is in.
process.env.TZ = 'America/New_York'

import { describe, it, expect } from 'vitest'
import {
  filterByDateRange,
  localDayKey,
  computeActivityStats,
  computeCurrentStreak,
} from './activityStats.js'

function session(game, completedAt) {
  return { game, completedAt }
}

describe('localDayKey', () => {
  it('buckets by LOCAL calendar day, not UTC', () => {
    // 2026-01-15T02:00:00Z is still 2026-01-14 21:00 in America/New_York
    // (UTC-5) — a naive UTC-slice would wrongly call this "the 15th".
    expect(localDayKey('2026-01-15T02:00:00.000Z')).toBe('2026-01-14')
  })

  it('groups two timestamps on the same UTC day but different local days separately', () => {
    // 2026-01-15T01:00Z -> Jan 14 20:00 EST (still the 14th locally)
    // 2026-01-15T06:00Z -> Jan 15 01:00 EST (now the 15th locally)
    // Same UTC calendar day, different local calendar day.
    expect(localDayKey('2026-01-15T01:00:00.000Z')).not.toBe(localDayKey('2026-01-15T06:00:00.000Z'))
  })
})

describe('filterByDateRange', () => {
  const now = new Date('2026-06-15T12:00:00.000Z')
  const sessions = [
    session('stroop', '2026-06-15T00:00:00.000Z'), // today
    session('stroop', '2026-06-10T00:00:00.000Z'), // 5 days ago
    session('stroop', '2026-05-20T00:00:00.000Z'), // ~26 days ago
    session('stroop', '2026-04-01T00:00:00.000Z'), // ~75 days ago
    session('stroop', '2025-01-01T00:00:00.000Z'), // over a year ago
  ]

  it('"all" returns every session unfiltered', () => {
    expect(filterByDateRange(sessions, 'all', now)).toHaveLength(5)
  })

  it('"7d" keeps only sessions within the last 7 days', () => {
    expect(filterByDateRange(sessions, '7d', now)).toHaveLength(2)
  })

  it('"30d" keeps sessions within the last 30 days', () => {
    expect(filterByDateRange(sessions, '30d', now)).toHaveLength(3)
  })

  it('"90d" keeps sessions within the last 90 days', () => {
    expect(filterByDateRange(sessions, '90d', now)).toHaveLength(4)
  })
})

describe('computeActivityStats', () => {
  it('counts distinct games, active days, and per-game session counts', () => {
    const sessions = [
      session('stroop', '2026-01-01T12:00:00.000Z'),
      session('stroop', '2026-01-01T14:00:00.000Z'), // same day as above
      session('schulte', '2026-01-02T12:00:00.000Z'),
    ]
    const stats = computeActivityStats(sessions)
    expect(stats.totalSessions).toBe(3)
    expect(stats.gamesPlayed).toBe(2)
    expect(stats.activeDays).toBe(2)
    expect(stats.sessionsPerGame).toEqual({ stroop: 2, schulte: 1 })
  })

  it('returns all zeros for an empty session list', () => {
    expect(computeActivityStats([])).toEqual({
      totalSessions: 0, gamesPlayed: 0, activeDays: 0, sessionsPerGame: {},
    })
  })
})

describe('computeCurrentStreak', () => {
  it('counts consecutive days played, ending today', () => {
    const now = new Date('2026-01-05T12:00:00.000Z')
    const sessions = [
      session('stroop', '2026-01-05T10:00:00.000Z'), // today
      session('stroop', '2026-01-04T10:00:00.000Z'),
      session('stroop', '2026-01-03T10:00:00.000Z'),
      session('stroop', '2026-01-01T10:00:00.000Z'), // gap on the 2nd — breaks the streak
    ]
    expect(computeCurrentStreak(sessions, now)).toBe(3)
  })

  it('stays alive through yesterday if nothing has been played yet today', () => {
    const now = new Date('2026-01-05T08:00:00.000Z') // "today" the 5th, nothing played yet
    const sessions = [
      session('stroop', '2026-01-04T10:00:00.000Z'),
      session('stroop', '2026-01-03T10:00:00.000Z'),
    ]
    expect(computeCurrentStreak(sessions, now)).toBe(2)
  })

  it('is 0 when nothing was played today or yesterday', () => {
    const now = new Date('2026-01-05T12:00:00.000Z')
    const sessions = [session('stroop', '2026-01-01T10:00:00.000Z')]
    expect(computeCurrentStreak(sessions, now)).toBe(0)
  })

  it('is 0 for an empty session list', () => {
    expect(computeCurrentStreak([], new Date())).toBe(0)
  })
})
