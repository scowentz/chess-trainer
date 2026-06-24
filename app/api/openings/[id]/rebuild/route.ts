import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getRepertoire, rebuildRepertoire } from '@/lib/db/openings'
import { createExplorerClient } from '@/lib/openings/explorer'
import { buildRepertoireTree } from '@/lib/openings/build-tree'
import type { Color } from '@/lib/engine/types'

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params
  const data = getRepertoire(getDb(), Number(id))
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { start_fen, color, max_depth } = data.repertoire
  let tree
  try {
    tree = await buildRepertoireTree(createExplorerClient(), {
      startFen: start_fen,
      color: color as Color,
      maxDepth: max_depth,
    })
  } catch {
    return NextResponse.json({ error: 'failed to rebuild from explorer' }, { status: 502 })
  }
  rebuildRepertoire(getDb(), Number(id), tree, new Date())
  return NextResponse.json({ nodeCount: tree.nodes.length })
}
