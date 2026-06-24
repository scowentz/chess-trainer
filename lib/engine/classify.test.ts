import { describe, it, expect } from 'vitest'
import { toWhiteCp, classifyMove, moverCpLoss, stmScoreCp } from './classify'

describe('toWhiteCp', () => {
  it('keeps white-to-move cp as-is', () => {
    expect(toWhiteCp({ type: 'cp', value: 80 }, 'white')).toBe(80)
  })
  it('negates black-to-move cp to white POV', () => {
    expect(toWhiteCp({ type: 'cp', value: 80 }, 'black')).toBe(-80)
  })
  it('converts positive mate (stm mates) to large positive white cp when white to move', () => {
    expect(toWhiteCp({ type: 'mate', value: 2 }, 'white')).toBe(100000 - 2)
  })
})

describe('stmScoreCp', () => {
  it('passes through cp', () => {
    expect(stmScoreCp({ type: 'cp', value: 40 })).toBe(40)
  })
  it('maps positive mate to a large positive number', () => {
    expect(stmScoreCp({ type: 'mate', value: 3 })).toBe(100000 - 3)
  })
})

describe('classifyMove', () => {
  const base = { lossCp: 0, playedIsBest: false, gapToSecondBestCp: 0 }
  it('blunder at 200cp', () => {
    expect(classifyMove({ ...base, lossCp: 250 })).toBe('blunder')
  })
  it('mistake at 100cp', () => {
    expect(classifyMove({ ...base, lossCp: 120 })).toBe('mistake')
  })
  it('inaccuracy at 50cp', () => {
    expect(classifyMove({ ...base, lossCp: 50 })).toBe('inaccuracy')
  })
  it('great when best move with a large gap to second-best', () => {
    expect(classifyMove({ lossCp: 0, playedIsBest: true, gapToSecondBestCp: 150 })).toBe('great')
  })
  it('best when top move but alternatives were also fine', () => {
    expect(classifyMove({ lossCp: 0, playedIsBest: true, gapToSecondBestCp: 40 })).toBe('best')
  })
  it('excellent when near-best but not the engine pick', () => {
    expect(classifyMove({ ...base, lossCp: 15 })).toBe('excellent')
  })
  it('good in the 20-50cp band when not the top move', () => {
    expect(classifyMove({ ...base, lossCp: 35 })).toBe('good')
  })
})

describe('moverCpLoss', () => {
  it('measures cp lost by white after a bad move', () => {
    // Before: white to move, +50 (good for white). After white's move, black to move, -120 (white POV).
    const loss = moverCpLoss({
      before: { type: 'cp', value: 50 },
      beforeSideToMove: 'white',
      after: { type: 'cp', value: 120 }, // black to move, +120 for black = -120 white
      afterSideToMove: 'black',
      mover: 'white',
    })
    expect(loss).toBe(170)
  })
})
