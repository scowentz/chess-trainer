import { describe, it, expect, vi } from 'vitest'

const h = vi.hoisted(() => ({
  getRepertoire: vi.fn(() => ({ repertoire: { id: 5, name: 'Italian Game', start_fen: 'sf', color: 'white', max_depth: 12 }, nodes: [] })),
  deleteRepertoire: vi.fn(),
  getDueNodes: vi.fn(() => [{ fen: 'f1', acceptableUci: ['e2e4'], opponentReplies: [] }]),
  recordReview: vi.fn(() => ({ ease: 2.5, intervalDays: 1, dueAt: 'x', reps: 1, lapses: 0, lastGrade: 'good' })),
  rebuildRepertoire: vi.fn(),
  buildRepertoireTree: vi.fn(async () => ({ startFen: 'sf', nodes: [{ isTraineeTurn: true }] })),
}))

vi.mock('@/lib/db', () => ({ getDb: () => ({}) }))
vi.mock('@/lib/db/openings', () => ({
  getRepertoire: h.getRepertoire,
  deleteRepertoire: h.deleteRepertoire,
  getDueNodes: h.getDueNodes,
  recordReview: h.recordReview,
  rebuildRepertoire: h.rebuildRepertoire,
}))
vi.mock('@/lib/openings/explorer', () => ({ createExplorerClient: () => ({ fetchPosition: vi.fn() }) }))
vi.mock('@/lib/openings/build-tree', () => ({ buildRepertoireTree: h.buildRepertoireTree }))

import { GET as detailGet, DELETE as detailDelete } from './[id]/route'
import { GET as dueGet } from './[id]/due/route'
import { POST as reviewPost } from './[id]/review/route'
import { POST as rebuildPost } from './[id]/rebuild/route'

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

describe('GET /api/openings/[id]', () => {
  it('returns the repertoire detail', async () => {
    const res = await detailGet(new Request('http://test'), ctx('5'))
    expect(res.status).toBe(200)
    expect((await res.json()).repertoire.id).toBe(5)
  })
  it('404 when missing', async () => {
    h.getRepertoire.mockReturnValueOnce(null as never)
    const res = await detailGet(new Request('http://test'), ctx('99'))
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/openings/[id]', () => {
  it('deletes and returns ok', async () => {
    const res = await detailDelete(new Request('http://test', { method: 'DELETE' }), ctx('5'))
    expect(await res.json()).toEqual({ ok: true })
    expect(h.deleteRepertoire).toHaveBeenCalled()
  })
})

describe('GET /api/openings/[id]/due', () => {
  it('returns due nodes', async () => {
    const res = await dueGet(new Request('http://test'), ctx('5'))
    expect((await res.json()).nodes).toHaveLength(1)
  })
})

describe('POST /api/openings/[id]/review', () => {
  it('records a correct review as good', async () => {
    const res = await reviewPost(
      new Request('http://test', { method: 'POST', body: JSON.stringify({ fen: 'f1', correct: true }) }),
      ctx('5'),
    )
    expect((await res.json()).card.intervalDays).toBe(1)
    expect(h.recordReview).toHaveBeenCalledWith({}, 5, 'f1', 'good', expect.any(Date))
  })
  it('400 when fen missing', async () => {
    const res = await reviewPost(new Request('http://test', { method: 'POST', body: JSON.stringify({ correct: true }) }), ctx('5'))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/openings/[id]/rebuild', () => {
  it('rebuilds from the stored start position', async () => {
    const res = await rebuildPost(new Request('http://test', { method: 'POST' }), ctx('5'))
    expect(res.status).toBe(200)
    expect(h.rebuildRepertoire).toHaveBeenCalled()
  })
})
