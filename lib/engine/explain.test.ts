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

  it('does NOT flag missedMate when bare-4-char played matches engine best-with-promotion (I1 fix)', () => {
    // White has a forced mate via pawn promotion: best move is e7e8q.
    // The hook sends playedMove without promotion suffix: 'e7e8'.
    // These are the same underlying move — missedMate must be false.
    const r = explain({
      fenBefore: '4k3/4P3/4K3/8/8/8/8/8 w - - 0 1',
      playedMove: 'e7e8',   // bare form, no promotion char (as the hook sends)
      bestMove: 'e7e8q',    // full UCI from engine
      evalBefore: { type: 'mate', value: 1 },
      evalAfter: { type: 'cp', value: 0 },
      moveClass: 'best',
      mover: 'white',
    })
    expect(r.facts.missedMate).toBe(false)
  })

  it('still flags missedMate when played and best share from+to but differ in promotion piece (underpromotion)', () => {
    // Both sides specify a promotion piece; different pieces = different moves.
    const r = explain({
      fenBefore: '4k3/4P3/4K3/8/8/8/8/8 w - - 0 1',
      playedMove: 'e7e8r',  // played rook-promotion
      bestMove: 'e7e8q',    // best was queen-promotion (forced mate)
      evalBefore: { type: 'mate', value: 1 },
      evalAfter: { type: 'cp', value: 0 },
      moveClass: 'blunder',
      mover: 'white',
    })
    expect(r.facts.missedMate).toBe(true)
  })

  it('does NOT flag badCapture when the capture nets material despite a recapture (M3)', () => {
    // White knight on f4 takes the black queen on d5; the queen is defended by the
    // c6 pawn, so the knight is recaptured — but the player still nets +580 (queen
    // for knight). A naive "opponent can recapture" check would wrongly flag this.
    const r = explain({
      fenBefore: '4k3/8/2p5/3q4/5N2/8/8/4K3 w - - 0 1',
      playedMove: 'f4d5', // Nxd5, winning the queen
      bestMove: 'f4d5',
      evalBefore: { type: 'cp', value: 0 },
      evalAfter: { type: 'cp', value: 580 },
      moveClass: 'good',
      mover: 'white',
    })
    expect(r.facts.badCapture).toBe(false)
  })

  it('flags badCapture when the recapture loses material on balance (M3)', () => {
    // White rook takes a black pawn on d5 that is defended by the c6 pawn:
    // rook for pawn nets -400.
    const r = explain({
      fenBefore: '8/8/2p5/3p4/8/3R4/8/4K2k w - - 0 1',
      playedMove: 'd3d5', // Rxd5, a losing capture
      bestMove: 'd3d4',
      evalBefore: { type: 'cp', value: 0 },
      evalAfter: { type: 'cp', value: -400 },
      moveClass: 'mistake',
      mover: 'white',
    })
    expect(r.facts.badCapture).toBe(true)
  })
})
