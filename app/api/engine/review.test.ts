import { describe, it, expect, vi } from 'vitest'

const evaluate = vi.fn()
vi.mock('@/lib/engine', () => ({ getEngine: vi.fn(() => ({ evaluate })) }))

import { getEngine } from '@/lib/engine'
import { POST as reviewPost } from './review/route'

function req(body: unknown): Request {
  return new Request('http://test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
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
        positions: [{ fenBefore: 'fb', fenAfter: 'fa', mover: 'white', uci: 'e2e4' }],
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

  it('includes an explanation string per reviewed move', async () => {
    // Mock returns a best line that differs from the played uci -> non-best move.
    const explainEvaluate = vi.fn().mockResolvedValue({
      move: 'd2d4',
      eval: { type: 'cp', value: 10 },
      pv: ['d2d4'],
      lines: [
        { move: 'd2d4', eval: { type: 'cp', value: 10 } },
        { move: 'e2e4', eval: { type: 'cp', value: 5 } },
      ],
    })
    vi.mocked(getEngine).mockReturnValue({ evaluate: explainEvaluate } as never)
    const res = await reviewPost(
      req({
        positions: [
          {
            fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            fenAfter: 'rnbqkbnr/pppppppp/8/8/8/4P3/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
            mover: 'white',
            uci: 'e2e4',
          },
        ],
      }),
    )
    const data = await res.json()
    expect(typeof data.reviews[0].explanation).toBe('string')
    expect(data.reviews[0].explanation.length).toBeGreaterThan(0)
  })
})
