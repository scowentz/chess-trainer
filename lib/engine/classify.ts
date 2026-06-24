import type { EngineEval, Color } from './types'
import { CLASSIFY_THRESHOLDS, MATE_SCORE } from './constants'

export type MoveClass =
  | 'best'
  | 'great'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'

/** Side-to-move centipawn score; mate is mapped to a large signed magnitude. */
export function stmScoreCp(e: EngineEval): number {
  return e.type === 'cp'
    ? e.value
    : e.value > 0
      ? MATE_SCORE - e.value
      : -MATE_SCORE - e.value
}

/** Convert a side-to-move eval into a white-relative centipawn number. */
export function toWhiteCp(e: EngineEval, sideToMove: Color): number {
  const stmCp = stmScoreCp(e)
  return sideToMove === 'white' ? stmCp : -stmCp
}

/** Classify a move from its centipawn loss, whether it was the engine's pick, and the #1-vs-#2 gap. */
export function classifyMove(p: {
  lossCp: number
  playedIsBest: boolean
  gapToSecondBestCp: number
}): MoveClass {
  const T = CLASSIFY_THRESHOLDS
  if (p.lossCp >= T.blunder) return 'blunder'
  if (p.lossCp >= T.mistake) return 'mistake'
  if (p.lossCp >= T.inaccuracy) return 'inaccuracy'
  if (p.playedIsBest && p.gapToSecondBestCp >= T.greatGap) return 'great'
  if (p.playedIsBest) return 'best'
  if (p.lossCp <= T.excellent) return 'excellent'
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
