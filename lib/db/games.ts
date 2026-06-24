import type Database from 'better-sqlite3'
import type { Color } from '../engine/types'

export interface GameRecord {
  id: number
  created_at: string
  skill_level: number
  player_color: string
  result: string | null
  pgn: string | null
}

export interface MoveRecord {
  id: number
  game_id: number
  ply: number
  side: string
  uci: string
  fen_before: string
  fen_after: string
  eval_cp: number | null
  classification: string | null
}

export function createGame(db: Database.Database, p: { skill: number; playerColor: Color }): number {
  const info = db
    .prepare('INSERT INTO games (skill_level, player_color) VALUES (?, ?)')
    .run(p.skill, p.playerColor)
  return Number(info.lastInsertRowid)
}

export function addMove(
  db: Database.Database,
  m: {
    gameId: number
    ply: number
    side: Color
    uci: string
    fenBefore: string
    fenAfter: string
    evalCp: number | null
    classification: string | null
  },
): void {
  db.prepare(
    `INSERT INTO moves (game_id, ply, side, uci, fen_before, fen_after, eval_cp, classification)
     VALUES (@gameId, @ply, @side, @uci, @fenBefore, @fenAfter, @evalCp, @classification)`,
  ).run(m)
}

export function finishGame(
  db: Database.Database,
  p: { gameId: number; result: string; pgn: string },
): void {
  db.prepare('UPDATE games SET result = ?, pgn = ? WHERE id = ?').run(p.result, p.pgn, p.gameId)
}

export function getGame(
  db: Database.Database,
  id: number,
): { game: GameRecord; moves: MoveRecord[] } | null {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(id) as GameRecord | undefined
  if (!game) return null
  const moves = db
    .prepare('SELECT * FROM moves WHERE game_id = ? ORDER BY ply ASC')
    .all(id) as MoveRecord[]
  return { game, moves }
}

export function listGames(db: Database.Database): GameRecord[] {
  return db.prepare('SELECT * FROM games ORDER BY id DESC').all() as GameRecord[]
}
