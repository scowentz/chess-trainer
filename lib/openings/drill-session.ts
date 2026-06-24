import { Chess } from 'chess.js'

export interface DrillNode {
  fen: string
  isTraineeTurn: boolean
  acceptableUci: string[]
  spineUci: string | null
  opponentReplies: { uci: string; weight: number }[]
}

export function buildNodeMap(nodes: DrillNode[]): Map<string, DrillNode> {
  return new Map(nodes.map((n) => [n.fen, n]))
}

export function isBookMove(node: DrillNode, uci: string): boolean {
  return node.acceptableUci.includes(uci)
}

export function applyMove(fen: string, uci: string): string | null {
  const game = new Chess(fen)
  try {
    game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? 'q' })
    return game.fen()
  } catch {
    return null
  }
}

export function pickOpponentReply(node: DrillNode, rng: () => number = Math.random): string | null {
  const replies = node.opponentReplies
  if (replies.length === 0) return node.spineUci
  const total = replies.reduce((s, r) => s + r.weight, 0)
  let roll = rng() * total
  for (const r of replies) {
    roll -= r.weight
    if (roll < 0) return r.uci
  }
  return replies[replies.length - 1].uci
}
