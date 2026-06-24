import type { ExplorerMove, ExplorerPosition } from './types'

export const DEFAULT_BOOK_THRESHOLD = 0.05
export const DEFAULT_REPLY_CAP = 4

export function moveGames(m: ExplorerMove): number {
  return m.white + m.draws + m.black
}

export function bookMoves(
  pos: ExplorerPosition,
  opts: { threshold?: number; cap?: number } = {},
): ExplorerMove[] {
  const threshold = opts.threshold ?? DEFAULT_BOOK_THRESHOLD
  const cap = opts.cap ?? DEFAULT_REPLY_CAP
  if (pos.moves.length === 0) return []
  const total = pos.totalGames || pos.moves.reduce((s, m) => s + moveGames(m), 0)
  const sorted = [...pos.moves].sort((a, b) => moveGames(b) - moveGames(a))
  // Always keep the top move; keep the rest only if frequent enough.
  const kept = sorted.filter((m, i) => i === 0 || (total > 0 && moveGames(m) / total >= threshold))
  return kept.slice(0, cap)
}

export function spineMove(pos: ExplorerPosition): string | null {
  const top = bookMoves(pos, { cap: 1 })
  return top[0]?.uci ?? null
}
