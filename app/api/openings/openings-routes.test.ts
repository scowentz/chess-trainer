import { describe, it, expect, vi } from 'vitest'

const h = vi.hoisted(() => ({
  saveBuiltRepertoire: vi.fn(() => 7),
  listRepertoires: vi.fn(() => [{ id: 7, name: 'Italian Game', eco: 'C50', color: 'white', cardCount: 3, dueCount: 3 }]),
  buildRepertoireTree: vi.fn(async () => ({ startFen: 'sf', nodes: [{ isTraineeTurn: true }, { isTraineeTurn: false }] })),
  loadCatalog: vi.fn(() => [{ id: 'C50:Italian Game', eco: 'C50', name: 'Italian Game', pgn: '1. e4' }]),
}))

vi.mock('@/lib/db', () => ({ getDb: () => ({}) }))
vi.mock('@/lib/db/openings', () => ({
  saveBuiltRepertoire: h.saveBuiltRepertoire,
  listRepertoires: h.listRepertoires,
}))
vi.mock('@/lib/openings/build-tree', () => ({ buildRepertoireTree: h.buildRepertoireTree }))
vi.mock('@/lib/openings/explorer', () => ({ createExplorerClient: () => ({ fetchPosition: vi.fn() }) }))
vi.mock('@/lib/openings/catalog', () => ({
  loadCatalog: h.loadCatalog,
  resolveStart: () => ({ startFen: 'sf', startPath: ['e2e4'] }),
}))

import { POST as createPost, GET as listGet } from './route'

describe('POST /api/openings', () => {
  it('builds and saves a repertoire from a catalog id', async () => {
    const res = await createPost(
      new Request('http://test/api/openings', {
        method: 'POST',
        body: JSON.stringify({ catalogId: 'C50:Italian Game', color: 'white' }),
      }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 7, nodeCount: 2, cardCount: 1 })
    expect(h.saveBuiltRepertoire).toHaveBeenCalled()
  })

  it('400 on a bad color', async () => {
    const res = await createPost(
      new Request('http://test/api/openings', { method: 'POST', body: JSON.stringify({ catalogId: 'C50:Italian Game', color: 'green' }) }),
    )
    expect(res.status).toBe(400)
  })

  it('400 when the catalog id is unknown', async () => {
    const res = await createPost(
      new Request('http://test/api/openings', { method: 'POST', body: JSON.stringify({ catalogId: 'ZZ:nope', color: 'white' }) }),
    )
    expect(res.status).toBe(400)
  })
})

describe('GET /api/openings', () => {
  it('lists repertoires', async () => {
    const res = await listGet()
    expect(await res.json()).toEqual({
      repertoires: [{ id: 7, name: 'Italian Game', eco: 'C50', color: 'white', cardCount: 3, dueCount: 3 }],
    })
  })
})
