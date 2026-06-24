import { describe, it, expect } from 'vitest'
import { parseCatalog, searchCatalog, resolveStart } from './catalog'

const SAMPLE = [
  'C50\tItalian Game\t1. e4 e5 2. Nf3 Nc6 3. Bc4',
  'B10\tCaro-Kann Defense\t1. e4 c6',
  'D06\tQueen\'s Gambit\t1. d4 d5 2. c4',
].join('\n')

describe('parseCatalog', () => {
  it('parses eco/name/pgn rows into entries with stable ids', () => {
    const entries = parseCatalog(SAMPLE)
    expect(entries).toHaveLength(3)
    expect(entries[0]).toMatchObject({ eco: 'C50', name: 'Italian Game' })
    expect(entries[0].id).toBe('C50:Italian Game')
  })
})

describe('searchCatalog', () => {
  it('matches case-insensitively on name and eco', () => {
    const entries = parseCatalog(SAMPLE)
    expect(searchCatalog(entries, 'italian').map((e) => e.name)).toEqual(['Italian Game'])
    expect(searchCatalog(entries, 'b10').map((e) => e.eco)).toEqual(['B10'])
  })

  it('limits the number of results', () => {
    const entries = parseCatalog(SAMPLE)
    expect(searchCatalog(entries, '', 2)).toHaveLength(2)
  })
})

describe('resolveStart', () => {
  it('converts a pgn line into a start fen and uci path', () => {
    const { startFen, startPath } = resolveStart('1. e4 e5 2. Nf3')
    expect(startPath).toEqual(['e2e4', 'e7e5', 'g1f3'])
    expect(startFen).toContain(' b ') // black to move after 3 plies
  })
})
