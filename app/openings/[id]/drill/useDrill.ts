'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { buildNodeMap, isBookMove, applyMove, pickOpponentReply, type DrillNode } from '@/lib/openings/drill-session'
import { playSound } from '@/lib/sound/sounds'

export function useDrill(opts: {
  nodes: DrillNode[]
  startFen: string
  onReview: (fen: string, correct: boolean) => void
}) {
  const map = useMemo(() => buildNodeMap(opts.nodes), [opts.nodes])
  const [fen, setFen] = useState(opts.startFen)
  const [correction, setCorrection] = useState<string[] | null>(null)
  const busy = useRef(false)

  const tryMove = useCallback(
    (from: string, to: string): void => {
      const node = map.get(fen)
      if (!node || !node.isTraineeTurn || busy.current) return
      const uci = from + to
      if (isBookMove(node, uci)) {
        setCorrection(null)
        playSound('correct')
        opts.onReview(fen, true)
        const afterTrainee = applyMove(fen, uci)
        if (!afterTrainee) return
        // Auto-play the opponent reply, if this position has a follow-up node.
        const oppNode = map.get(afterTrainee)
        if (oppNode && !oppNode.isTraineeTurn) {
          const reply = pickOpponentReply(oppNode)
          const next = reply ? applyMove(afterTrainee, reply) : null
          setFen(next ?? afterTrainee)
        } else {
          setFen(afterTrainee)
        }
      } else {
        playSound('incorrect')
        setCorrection(node.acceptableUci)
        opts.onReview(fen, false)
      }
    },
    [fen, map, opts],
  )

  return { fen, correction, tryMove }
}
