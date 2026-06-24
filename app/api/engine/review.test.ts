import { describe, it, expect, vi } from 'vitest'

const evaluate = vi.fn()
vi.mock('@/lib/engine', () => ({ getEngine: () => ({ evaluate }) }))

import { POST as reviewPost } from './review/route'

function req(body: unknown): Request {
  return new Request('http://test', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/engine/review', () => {
  it('classifies a white blunder', async () => {
    // First eval = position before white's move (white to move): +50 white.
    // Second eval = position after white's move (black to move): +300 for black = -300 white.
    evaluate
      .mockResolvedValueOnce({ move: 'g1f3', eval: { type: 'cp', value: 50 }, pv: [] })
      .mockResolvedValueOnce({ move: 'd8h4', eval: { type: 'cp', value: 300 }, pv: [] })
    const res = await reviewPost(
      req({
        positions: [{ fenBefore: 'fb', fenAfter: 'fa', mover: 'white' }],
      }),
    )
    const json = await res.json()
    expect(json.reviews[0].classification).toBe('blunder')
    expect(json.reviews[0].lossCp).toBe(350)
    expect(json.reviews[0].bestMove).toBe('g1f3')
  })

  it('400 when positions missing', async () => {
    const res = await reviewPost(req({}))
    expect(res.status).toBe(400)
  })
})
