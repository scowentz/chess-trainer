import { describe, it, expect } from 'vitest'
import { explain } from './explain'

describe('explain', () => {
  it('flags a hung queen and names the better move', () => {
    // White queen d1 -> d3, where a black pawn on c4 wins it for free.
    const r = explain({
      fenBefore: '7k/8/8/8/2p5/8/8/3QK3 w - - 0 1',
      playedMove: 'd1d3',
      bestMove: 'd1d2',
      evalBefore: { type: 'cp', value: 0 },
      evalAfter: { type: 'cp', value: -850 },
      moveClass: 'blunder',
      mover: 'white',
    })
    expect(r.facts.hung).toEqual({ square: 'd3', piece: 'queen' })
    expect(r.text.toLowerCase()).toContain('queen on d3')
  })

  it('describes a knight fork in the best move', () => {
    const r = explain({
      fenBefore: '8/5r2/2k5/8/8/3N4/8/4K3 w - - 0 1',
      playedMove: 'e1e2',
      bestMove: 'd3e5',
      evalBefore: { type: 'cp', value: 30 },
      evalAfter: { type: 'cp', value: 25 },
      moveClass: 'mistake',
      mover: 'white',
    })
    expect(r.facts.bestIsFork).not.toBeNull()
    expect(r.facts.bestIsFork!.targets.join(' ')).toMatch(/f7/)
    expect(r.text.toLowerCase()).toContain('fork')
  })

  it('flags a missed forced mate', () => {
    const r = explain({
      fenBefore: '6rk/5Npp/8/8/8/8/8/6K1 w - - 0 1',
      playedMove: 'g1f1',
      bestMove: 'f7h6',
      evalBefore: { type: 'mate', value: 1 },
      evalAfter: { type: 'cp', value: 0 },
      moveClass: 'blunder',
      mover: 'white',
    })
    expect(r.facts.missedMate).toBe(true)
  })

  it('flags allowing the opponent a forced mate', () => {
    const r = explain({
      fenBefore: '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1',
      playedMove: 'e1e2',
      bestMove: 'a1a8',
      evalBefore: { type: 'cp', value: 50 },
      evalAfter: { type: 'mate', value: 2 },
      moveClass: 'blunder',
      mover: 'white',
    })
    expect(r.facts.allowedMate).toBe(true)
  })

  it('gives an affirmative line for a clean best move', () => {
    const r = explain({
      fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      playedMove: 'e2e4',
      bestMove: 'e2e4',
      evalBefore: { type: 'cp', value: 30 },
      evalAfter: { type: 'cp', value: 25 },
      moveClass: 'best',
      mover: 'white',
    })
    expect(r.facts.hung).toBeNull()
    expect(r.text.toLowerCase()).toContain('best')
  })
})
