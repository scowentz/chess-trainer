import { describe, it, expect, vi } from 'vitest'

const { createGame, addMove, finishGame, listGames } = vi.hoisted(() => ({
  createGame: vi.fn(() => 42),
  addMove: vi.fn(),
  finishGame: vi.fn(),
  listGames: vi.fn(() => [{ id: 42 }]),
}))

const fakeDb = {}

vi.mock('@/lib/db', () => ({ getDb: () => fakeDb }))
vi.mock('@/lib/db/games', () => ({ createGame, addMove, finishGame, listGames }))

import { POST as gamesPost, GET as gamesGet } from './route'

function req(body: unknown): Request {
  return new Request('http://test', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/games', () => {
  it('creates a game, stores moves, finishes, returns id', async () => {
    const res = await gamesPost(
      req({
        skill: 8,
        playerColor: 'white',
        result: '1-0',
        pgn: '1. e4',
        moves: [
          { ply: 1, side: 'white', uci: 'e2e4', fenBefore: 'a', fenAfter: 'b', evalCp: 30, classification: 'good' },
        ],
      }),
    )
    expect(await res.json()).toEqual({ id: 42 })
    expect(createGame).toHaveBeenCalledWith(fakeDb, { skill: 8, playerColor: 'white' })
    expect(addMove).toHaveBeenCalledTimes(1)
    expect(finishGame).toHaveBeenCalledWith(fakeDb, { gameId: 42, result: '1-0', pgn: '1. e4' })
  })

  it('400 when playerColor missing', async () => {
    const res = await gamesPost(req({ skill: 8, moves: [], result: '*', pgn: '' }))
    expect(res.status).toBe(400)
  })
})

describe('GET /api/games', () => {
  it('lists games', async () => {
    const res = await gamesGet()
    expect(await res.json()).toEqual({ games: [{ id: 42 }] })
  })
})
