import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createGame, addMove, finishGame, listGames } from '@/lib/db/games'
import type { Color } from '@/lib/engine/types'

interface MoveInput {
  ply: number
  side: Color
  uci: string
  fenBefore: string
  fenAfter: string
  evalCp: number | null
  classification: string | null
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}))
  const { skill, playerColor, moves, result, pgn } = body as {
    skill?: number
    playerColor?: Color
    moves?: MoveInput[]
    result?: string
    pgn?: string
  }
  if (playerColor !== 'white' && playerColor !== 'black') {
    return NextResponse.json({ error: 'playerColor required' }, { status: 400 })
  }

  const db = getDb()
  const id = createGame(db, { skill: skill ?? 8, playerColor })
  for (const m of moves ?? []) {
    addMove(db, { gameId: id, ...m })
  }
  finishGame(db, { gameId: id, result: result ?? '*', pgn: pgn ?? '' })
  return NextResponse.json({ id })
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ games: listGames(getDb()) })
}
