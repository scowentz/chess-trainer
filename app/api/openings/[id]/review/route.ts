import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { recordReview } from '@/lib/db/openings'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params
  const body = (await req.json().catch(() => ({}))) as { fen?: string; correct?: boolean }
  if (!body.fen) return NextResponse.json({ error: 'fen required' }, { status: 400 })
  const grade = body.correct ? 'good' : 'again'
  const card = recordReview(getDb(), Number(id), body.fen, grade, new Date())
  if (!card) return NextResponse.json({ error: 'card not found' }, { status: 404 })
  return NextResponse.json({ card })
}
