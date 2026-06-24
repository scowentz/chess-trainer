import { describe, it, expect } from 'vitest'
import { strengthToUciOptions } from './strength'

describe('strengthToUciOptions', () => {
  it('maps a mid skill to Skill Level option', () => {
    expect(strengthToUciOptions(8)).toEqual([['Skill Level', 8]])
  })
  it('clamps above 20', () => {
    expect(strengthToUciOptions(99)).toEqual([['Skill Level', 20]])
  })
  it('clamps below 0', () => {
    expect(strengthToUciOptions(-5)).toEqual([['Skill Level', 0]])
  })
  it('rounds fractional input', () => {
    expect(strengthToUciOptions(7.6)).toEqual([['Skill Level', 8]])
  })
})
