import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { CREATE_TABLES } from './schema'
import { createGame, addMove, finishGame, getGame, listGames } from './games'

function freshDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  db.exec(CREATE_TABLES)
  return db
}

let db: Database.Database
beforeEach(() => {
  db = freshDb()
})

describe('gameStore', () => {
  it('creates a game and returns its id', () => {
    const id = createGame(db, { skill: 8, playerColor: 'white' })
    expect(id).toBeGreaterThan(0)
  })

  it('stores moves and reads them back in order', () => {
    const id = createGame(db, { skill: 8, playerColor: 'white' })
    addMove(db, {
      gameId: id, ply: 1, side: 'white', uci: 'e2e4',
      fenBefore: 'before1', fenAfter: 'after1', evalCp: 30, classification: 'good',
    })
    addMove(db, {
      gameId: id, ply: 2, side: 'black', uci: 'e7e5',
      fenBefore: 'before2', fenAfter: 'after2', evalCp: 20, classification: null,
    })
    const result = getGame(db, id)
    expect(result?.moves.map((m) => m.uci)).toEqual(['e2e4', 'e7e5'])
    expect(result?.moves[0].classification).toBe('good')
  })

  it('finishes a game with result and pgn', () => {
    const id = createGame(db, { skill: 8, playerColor: 'white' })
    finishGame(db, { gameId: id, result: '1-0', pgn: '1. e4 e5' })
    const result = getGame(db, id)
    expect(result?.game.result).toBe('1-0')
    expect(result?.game.pgn).toBe('1. e4 e5')
  })

  it('lists games newest first', () => {
    const a = createGame(db, { skill: 1, playerColor: 'white' })
    const b = createGame(db, { skill: 2, playerColor: 'black' })
    const ids = listGames(db).map((g) => g.id)
    expect(ids).toEqual([b, a])
  })

  it('returns null for a missing game', () => {
    expect(getGame(db, 999)).toBeNull()
  })
})
