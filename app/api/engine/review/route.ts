import { NextResponse } from 'next/server'
import { getEngine } from '@/lib/engine'
import { classifyMove, moverCpLoss, stmScoreCp } from '@/lib/engine/classify'
import type { MoveClass } from '@/lib/engine/classify'
import type { Color } from '@/lib/engine/types'
import { explain } from '@/lib/engine/explain'

interface Position {
  fenBefore: string
  fenAfter: string
  mover: Color
  uci: string
}

/** Lines are ordered best-first (index 0 = engine's top choice per MultiPV ordering). */
function gapCp(lines: { eval: { type: 'cp' | 'mate'; value: number } }[]): number {
  if (lines.length < 2) return Infinity
  return stmScoreCp(lines[0].eval) - stmScoreCp(lines[1].eval)
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}))
  const { positions, depth } = body as { positions?: Position[]; depth?: number }
  if (!Array.isArray(positions) || positions.length === 0) {
    return NextResponse.json({ error: 'positions required' }, { status: 400 })
  }

  const engine = getEngine()
  const reviews: Array<{
    ply: number
    mover: Color
    lossCp: number
    classification: MoveClass
    bestMove: string
    explanation: string
  }> = []
  try {
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i]
      const afterSideToMove: Color = pos.mover === 'white' ? 'black' : 'white'
      const before = await engine.evaluate(pos.fenBefore, { depth, multipv: 2 })
      const after = await engine.evaluate(pos.fenAfter, { depth })

      // Guard against null evals (e.g. terminal positions): treat as zero loss.
      const lossCp =
        before.eval && after.eval
          ? moverCpLoss({
              before: before.eval,
              beforeSideToMove: pos.mover,
              after: after.eval,
              afterSideToMove,
              mover: pos.mover,
            })
          : 0

      const lines = before.lines?.length
        ? before.lines
        : before.eval
          ? [{ move: before.move, eval: before.eval }]
          : []
      const playedIsBest = lines.length > 0 && lines[0].move.slice(0, 4) === pos.uci.slice(0, 4)
      const gapToSecondBestCp = gapCp(lines as { eval: { type: 'cp' | 'mate'; value: number } }[])

      const classification = classifyMove({ lossCp, playedIsBest, gapToSecondBestCp })
      const explanation = explain({
        fenBefore: pos.fenBefore,
        playedMove: pos.uci,
        bestMove: lines.length ? lines[0].move : before.move,
        evalBefore: before.eval,
        evalAfter: after.eval,
        moveClass: classification,
        mover: pos.mover,
      }).text

      reviews.push({
        ply: i + 1,
        mover: pos.mover,
        lossCp,
        classification,
        bestMove: before.move,
        explanation,
      })
    }
  } catch {
    return NextResponse.json({ error: 'engine error' }, { status: 503 })
  }

  return NextResponse.json({ reviews })
}
