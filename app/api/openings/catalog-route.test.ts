import { describe, it, expect, vi } from 'vitest'

const { loadCatalog, searchCatalog } = vi.hoisted(() => ({
  loadCatalog: vi.fn(() => [{ id: 'C50:Italian Game', eco: 'C50', name: 'Italian Game', pgn: '1. e4 e5' }]),
  searchCatalog: vi.fn((entries: unknown[]) => entries),
}))
vi.mock('@/lib/openings/catalog', () => ({ loadCatalog, searchCatalog }))

import { GET as catalogGet } from './catalog/route'

describe('GET /api/openings/catalog', () => {
  it('returns search results', async () => {
    const res = await catalogGet(new Request('http://test/api/openings/catalog?q=ital'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      results: [{ id: 'C50:Italian Game', eco: 'C50', name: 'Italian Game', pgn: '1. e4 e5' }],
    })
    expect(searchCatalog).toHaveBeenCalled()
  })
})
