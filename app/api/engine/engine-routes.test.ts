import { describe, it, expect, vi, beforeEach } from 'vitest'

const bestMove = vi.fn()
const evaluate = vi.fn()
vi.mock('@/lib/engine', () => ({
  getEngine: () => ({ bestMove, evaluate }),
}))

import { POST as movePost } from './move/route'
import { POST as evalPost } from './evaluate/route'

beforeEach(() => {
  bestMove.mockReset()
  evaluate.mockReset()
})

function req(body: unknown): Request {
  return new Request('http://test', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/engine/move', () => {
  it('returns the engine reply', async () => {
    bestMove.mockResolvedValue({ move: 'e7e5', eval: { type: 'cp', value: 10 }, pv: [] })
    const res = await movePost(req({ fen: 'somefen', skill: 8 }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ move: 'e7e5' })
    expect(bestMove).toHaveBeenCalledWith('somefen', { skill: 8, depth: undefined })
  })

  it('400 when fen missing', async () => {
    const res = await movePost(req({ skill: 8 }))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/engine/evaluate', () => {
  it('returns an evaluation', async () => {
    evaluate.mockResolvedValue({ move: 'd2d4', eval: { type: 'cp', value: 25 }, pv: ['d2d4'] })
    const res = await evalPost(req({ fen: 'somefen' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ move: 'd2d4' })
  })

  it('400 when fen missing', async () => {
    const res = await evalPost(req({}))
    expect(res.status).toBe(400)
  })

  it('forwards multipv to the engine', async () => {
    evaluate.mockResolvedValue({ move: 'e2e4', eval: { type: 'cp', value: 20 }, pv: ['e2e4'] })
    const res = await evalPost(req({ fen: 'startpos', multipv: 2 }))
    expect(res.status).toBe(200)
    expect(evaluate).toHaveBeenCalledWith('startpos', { depth: undefined, multipv: 2 })
  })
})
