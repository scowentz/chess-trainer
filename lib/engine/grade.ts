import { classifyMove, moverCpLoss, stmScoreCp } from './classify'
import type { MoveClass } from './classify'
import { explain } from './explain'
import type { BestMoveResult, Color } from './types'

export interface GradeInput {
  /** Engine result for the position BEFORE the move (with multipv:2 for best gap calculation). */
  before: BestMoveResult
  /** Engine result for the position AFTER the move. */
  after: BestMoveResult
  fenBefore: string
  /** Full UCI of the played move, including promotion suffix if applicable (e.g. 'e7e8q'). */
  playedUci: string
  mover: Color
}

export interface GradeResult {
  classification: MoveClass
  explanation: string
  lossCp: number
}

/** Lines are ordered best-first (index 0 = engine's top choice per MultiPV ordering). */
function gapCp(lines: { eval: { type: 'cp' | 'mate'; value: number } }[]): number {
  if (lines.length < 2) return Infinity
  return stmScoreCp(lines[0].eval) - stmScoreCp(lines[1].eval)
}

/**
 * Pure function that grades a single player move.
 * Reproduces the classification + explanation logic shared by both the review route
 * and the live hook, eliminating code duplication.
 */
export function gradeMove(input: GradeInput): GradeResult {
  const { before, after, fenBefore, playedUci, mover } = input

  const afterSideToMove: Color = mover === 'white' ? 'black' : 'white'

  const lossCp =
    before.eval && after.eval
      ? moverCpLoss({
          before: before.eval,
          beforeSideToMove: mover,
          after: after.eval,
          afterSideToMove,
          mover,
        })
      : 0

  const lines = before.lines?.length
    ? before.lines
    : before.eval
      ? [{ move: before.move, eval: before.eval }]
      : []

  const playedIsBest = lines.length > 0 && lines[0].move.slice(0, 4) === playedUci.slice(0, 4)
  const gapToSecondBestCp = gapCp(lines as { eval: { type: 'cp' | 'mate'; value: number } }[])

  const classification = classifyMove({ lossCp, playedIsBest, gapToSecondBestCp })

  const bestMove = lines.length ? lines[0].move : before.move
  const explanation = explain({
    fenBefore,
    playedMove: playedUci,
    bestMove,
    evalBefore: before.eval,
    evalAfter: after.eval,
    moveClass: classification,
    mover,
  }).text

  return { classification, explanation, lossCp }
}
