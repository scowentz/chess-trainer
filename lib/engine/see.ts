import type { Chess } from 'chess.js'

export const PIECE_VALUE: Record<'p' | 'n' | 'b' | 'r' | 'q' | 'k', number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
}

/**
 * Signed centipawns the side-to-move nets by initiating optimal captures on `target`.
 * Recaptures below the root may "stand pat" (clamped at 0); the root keeps its sign,
 * so a losing capture returns a negative number. Uses the least-valuable attacker and
 * skips pinned/illegal attackers via chess.js move legality. Ignores x-ray reveals.
 */
export function seeGain(chess: Chess, target: string): number {
  const stm = chess.turn()
  const occupant = chess.get(target)
  if (!occupant) return 0
  const attackerSqs = chess.attackers(target, stm)
  if (!attackerSqs.length) return 0
  const capturedVal = PIECE_VALUE[occupant.type]
  const ordered = [...attackerSqs].sort(
    (a, b) => PIECE_VALUE[chess.get(a)!.type] - PIECE_VALUE[chess.get(b)!.type],
  )
  for (const from of ordered) {
    try {
      chess.move({ from, to: target, promotion: 'q' })
    } catch {
      continue // pinned or otherwise illegal; try the next attacker
    }
    const gain = capturedVal - Math.max(0, seeGain(chess, target))
    chess.undo()
    return gain
  }
  return 0
}
