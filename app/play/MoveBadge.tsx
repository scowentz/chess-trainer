'use client'

import type { MoveClass } from '@/lib/engine/classify'
import { MOVE_CLASS_META } from './moveClassMeta'

export function MoveBadge({
  moveClass,
  explanation,
}: {
  moveClass: MoveClass | null
  explanation: string | null
}) {
  if (!moveClass) return null
  const meta = MOVE_CLASS_META[moveClass]
  return (
    <div
      key={`${moveClass}-${explanation ?? ''}`}
      className="animate-badge-in flex items-start gap-3 rounded-xl border border-line bg-surface-2/60 px-3.5 py-3"
    >
      <span
        className="mt-0.5 shrink-0 rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm"
        style={{ backgroundColor: meta.color }}
      >
        {meta.label}
      </span>
      {explanation && <span className="text-sm leading-relaxed text-ink/90">{explanation}</span>}
    </div>
  )
}
