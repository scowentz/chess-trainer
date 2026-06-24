import { describe, it, expect } from 'vitest'
import { Chess } from 'chess.js'
import { buildNodeMap, isBookMove, applyMove, pickOpponentReply, type DrillNode } from './drill-session'

const startFen = new Chess().fen()

const traineeRoot: DrillNode = {
  fen: startFen,
  isTraineeTurn: true,
  acceptableUci: ['e2e4', 'd2d4'],
  spineUci: 'e2e4',
  opponentReplies: [],
}

describe('drill-session', () => {
  it('builds a fen-keyed map', () => {
    const map = buildNodeMap([traineeRoot])
    expect(map.get(startFen)?.spineUci).toBe('e2e4')
  })

  it('accepts any acceptable book move and rejects others', () => {
    expect(isBookMove(traineeRoot, 'e2e4')).toBe(true)
    expect(isBookMove(traineeRoot, 'd2d4')).toBe(true)
    expect(isBookMove(traineeRoot, 'a2a3')).toBe(false)
  })

  it('applies a uci move to produce the next fen', () => {
    const next = applyMove(startFen, 'e2e4')
    expect(next).toContain(' b ')
    expect(applyMove(startFen, 'e2e5')).toBeNull() // illegal
  })

  it('picks opponent replies weighted by frequency (deterministic via rng)', () => {
    const node: DrillNode = {
      fen: 'x',
      isTraineeTurn: false,
      acceptableUci: [],
      spineUci: 'e7e5',
      opponentReplies: [{ uci: 'e7e5', weight: 60 }, { uci: 'c7c5', weight: 40 }],
    }
    expect(pickOpponentReply(node, () => 0.0)).toBe('e7e5') // first bucket
    expect(pickOpponentReply(node, () => 0.99)).toBe('c7c5') // last bucket
  })
})
