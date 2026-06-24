import { describe, it, expect } from 'vitest'
import { gradeMove } from './grade'
import type { BestMoveResult } from './types'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('gradeMove', () => {
  it("does not award 'great' when only one line is available (M4)", () => {
    // Single-line `before` (no MultiPV second line). The played move is the engine's
    // top move, but with no second line we have no evidence of a large gap, so it
    // should classify as 'best', not 'great'.
    const before: BestMoveResult = { move: 'e2e4', eval: { type: 'cp', value: 20 }, pv: ['e2e4'] }
    const after: BestMoveResult = { move: 'e7e5', eval: { type: 'cp', value: -20 }, pv: [] }
    const r = gradeMove({ before, after, fenBefore: START, playedUci: 'e2e4', mover: 'white' })
    expect(r.classification).toBe('best')
  })

  it("still awards 'great' when a second line shows a large gap (M4 regression guard)", () => {
    const before: BestMoveResult = {
      move: 'e2e4',
      eval: { type: 'cp', value: 80 },
      pv: ['e2e4'],
      lines: [
        { move: 'e2e4', eval: { type: 'cp', value: 80 } },
        { move: 'd2d4', eval: { type: 'cp', value: -80 } },
      ],
    }
    const after: BestMoveResult = { move: 'e7e5', eval: { type: 'cp', value: -80 }, pv: [] }
    const r = gradeMove({ before, after, fenBefore: START, playedUci: 'e2e4', mover: 'white' })
    expect(r.classification).toBe('great')
  })
})
