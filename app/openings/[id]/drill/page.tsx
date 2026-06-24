'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { DrillBoard } from './DrillBoard'
import type { DrillNode } from '@/lib/openings/drill-session'
import type { Color } from '@/lib/engine/types'

export default function DrillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [nodes, setNodes] = useState<DrillNode[] | null>(null)
  const [startFen, setStartFen] = useState<string>('')
  const [color, setColor] = useState<Color>('white')

  useEffect(() => {
    async function load() {
      const detail = await fetch(`/api/openings/${id}`).then((r) => r.json())
      const due = await fetch(`/api/openings/${id}/due`).then((r) => r.json())
      setColor(detail.repertoire.color as Color)
      setStartFen(detail.repertoire.start_fen)
      setNodes(detail.nodes as DrillNode[])
      // Begin from the first due card's fen if available.
      if (due.nodes?.length) setStartFen(due.nodes[0].fen)
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
      <h1 className="mb-6 font-serif text-2xl font-semibold text-ink">Drill</h1>
      {nodes ? (
        <DrillBoard nodes={nodes} startFen={startFen} color={color} onReview={onReview} />
      ) : (
        <p className="text-muted">Loading…</p>
      )}
    </main>
  )
}
