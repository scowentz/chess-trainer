import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { saveBuiltRepertoire, listRepertoires } from '@/lib/db/openings'
import { loadCatalog, resolveStart } from '@/lib/openings/catalog'
import { createExplorerClient } from '@/lib/openings/explorer'
import { buildRepertoireTree } from '@/lib/openings/build-tree'
import type { Color } from '@/lib/engine/types'

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { catalogId?: string; color?: Color; maxDepth?: number }
  const { catalogId, color, maxDepth } = body
  if (!catalogId || typeof catalogId !== 'string') {
    return NextResponse.json({ error: 'catalogId required' }, { status: 400 })
  }
  if (color !== 'white' && color !== 'black') {
    return NextResponse.json({ error: 'color required' }, { status: 400 })
  }
  const entry = loadCatalog().find((e) => e.id === catalogId)
  if (!entry) return NextResponse.json({ error: 'unknown catalogId' }, { status: 400 })

  const { startFen, startPath } = resolveStart(entry.pgn)
  const depth = maxDepth ?? 12
  let tree
  try {
    tree = await buildRepertoireTree(createExplorerClient(), { startFen, color, maxDepth: depth })
  } catch {
    return NextResponse.json({ error: 'failed to build from explorer' }, { status: 502 })
  }

  const now = new Date()
  const id = saveBuiltRepertoire(getDb(), {
    meta: { name: entry.name, eco: entry.eco, color, startFen, startPath, maxDepth: depth, database: 'masters' },
    tree,
    now,
  })
  const cardCount = tree.nodes.filter((n) => n.isTraineeTurn).length
  return NextResponse.json({ id, nodeCount: tree.nodes.length, cardCount })
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ repertoires: listRepertoires(getDb(), new Date()) })
}
