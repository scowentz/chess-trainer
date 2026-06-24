import { describe, it, expect } from 'vitest'
import { Chess } from 'chess.js'
import { seeGain, PIECE_VALUE } from './see'

describe('seeGain', () => {
  it('wins a fully undefended queen', () => {
    // White pawn c3 can take the black queen on d4; queen is undefended.
    expect(seeGain(new Chess('8/8/8/8/3q4/2P5/8/4K2k w - - 0 1'), 'd4')).toBe(900)
  })
  it('nets +220 winning a knight defended by a pawn (knight for pawn)', () => {
    expect(seeGain(new Chess('8/8/8/4p3/3n4/2P5/8/4K2k w - - 0 1'), 'd4')).toBe(220)
  })
  it('is negative for a rook grabbing a defended pawn', () => {
    expect(seeGain(new Chess('8/8/2p5/3p4/8/3R4/8/4K2k w - - 0 1'), 'd5')).toBe(-400)
  })
  it('is zero for a piece with no attackers', () => {
    expect(seeGain(new Chess('8/8/8/8/3n4/8/8/4K2k w - - 0 1'), 'd4')).toBe(0)
  })
  it('exposes standard piece values', () => {
    expect(PIECE_VALUE.q).toBe(900)
  })
})
