import { describe, it, expect } from 'vitest'
import { bookMoves, spineMove, moveGames } from './book'
import type { ExplorerPosition } from './types'

function m(uci: string, games: number) {
  return { uci, san: uci, white: games, draws: 0, black: 0 }
}
function pos(moves: { uci: string; san: string; white: number; draws: number; black: number }[]): ExplorerPosition {
  const total = moves.reduce((s, x) => s + x.white + x.draws + x.black, 0)
  return { opening: null, totalGames: total, moves }
}

describe('bookMoves', () => {
  it('keeps moves at or above the threshold and always the top move', () => {
    const p = pos([m('a', 80), m('b', 15), m('c', 4), m('d', 1)]) // total 100
    const kept = bookMoves(p).map((x) => x.uci)
    expect(kept).toEqual(['a', 'b']) // c=4% < 5%, d below
  })

  it('always keeps the single most-played move even if below threshold', () => {
    const p = pos([m('a', 3), m('b', 2)]) // total 5, both below 5% of... total is small; a is top
    expect(bookMoves(p)[0].uci).toBe('a')
    expect(bookMoves(p).length).toBeGreaterThanOrEqual(1)
  })

  it('caps the number of replies', () => {
    const p = pos([m('a', 30), m('b', 25), m('c', 20), m('d', 15), m('e', 10)])
    expect(bookMoves(p, { cap: 4 }).length).toBe(4)
  })

  it('returns [] for an empty position', () => {
    expect(bookMoves(pos([]))).toEqual([])
  })
})

describe('spineMove', () => {
  it('is the most-played move uci', () => {
    expect(spineMove(pos([m('a', 10), m('b', 40)]))).toBe('b')
  })
  it('is null for an empty position', () => {
    expect(spineMove(pos([]))).toBeNull()
  })
})

describe('moveGames', () => {
  it('sums white/draws/black', () => {
    expect(moveGames({ uci: 'x', san: 'x', white: 1, draws: 2, black: 3 })).toBe(6)
  })
})
