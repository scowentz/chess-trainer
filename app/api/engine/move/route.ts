import { NextResponse } from 'next/server'
import { getEngine } from '@/lib/engine'

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}))
  const { fen, skill, depth } = body as { fen?: string; skill?: number; depth?: number }
  if (!fen) return NextResponse.json({ error: 'fen required' }, { status: 400 })
  try {
    const result = await getEngine().bestMove(fen, { skill: skill ?? 8, depth })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'engine error' }, { status: 503 })
  }
}
