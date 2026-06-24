'use client'

import type { MoveClass } from '@/lib/engine/classify'
import { MOVE_CLASS_META } from './moveClassMeta'

interface Review {
  ply: number
  mover: string
  classification: string
  bestMove: string
  explanation?: string
}

export function ReviewPanel({ reviews }: { reviews: Review[] }) {
  return (
    <section className="rounded-2xl border border-line bg-surface/80 p-5">
      <h2 className="mb-4 font-serif text-xl font-semibold text-ink">Game review</h2>
      <ul className="grid gap-2">
        {reviews.map((r) => {
          const meta = MOVE_CLASS_META[r.classification as MoveClass]
          const color = meta?.color ?? '#a89f8c'
          return (
            <li
              key={r.ply}
              className="flex items-start gap-3 rounded-lg border border-transparent bg-surface-2/40 px-3 py-2.5 transition-colors duration-200 hover:border-line"
            >
              <span
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <div className="min-w-0 text-sm leading-relaxed">
                <span className="text-faint">
                  Move {Math.ceil(r.ply / 2)} ({r.mover}) ·{' '}
                </span>
                <strong style={{ color }}>{meta?.label ?? r.classification}</strong>
                {r.explanation ? (
                  <span className="text-muted"> — {r.explanation}</span>
                ) : (
                  <span className="text-muted">
                    {' '}
                    — best was{' '}
                    <span className="font-mono text-brass-bright">{r.bestMove}</span>
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
