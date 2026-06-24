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
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span
        style={{
          background: meta.color,
          color: 'white',
          borderRadius: 6,
          padding: '2px 8px',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        {meta.label}
      </span>
      {explanation && <span style={{ fontSize: 14, color: '#374151' }}>{explanation}</span>}
    </div>
  )
}
