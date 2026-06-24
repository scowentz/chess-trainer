import { describe, it, expect } from 'vitest'
import { toWhiteCp, classifyMove, moverCpLoss } from './classify'

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

describe('classifyMove', () => {
  it('good below inaccuracy band', () => {
    expect(classifyMove(20)).toBe('good')
  })
  it('inaccuracy at 50cp', () => {
    expect(classifyMove(50)).toBe('inaccuracy')
  })
  it('mistake at 100cp', () => {
    expect(classifyMove(120)).toBe('mistake')
  })
  it('blunder at 200cp', () => {
    expect(classifyMove(250)).toBe('blunder')
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
