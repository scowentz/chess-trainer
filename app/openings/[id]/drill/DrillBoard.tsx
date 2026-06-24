'use client'

import { useCallback } from 'react'
import { Chessboard } from 'react-chessboard'
import { useDrill } from './useDrill'
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

  const onPieceDrop = useCallback(
    (from: string, to: string): boolean => {
      drill.tryMove(from, to)
      return false // hook owns board state
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
          customBoardStyle={{ borderRadius: '6px' }}
          customDarkSquareStyle={{ backgroundColor: '#9a7a4d' }}
          customLightSquareStyle={{ backgroundColor: '#efd9b4' }}
        />
      </div>
      {drill.correction && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Off book. A book move here was{' '}
          <span className="font-mono text-red-100">{drill.correction.join(' / ')}</span>.
        </div>
      )}
    </div>
  )
}
