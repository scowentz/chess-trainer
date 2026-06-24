import type { MoveClass } from '@/lib/engine/classify'

export const MOVE_CLASS_META: Record<MoveClass, { label: string; color: string }> = {
  best: { label: 'Best Move', color: '#1a9850' },
  great: { label: 'Great', color: '#2b6cb0' },
  excellent: { label: 'Excellent', color: '#3aa6a6' },
  good: { label: 'Good', color: '#6b7280' },
  inaccuracy: { label: 'Inaccuracy', color: '#d6a700' },
  mistake: { label: 'Mistake', color: '#e08e0b' },
  blunder: { label: 'Blunder', color: '#c0392b' },
}
