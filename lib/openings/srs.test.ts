import { describe, it, expect } from 'vitest'
import { newCard, schedule, isDue } from './srs'

const T0 = new Date('2026-06-24T12:00:00.000Z')

describe('srs', () => {
  it('a new card is due immediately', () => {
    expect(isDue(newCard(T0), T0)).toBe(true)
  })

  it('good on a new card graduates it to 1 day', () => {
    const c = schedule(newCard(T0), 'good', T0)
    expect(c.intervalDays).toBe(1)
    expect(c.reps).toBe(1)
    expect(new Date(c.dueAt).getTime()).toBe(T0.getTime() + 86400000)
  })

  it('again on a new card keeps it learning, due in 10 minutes', () => {
    const c = schedule(newCard(T0), 'again', T0)
    expect(c.intervalDays).toBe(0)
    expect(new Date(c.dueAt).getTime()).toBe(T0.getTime() + 10 * 60000)
  })

  it('good on a graduated card multiplies interval by ease', () => {
    const g1 = schedule(newCard(T0), 'good', T0) // interval 1
    const g2 = schedule(g1, 'good', new Date(g1.dueAt))
    expect(g2.intervalDays).toBe(Math.round(1 * 2.5)) // 3 (rounded from 2.5)
  })

  it('again on a graduated card lapses: lowers ease and counts a lapse', () => {
    const g1 = schedule(newCard(T0), 'good', T0)
    const lapsed = schedule(g1, 'again', new Date(g1.dueAt))
    expect(lapsed.ease).toBeCloseTo(2.3, 5)
    expect(lapsed.lapses).toBe(1)
    expect(lapsed.intervalDays).toBe(0)
  })

  it('ease never drops below 1.3', () => {
    let c = schedule(newCard(T0), 'good', T0)
    for (let i = 0; i < 20; i++) c = schedule({ ...c, intervalDays: 5 }, 'again', T0)
    expect(c.ease).toBeGreaterThanOrEqual(1.3)
  })
})
