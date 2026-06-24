'use client'

import { useCallback, useMemo } from 'react'
import { Chessboard } from 'react-chessboard'
import { useDrill } from './useDrill'
import { buildNodeMap } from '@/lib/openings/drill-session'
import type { DrillNode } from '@/lib/openings/drill-session'
import type { Color } from '@/lib/engine/types'

export function DrillBoard({
  nodes,
  startFen,
  color,
  onReview,
}: {
  nodes: DrillNode[]
  startFen: string
  color: Color
  onReview: (fen: string, correct: boolean) => void
}) {
  const drill = useDrill({ nodes, startFen, onReview })
  const map = useMemo(() => buildNodeMap(nodes), [nodes])
  const currentNode = map.get(drill.fen)

  // Determine prompt state
  const lineComplete = !currentNode
  const opponentTurn = currentNode ? !currentNode.isTraineeTurn : false

  const onPieceDrop = useCallback(
    (from: string, to: string): boolean => {
      drill.tryMove(from, to)
      return false
    },
    [drill],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-line-bright bg-gradient-to-b from-[#2a2419] to-[#211c14] p-3 shadow-2xl sm:p-4">
        <Chessboard
          position={drill.fen}
          onPieceDrop={onPieceDrop}
          boardOrientation={color}
          arePiecesDraggable={!lineComplete && !opponentTurn}
          customBoardStyle={{ borderRadius: '6px' }}
          customDarkSquareStyle={{ backgroundColor: '#9a7a4d' }}
          customLightSquareStyle={{ backgroundColor: '#efd9b4' }}
        />
      </div>

      {/* Status / feedback */}
      {lineComplete ? (
        <div className="rounded-xl border border-brass/30 bg-brass/10 px-4 py-3 text-sm text-brass-bright">
          Line complete — you know this one! ✓
        </div>
      ) : drill.correction ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Off book — a book move here was{' '}
          <span className="font-mono text-red-100">{drill.correction.join(' / ')}</span>.{' '}
          <span className="text-red-300">Try again from this position.</span>
        </div>
      ) : opponentTurn ? (
        <div className="rounded-xl border border-line bg-surface/50 px-4 py-3 text-sm text-muted">
          Opponent is responding…
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-surface/50 px-4 py-3 text-sm text-muted">
          Your turn — play the book move.
        </div>
      )}
    </div>
  )
}
