import type { EngineEval, Color } from './types'
import { CLASSIFY_THRESHOLDS, MATE_SCORE } from './constants'

export type MoveClass = 'good' | 'inaccuracy' | 'mistake' | 'blunder'

/** Convert a side-to-move eval into a white-relative centipawn number. */
export function toWhiteCp(e: EngineEval, sideToMove: Color): number {
  const stmCp =
    e.type === 'cp'
      ? e.value
      : e.value > 0
        ? MATE_SCORE - e.value
        : -MATE_SCORE - e.value
  return sideToMove === 'white' ? stmCp : -stmCp
}

/** Classify by centipawns the mover lost (>= 0 means a worse position). */
export function classifyMove(lossCp: number): MoveClass {
  if (lossCp >= CLASSIFY_THRESHOLDS.blunder) return 'blunder'
  if (lossCp >= CLASSIFY_THRESHOLDS.mistake) return 'mistake'
  if (lossCp >= CLASSIFY_THRESHOLDS.inaccuracy) return 'inaccuracy'
  return 'good'
}

function forMover(whiteCp: number, mover: Color): number {
  return mover === 'white' ? whiteCp : -whiteCp
}

/** Centipawns lost by `mover` between the position before and after their move. */
export function moverCpLoss(p: {
  before: EngineEval
  beforeSideToMove: Color
  after: EngineEval
  afterSideToMove: Color
  mover: Color
}): number {
  const beforeForMover = forMover(toWhiteCp(p.before, p.beforeSideToMove), p.mover)
  const afterForMover = forMover(toWhiteCp(p.after, p.afterSideToMove), p.mover)
  return beforeForMover - afterForMover
}
