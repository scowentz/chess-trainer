import { describe, it, expect, vi } from 'vitest'
import { createExplorerClient } from './explorer'

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response
}

describe('createExplorerClient', () => {
  it('requests the masters endpoint with the fen and parses moves', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        white: 60,
        draws: 30,
        black: 10,
        opening: { eco: 'C50', name: 'Italian Game' },
        moves: [
          { uci: 'e2e4', san: 'e4', white: 50, draws: 20, black: 5 },
          { uci: 'd2d4', san: 'd4', white: 10, draws: 10, black: 5 },
        ],
      }),
    )
    const client = createExplorerClient({ fetchImpl: fetchImpl as unknown as typeof fetch })
    const pos = await client.fetchPosition('startfen')

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [calledUrl] = fetchImpl.mock.calls[0] as unknown[]
    expect(String(calledUrl)).toContain('explorer.lichess.ovh/masters')
    expect(String(calledUrl)).toContain('fen=startfen')
    expect(pos.totalGames).toBe(100)
    expect(pos.opening?.name).toBe('Italian Game')
    expect(pos.moves.map((m) => m.uci)).toEqual(['e2e4', 'd2d4'])
  })

  it('throws on a non-ok response', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }) as Response)
    const client = createExplorerClient({ fetchImpl: fetchImpl as unknown as typeof fetch })
    await expect(client.fetchPosition('x')).rejects.toThrow(/429/)
  })
})
