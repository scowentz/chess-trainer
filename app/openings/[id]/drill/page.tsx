'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { DrillBoard } from './DrillBoard'
import type { DrillNode } from '@/lib/openings/drill-session'
import type { Color } from '@/lib/engine/types'

type RawNode = {
  fen: string
  is_trainee_turn: number
  acceptableUci: string[]
  spine_uci: string | null
  opponentReplies: { uci: string; weight: number }[]
}

function toNode(n: RawNode): DrillNode {
  return {
    fen: n.fen,
    isTraineeTurn: n.is_trainee_turn === 1,
    acceptableUci: n.acceptableUci,
    spineUci: n.spine_uci,
    opponentReplies: n.opponentReplies,
  }
}

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export default function DrillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [nodes, setNodes] = useState<DrillNode[] | null>(null)
  const [startFen, setStartFen] = useState<string>(STARTING_FEN)
  const [color, setColor] = useState<Color>('white')
  const [noDue, setNoDue] = useState(false)

  useEffect(() => {
    async function load() {
      const [detail, due] = await Promise.all([
        fetch(`/api/openings/${id}`).then((r) => r.json()),
        fetch(`/api/openings/${id}/due`).then((r) => r.json()),
      ])
      setColor(detail.repertoire.color as Color)
      const allNodes = (detail.nodes as RawNode[]).map(toNode)
      setNodes(allNodes)
      if (due.nodes?.length) {
        setStartFen(due.nodes[0].fen)
      } else {
        // No cards due — start from the beginning for free practice
        setNoDue(true)
        setStartFen(STARTING_FEN)
      }
    }
    void load()
  }, [id])

  const onReview = useCallback(
    (fen: string, correct: boolean) => {
      void fetch(`/api/openings/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, correct }),
      })
    },
    [id],
  )

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-1 font-serif text-2xl font-semibold text-ink">Drill</h1>
      {noDue && (
        <p className="mb-4 text-sm text-muted">
          No cards due — all caught up! Practicing from the start.
        </p>
      )}
      {!noDue && nodes && (
        <p className="mb-4 text-sm text-muted">Play the book moves from memory.</p>
      )}
      {nodes ? (
        <DrillBoard nodes={nodes} startFen={startFen} color={color} onReview={onReview} />
      ) : (
        <p className="text-muted">Loading…</p>
      )}
    </main>
  )
}
