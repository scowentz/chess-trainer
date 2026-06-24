import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getGame } from '@/lib/db/games'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params
  const result = getGame(getDb(), Number(id))
  if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(result)
}
