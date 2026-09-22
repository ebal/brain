import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { COUNTRIES } from '../../constants/flags/countries.js'
import { CONFUSION_CLUSTERS } from '../../constants/flags/confusionSets.js'
import { getCountry, getCountriesInRegion, getDatasetTotal } from './dataset.js'

const FLAGS_DIR = fileURLToPath(new URL('../../../public/flags/', import.meta.url))

describe('Flags of the World dataset', () => {
  it('has unique codes', () => {
    const codes = COUNTRIES.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('has unique names', () => {
    const names = COUNTRIES.map((c) => c.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('every country has a matching SVG file on disk (SPEC §23)', () => {
    for (const c of COUNTRIES) {
      expect(existsSync(`${FLAGS_DIR}${c.code}.svg`)).toBe(true)
    }
  })

  it('every CONFUSION_CLUSTERS entry only references real dataset codes (SPEC §9)', () => {
    const validCodes = new Set(COUNTRIES.map((c) => c.code))
    for (const cluster of CONFUSION_CLUSTERS) {
      for (const code of cluster) {
        expect(validCodes.has(code)).toBe(true)
      }
    }
  })

  it('every country belongs to one of the five real-world regions', () => {
    const validRegions = new Set(['Africa', 'Asia', 'Europe', 'Americas', 'Oceania'])
    for (const c of COUNTRIES) {
      expect(validRegions.has(c.region)).toBe(true)
    }
  })

  it('getCountry resolves a known code and getDatasetTotal is derived, not hardcoded', () => {
    const gr = getCountry('gr')
    expect(gr.name).toBe('Greece')
    expect(getDatasetTotal()).toBe(COUNTRIES.length)
  })

  it('getCountriesInRegion only returns countries in that region', () => {
    const europe = getCountriesInRegion('Europe')
    expect(europe.length).toBeGreaterThan(0)
    for (const c of europe) expect(c.region).toBe('Europe')
  })
})
