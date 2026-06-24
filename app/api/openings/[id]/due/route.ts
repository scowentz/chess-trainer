import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getDueNodes } from '@/lib/db/openings'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params
  return NextResponse.json({ nodes: getDueNodes(getDb(), Number(id), new Date()) })
}
