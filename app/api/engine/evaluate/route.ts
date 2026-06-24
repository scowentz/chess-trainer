import { NextResponse } from 'next/server'
import { getEngine } from '@/lib/engine'

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}))
  const { fen, depth, multipv } = body as { fen?: string; depth?: number; multipv?: number }
  if (!fen) return NextResponse.json({ error: 'fen required' }, { status: 400 })
  try {
    const result = await getEngine().evaluate(fen, { depth, multipv })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'engine error' }, { status: 503 })
  }
}
