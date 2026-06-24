'use client'

import { useState, useCallback } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { useChessGame } from './useChessGame'
import { BlunderModal } from './BlunderModal'
import { HintButton } from './HintButton'
import { StrengthSelector } from './StrengthSelector'
import { ReviewPanel } from './ReviewPanel'
import { MoveBadge } from './MoveBadge'
import type { Color } from '@/lib/engine/types'

interface Review {
  ply: number
  mover: string
  classification: string
  bestMove: string
  explanation?: string
}

export function ChessGame() {
  const [skill, setSkill] = useState(8)
  const [playerColor] = useState<Color>('white')
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const game = useChessGame({ playerColor, skill })

  const onPieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      // Optimistically reject; the async result updates board state via fen.
      void game.tryUserMove(sourceSquare, targetSquare)
      // chess.js inside the hook is the source of truth; returning false keeps
      // react-chessboard from animating an unconfirmed move.
      return false
    },
    [game],
  )

  const runReview = useCallback(async () => {
    // Rebuild per-ply positions from the move history.
    const history = game.game.history({ verbose: true })
    const replay = new Chess()
    const positions = history.map((h) => {
      const fenBefore = replay.fen()
      replay.move({ from: h.from, to: h.to, promotion: h.promotion ?? 'q' })
      const mover: Color = h.color === 'w' ? 'white' : 'black'
      return { fenBefore, fenAfter: replay.fen(), mover, uci: h.from + h.to + (h.promotion ?? '') }
    })
    const res = await fetch('/api/engine/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positions }),
    })
    const data = (await res.json()) as { reviews: Review[] }
    setReviews(data.reviews)

    await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill,
        playerColor,
        result: game.result,
        pgn: game.game.pgn(),
        moves: positions.map((p, i) => ({
          ply: i + 1,
          side: p.mover,
          uci: history[i].from + history[i].to + (history[i].promotion ?? ''),
          fenBefore: p.fenBefore,
          fenAfter: p.fenAfter,
          evalCp: null,
          classification: data.reviews[i]?.classification ?? null,
        })),
      }),
    })
  }, [game, playerColor, skill])

  return (
    <main style={{ padding: 24, display: 'grid', gap: 16, maxWidth: 640 }}>
      <h1>Play vs. the coached engine</h1>
      <StrengthSelector skill={skill} onChange={setSkill} />
      <div style={{ maxWidth: 480 }}>
        <Chessboard
          position={game.fen}
          onPieceDrop={onPieceDrop}
          boardOrientation={playerColor}
        />
      </div>
      <HintButton hint={game.hint} onHint={game.requestHint} />
      {game.status === 'playing' && (
        <MoveBadge moveClass={game.lastMoveClass} explanation={game.lastMoveExplanation} />
      )}

      {game.status === 'gameover' && (
        <div>
          <p>Game over: {game.result}</p>
          {reviews ? <ReviewPanel reviews={reviews} /> : <button onClick={runReview}>Review my game</button>}
        </div>
      )}

      {game.pendingBlunder && (
        <BlunderModal
          lossCp={game.pendingBlunder.lossCp}
          onConfirm={game.confirmPendingMove}
          onCancel={game.cancelPendingMove}
        />
      )}
    </main>
  )
}
