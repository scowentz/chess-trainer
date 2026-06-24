import { NextResponse } from 'next/server'
import { getEngine } from '@/lib/engine'
import { classifyMove, moverCpLoss } from '@/lib/engine/classify'
import type { MoveClass } from '@/lib/engine/classify'
import type { Color } from '@/lib/engine/types'

interface Position {
  fenBefore: string
  fenAfter: string
  mover: Color
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}))
  const { positions, depth } = body as { positions?: Position[]; depth?: number }
  if (!Array.isArray(positions) || positions.length === 0) {
    return NextResponse.json({ error: 'positions required' }, { status: 400 })
  }

  const engine = getEngine()
  const reviews: Array<{ ply: number; mover: Color; lossCp: number; classification: MoveClass; bestMove: string }> = []
  try {
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i]
      const afterSideToMove: Color = pos.mover === 'white' ? 'black' : 'white'
      const before = await engine.evaluate(pos.fenBefore, { depth })
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

      reviews.push({
        ply: i + 1,
        mover: pos.mover,
        lossCp,
        classification: classifyMove(lossCp),
        bestMove: before.move,
      })
    }
  } catch {
    return NextResponse.json({ error: 'engine error' }, { status: 503 })
  }

  return NextResponse.json({ reviews })
}
