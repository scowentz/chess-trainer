// chess-trainer/lib/openings/build-tree.ts
import { Chess } from 'chess.js'
import type { Color } from '@/lib/engine/types'
import type { ExplorerClient } from './explorer'
import { bookMoves, spineMove, moveGames } from './book'

export interface TreeNode {
  fen: string
  ply: number
  sideToMove: Color
  isTraineeTurn: boolean
  acceptableUci: string[]
  spineUci: string | null
  opponentReplies: { uci: string; weight: number }[]
  openingName: string | null
}

export interface RepertoireTree {
  startFen: string
  nodes: TreeNode[]
}

export interface BuildOptions {
  startFen: string
  color: Color
  maxDepth: number
  nodeCap?: number
  threshold?: number
  replyCap?: number
}

function applyUci(fen: string, uci: string | null): string | null {
  if (!uci) return null
  const game = new Chess(fen)
  try {
    game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? 'q' })
    return game.fen()
  } catch {
    return null
  }
}

export async function buildRepertoireTree(
  client: ExplorerClient,
  opts: BuildOptions,
): Promise<RepertoireTree> {
  const nodeCap = opts.nodeCap ?? 500
  const seen = new Set<string>()
  const nodes: TreeNode[] = []
  const queue: { fen: string; ply: number }[] = [{ fen: opts.startFen, ply: 0 }]

  let first = true
  while (queue.length > 0 && nodes.length < nodeCap) {
    const { fen, ply } = queue.shift()!
    if (seen.has(fen)) continue
    seen.add(fen)
    if (ply >= opts.maxDepth) continue

    if (!first) await new Promise((r) => setTimeout(r, 60))
    first = false

    const game = new Chess(fen)
    const sideToMove: Color = game.turn() === 'w' ? 'white' : 'black'
    const isTraineeTurn = sideToMove === opts.color

    let pos
    try {
      pos = await client.fetchPosition(fen)
    } catch {
      continue // skip positions where the explorer call fails
    }
    const book = bookMoves(pos, { threshold: opts.threshold, cap: opts.replyCap })
    if (book.length === 0) continue // leaf — nothing to learn here

    const spine = spineMove(pos)
    const node: TreeNode = {
      fen,
      ply,
      sideToMove,
      isTraineeTurn,
      acceptableUci: isTraineeTurn ? book.map((m) => m.uci) : [],
      spineUci: spine,
      opponentReplies: isTraineeTurn ? [] : book.map((m) => ({ uci: m.uci, weight: moveGames(m) })),
      openingName: pos.opening?.name ?? null,
    }
    nodes.push(node)

    if (isTraineeTurn) {
      const next = applyUci(fen, spine)
      if (next) queue.push({ fen: next, ply: ply + 1 })
    } else {
      for (const reply of node.opponentReplies) {
        const next = applyUci(fen, reply.uci)
        if (next) queue.push({ fen: next, ply: ply + 1 })
      }
    }
  }

  return { startFen: opts.startFen, nodes }
}
