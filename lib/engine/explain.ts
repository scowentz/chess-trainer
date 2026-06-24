import { Chess } from 'chess.js'
import { seeGain, PIECE_VALUE } from './see'
import type { EngineEval, Color } from './types'
import type { MoveClass } from './classify'

const PIECE_NAME: Record<'p' | 'n' | 'b' | 'r' | 'q' | 'k', string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}

export interface ExplainInput {
  fenBefore: string
  playedMove: string // UCI
  bestMove: string // UCI
  evalBefore: EngineEval | null
  evalAfter: EngineEval | null
  moveClass: MoveClass
  mover: Color
}

export interface ExplainFacts {
  hung: { square: string; piece: string } | null
  bestMoveSan: string | null
  bestIsFork: { targets: string[] } | null
  bestGivesCheck: boolean
  bestIsCapture: boolean
  bestIsPromotion: boolean
  missedMate: boolean
  allowedMate: boolean
  badCapture: boolean
}

export interface Explanation {
  facts: ExplainFacts
  text: string
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8']
const ALL_SQUARES: string[] = FILES.flatMap((f) => RANKS.map((r) => f + r))

function uciToMove(uci: string): { from: string; to: string; promotion?: string } {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }
}

/** Most valuable piece of `owner` that the side-to-move can win by capture. */
function worstHung(chess: Chess, owner: 'w' | 'b'): { square: string; piece: string } | null {
  let worst: { square: string; piece: string; value: number } | null = null
  for (const sq of ALL_SQUARES) {
    const p = chess.get(sq)
    if (!p || p.color !== owner) continue
    const gain = seeGain(chess, sq)
    if (gain > 0) {
      const value = PIECE_VALUE[p.type]
      if (!worst || value > worst.value) worst = { square: sq, piece: PIECE_NAME[p.type], value }
    }
  }
  return worst ? { square: worst.square, piece: worst.piece } : null
}

function bestMoveFacts(
  fenBefore: string,
  bestMove: string,
  mover: 'w' | 'b',
): {
  san: string | null
  fork: { targets: string[] } | null
  check: boolean
  capture: boolean
  promo: boolean
} {
  const c = new Chess(fenBefore)
  let move
  try {
    move = c.move(uciToMove(bestMove))
  } catch {
    return { san: null, fork: null, check: false, capture: false, promo: false }
  }
  const san = move.san
  const check = san.includes('+') || san.includes('#')
  const capture = move.flags.includes('c') || move.flags.includes('e')
  const promo = move.flags.includes('p')

  const enemy: 'w' | 'b' = mover === 'w' ? 'b' : 'w'
  const forkerSq = move.to
  const forkerVal = PIECE_VALUE[c.get(forkerSq)!.type]
  const targets: { label: string; value: number }[] = []
  for (const sq of ALL_SQUARES) {
    const p = c.get(sq)
    if (!p || p.color !== enemy) continue
    const valuable = p.type === 'k' || PIECE_VALUE[p.type] >= PIECE_VALUE.n
    if (!valuable) continue
    if (c.attackers(sq, mover).includes(forkerSq)) {
      // count only pieces we'd actually win (more valuable than the forker, or undefended)
      const undefended = c.attackers(sq, enemy).length === 0
      if (p.type === 'k' || undefended || PIECE_VALUE[p.type] > forkerVal) {
        targets.push({ label: `${PIECE_NAME[p.type]} on ${sq}`, value: PIECE_VALUE[p.type] })
      }
    }
  }
  targets.sort((a, b) => b.value - a.value)
  const fork = targets.length >= 2 ? { targets: targets.slice(0, 2).map((t) => t.label) } : null
  return { san, fork, check, capture, promo }
}

function describeBest(f: ExplainFacts): string | null {
  if (!f.bestMoveSan) return null
  if (f.bestMoveSan.includes('#')) return 'delivering mate'
  if (f.bestIsFork) return `forking ${f.bestIsFork.targets.join(' and ')}`
  if (f.bestGivesCheck) return 'with check'
  if (f.bestIsPromotion) return 'promoting'
  if (f.bestIsCapture) return 'winning material'
  return null
}

function assembleText(f: ExplainFacts, input: ExplainInput): string {
  const detail = describeBest(f)
  const negative =
    input.moveClass === 'blunder' || input.moveClass === 'mistake' || input.moveClass === 'inaccuracy'

  if (negative) {
    let lead: string
    if (f.allowedMate) lead = 'This allows a forced mate'
    else if (f.hung) lead = `You left your ${f.hung.piece} on ${f.hung.square} hanging`
    else if (f.badCapture) lead = 'That capture loses material after the recapture'
    else if (f.missedMate) lead = 'This misses a forced mate'
    else lead = 'This concedes an advantage'
    const better = f.bestMoveSan ? ` — best was ${f.bestMoveSan}${detail ? ` (${detail})` : ''}` : ''
    return `${lead}${better}.`
  }

  if (input.moveClass === 'great') {
    return `Great — the only strong move${detail ? `, ${detail}` : ''}.`
  }
  if (input.moveClass === 'best') {
    return detail ? `Best move, ${detail}.` : 'Best move — nothing was better.'
  }
  if (input.moveClass === 'excellent') {
    return "Excellent — all but matching the engine's choice."
  }
  return 'A solid move.'
}

export function explain(input: ExplainInput): Explanation {
  const facts: ExplainFacts = {
    hung: null,
    bestMoveSan: null,
    bestIsFork: null,
    bestGivesCheck: false,
    bestIsCapture: false,
    bestIsPromotion: false,
    missedMate: false,
    allowedMate: false,
    badCapture: false,
  }

  const moverC: 'w' | 'b' = input.mover === 'white' ? 'w' : 'b'

  const cAfter = new Chess(input.fenBefore)
  let playedObj
  try {
    playedObj = cAfter.move(uciToMove(input.playedMove))
  } catch {
    playedObj = null
  }
  if (playedObj) {
    facts.hung = worstHung(cAfter, moverC)
    if (
      (playedObj.flags.includes('c') || playedObj.flags.includes('e')) &&
      seeGain(cAfter, playedObj.to) > 0
    ) {
      facts.badCapture = true
    }
  }

  const bm = bestMoveFacts(input.fenBefore, input.bestMove, moverC)
  facts.bestMoveSan = bm.san
  facts.bestIsFork = bm.fork
  facts.bestGivesCheck = bm.check
  facts.bestIsCapture = bm.capture
  facts.bestIsPromotion = bm.promo

  if (
    input.evalBefore?.type === 'mate' &&
    input.evalBefore.value > 0 &&
    input.playedMove.slice(0, 4) !== input.bestMove.slice(0, 4)
  ) {
    facts.missedMate = true
  }
  if (input.evalAfter?.type === 'mate' && input.evalAfter.value > 0) {
    facts.allowedMate = true
  }

  return { facts, text: assembleText(facts, input) }
}
