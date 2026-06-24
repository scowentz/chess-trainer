// chess-trainer/lib/openings/build-tree.test.ts
import { describe, it, expect } from 'vitest'
import { Chess } from 'chess.js'
import { buildRepertoireTree } from './build-tree'
import type { ExplorerClient } from './explorer'
import type { ExplorerPosition } from './types'

// A fake explorer keyed by side-to-move: white always plays e4-ish spine,
// black offers two replies so the tree branches at opponent nodes.
function fakeClient(): ExplorerClient {
  return {
    async fetchPosition(fen: string): Promise<ExplorerPosition> {
      const game = new Chess(fen)
      const moves = game.moves({ verbose: true })
      if (moves.length === 0) return { opening: null, totalGames: 0, moves: [] }
      const white = game.turn() === 'w'
      // Pick deterministic legal moves to keep the test stable.
      const pick = (san: string) => moves.find((mv) => mv.san === san) ?? moves[0]
      if (white) {
        const a = pick('e4')
        return {
          opening: { eco: 'C00', name: 'Test' },
          totalGames: 100,
          moves: [{ uci: a.from + a.to, san: a.san, white: 100, draws: 0, black: 0 }],
        }
      }
      const a = pick('e5')
      const b = pick('c5')
      return {
        opening: null,
        totalGames: 100,
        moves: [
          { uci: a.from + a.to, san: a.san, white: 60, draws: 0, black: 0 },
          { uci: b.from + b.to, san: b.san, white: 40, draws: 0, black: 0 },
        ],
      }
    },
  }
}

describe('buildRepertoireTree', () => {
  it('marks trainee nodes and branches only at opponent nodes', async () => {
    const start = new Chess().fen()
    const tree = await buildRepertoireTree(fakeClient(), {
      startFen: start,
      color: 'white',
      maxDepth: 3,
    })
    const root = tree.nodes.find((n) => n.fen === start)!
    expect(root.isTraineeTurn).toBe(true)
    expect(root.acceptableUci.length).toBe(1) // white spine only branch
    // The black node after 1.e4 should carry two weighted replies.
    const blackNode = tree.nodes.find((n) => !n.isTraineeTurn)!
    expect(blackNode.opponentReplies.length).toBe(2)
    expect(blackNode.opponentReplies[0].weight).toBeGreaterThan(0)
  })

  it('respects the node cap', async () => {
    const tree = await buildRepertoireTree(fakeClient(), {
      startFen: new Chess().fen(),
      color: 'white',
      maxDepth: 20,
      nodeCap: 5,
    })
    expect(tree.nodes.length).toBeLessThanOrEqual(5)
  })

  it('stops a branch when the explorer has no moves', async () => {
    const empty: ExplorerClient = {
      async fetchPosition() {
        return { opening: null, totalGames: 0, moves: [] }
      },
    }
    const tree = await buildRepertoireTree(empty, {
      startFen: new Chess().fen(),
      color: 'white',
      maxDepth: 5,
    })
    expect(tree.nodes.length).toBe(0)
  })
})
