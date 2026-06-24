import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getRepertoire, deleteRepertoire } from '@/lib/db/openings'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params
  const data = getRepertoire(getDb(), Number(id))
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params
  const data = getRepertoire(getDb(), Number(id))
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  deleteRepertoire(getDb(), Number(id))
  return NextResponse.json({ ok: true })
}
