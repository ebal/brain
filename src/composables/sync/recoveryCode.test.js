import { describe, it, expect } from 'vitest'
import { randomBytes } from 'node:crypto'
import { generateRecoveryCode, normalizeRecoveryCode, isValidRecoveryCode, formatRecoveryCode } from './recoveryCode.js'

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const gen = () => generateRecoveryCode((n) => randomBytes(n))

describe('recovery code (BRAIN-SYNC-SPEC §12)', () => {
  it('is 7 groups of 4 Crockford base32 symbols and validates', () => {
    const code = gen()
    expect(code).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){6}[0-9A-HJKMNP-TV-Z]{4}$/)
    expect(isValidRecoveryCode(code)).toBe(true)
  })

  it('draws every symbol from the CSPRNG, uniformly enough to use all 32', () => {
    const codes = Array.from({ length: 2000 }, gen)
    expect(new Set(codes).size).toBe(codes.length)
    const counts = Object.fromEntries([...ALPHABET].map((c) => [c, 0]))
    for (const code of codes) for (const c of normalizeRecoveryCode(code).slice(0, 27)) counts[c]++
    const expected = (2000 * 27) / 32
    for (const n of Object.values(counts)) expect(Math.abs(n - expected) / expected).toBeLessThan(0.15)
  })

  it('is forgiving when read back: case, spaces, dashes, I/L→1, O→0', () => {
    const code = normalizeRecoveryCode(gen())
    const sloppy = code.toLowerCase().replace(/1/g, 'l').replace(/0/g, 'o').match(/.{1,3}/g).join(' - ')
    expect(normalizeRecoveryCode(sloppy)).toBe(code)
    expect(isValidRecoveryCode(sloppy)).toBe(true)
    expect(formatRecoveryCode(sloppy)).toBe(formatRecoveryCode(code))
  })

  it('rejects wrong lengths and foreign characters', () => {
    expect(normalizeRecoveryCode('ABCD')).toBeNull()
    expect(normalizeRecoveryCode(normalizeRecoveryCode(gen()) + 'A')).toBeNull()
    expect(normalizeRecoveryCode('U'.repeat(28))).toBeNull() // U is not in the alphabet
    expect(isValidRecoveryCode(null)).toBe(false)
  })

  it('catches every single-symbol typo except a 0↔Z swap (exhaustive)', () => {
    for (let round = 0; round < 20; round++) {
      const code = normalizeRecoveryCode(gen())
      for (let i = 0; i < code.length; i++) {
        for (const replacement of ALPHABET) {
          if (replacement === code[i]) continue
          const typo = code.slice(0, i) + replacement + code.slice(i + 1)
          const zeroZ = i < 27 && new Set([code[i], replacement]).size === 2 && [code[i], replacement].every((c) => c === '0' || c === 'Z')
          if (!zeroZ) expect(isValidRecoveryCode(typo), `${code} pos ${i} -> ${replacement}`).toBe(false)
        }
      }
    }
  })

  it('catches every neighbouring swap within the body except 0↔Z (exhaustive)', () => {
    for (let round = 0; round < 50; round++) {
      const code = normalizeRecoveryCode(gen())
      for (let i = 0; i < 26; i++) {
        if (code[i] === code[i + 1]) continue
        const swapped = code.slice(0, i) + code[i + 1] + code[i] + code.slice(i + 2)
        const zeroZ = [code[i], code[i + 1]].every((c) => c === '0' || c === 'Z')
        if (!zeroZ) expect(isValidRecoveryCode(swapped)).toBe(false)
      }
    }
  })
})
