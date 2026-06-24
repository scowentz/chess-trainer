import { NextResponse } from 'next/server'
import { getEngine } from '@/lib/engine'
import type { MoveClass } from '@/lib/engine/classify'
import type { Color } from '@/lib/engine/types'
import { gradeMove } from '@/lib/engine/grade'

interface Position {
  fenBefore: string
  fenAfter: string
  mover: Color
  uci: string
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
      const before = await engine.evaluate(pos.fenBefore, { depth, multipv: 2 })
      const after = await engine.evaluate(pos.fenAfter, { depth })

      const { classification, explanation, lossCp } = gradeMove({
        before,
        after,
        fenBefore: pos.fenBefore,
        playedUci: pos.uci,
        mover: pos.mover,
      })

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
