import { describe, it, expect } from 'vitest'
import { parseBestMove, parseInfoLine } from './uci-parser'

describe('parseBestMove', () => {
  it('extracts the move', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toBe('e2e4')
  })
  it('returns null for non-bestmove lines', () => {
    expect(parseBestMove('info depth 1 score cp 20')).toBeNull()
  })
})

describe('parseInfoLine', () => {
  it('parses cp score, depth, and pv', () => {
    const r = parseInfoLine('info depth 12 score cp -34 nodes 1000 pv e2e4 e7e5 g1f3')
    expect(r).toEqual({ depth: 12, eval: { type: 'cp', value: -34 }, pv: ['e2e4', 'e7e5', 'g1f3'] })
  })
  it('parses mate score', () => {
    const r = parseInfoLine('info depth 5 score mate 2 pv h1h8')
    expect(r?.eval).toEqual({ type: 'mate', value: 2 })
  })
  it('returns null for non-info lines', () => {
    expect(parseInfoLine('bestmove e2e4')).toBeNull()
  })
})
