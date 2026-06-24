'use client'

import type { MoveClass } from '@/lib/engine/classify'
import { MOVE_CLASS_META } from './moveClassMeta'

export function ReviewPanel({
  reviews,
}: {
  reviews: {
    ply: number
    mover: string
    classification: string
    bestMove: string
    explanation?: string
  }[]
}) {
  return (
    <div>
      <h2>Game review</h2>
      <ul style={{ display: 'grid', gap: 8, listStyle: 'none', padding: 0 }}>
        {reviews.map((r) => {
          const meta = MOVE_CLASS_META[r.classification as MoveClass]
          return (
            <li key={r.ply}>
              <span style={{ color: '#6b7280' }}>
                Move {Math.ceil(r.ply / 2)} ({r.mover}):{' '}
              </span>
              <strong style={{ color: meta?.color ?? '#111' }}>
                {meta?.label ?? r.classification}
              </strong>
              {r.explanation ? <span> — {r.explanation}</span> : <span> — best was {r.bestMove}</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
