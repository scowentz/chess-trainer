'use client'

import { useState, useCallback, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { useChessGame } from './useChessGame'
import { BlunderModal } from './BlunderModal'
import { HintButton } from './HintButton'
import { StrengthSelector } from './StrengthSelector'
import { ReviewPanel } from './ReviewPanel'
import { MoveBadge } from './MoveBadge'
import { isMuted, setMuted, primeAudio } from '@/lib/sound/sounds'
import type { Color, EngineEval } from '@/lib/engine/types'

interface Review {
  ply: number
  mover: string
  classification: string
  bestMove: string
  explanation?: string
}

// ── material / captured-piece helpers ────────────────────────────────────────

const STARTING_COUNTS: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 }
const PIECE_POINTS: Record<string, number>    = { p: 1, n: 3, b: 3, r: 5, q: 9 }
const PIECE_SYMBOLS: Record<string, string>   = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛',
}

function computeMaterial(fen: string) {
  const counts: Record<string, number> = {
    wp: 0, wn: 0, wb: 0, wr: 0, wq: 0,
    bp: 0, bn: 0, bb: 0, br: 0, bq: 0,
  }
  for (const ch of fen.split(' ')[0]) {
    if (ch === '/' || /\d/.test(ch)) continue
    const color = ch === ch.toUpperCase() ? 'w' : 'b'
    const type  = ch.toLowerCase()
    if (type in PIECE_POINTS) counts[color + type]++
  }
  const capturedByWhite: string[] = []
  const capturedByBlack: string[] = []
  for (const t of ['q', 'r', 'b', 'n', 'p']) {
    for (let i = 0; i < STARTING_COUNTS[t] - counts['b' + t]; i++) capturedByWhite.push('b' + t)
    for (let i = 0; i < STARTING_COUNTS[t] - counts['w' + t]; i++) capturedByBlack.push('w' + t)
  }
  const wp = capturedByWhite.reduce((s, p) => s + PIECE_POINTS[p[1]], 0)
  const bp = capturedByBlack.reduce((s, p) => s + PIECE_POINTS[p[1]], 0)
  return { capturedByWhite, capturedByBlack, advantage: wp - bp }
}

function CapturedRow({ pieces, advantage }: { pieces: string[]; advantage: number }) {
  return (
    <div className="flex h-6 items-center gap-px px-0.5">
      {pieces.map((p, i) => (
        <span key={i} className="text-[15px] leading-none text-muted select-none">{PIECE_SYMBOLS[p]}</span>
      ))}
      {advantage > 0 && (
        <span className="ml-1.5 text-xs font-semibold text-muted">+{advantage}</span>
      )}
    </div>
  )
}

function SoundToggle() {
  // Read persisted state after mount to avoid a hydration mismatch.
  const [muted, setMutedState] = useState(false)
  useEffect(() => setMutedState(isMuted()), [])

  const toggle = () => {
    primeAudio()
    const next = !muted
    setMuted(next)
    setMutedState(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={muted}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
      className="grid h-10 w-10 cursor-pointer place-items-center rounded-lg border border-line bg-surface-2/70 text-muted transition-colors duration-200 hover:border-brass/60 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        {muted ? (
          <>
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </>
        ) : (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        )}
      </svg>
    </button>
  )
}

function AdvantageBar({ eval: ev }: { eval: EngineEval | null }) {
  const whitePct =
    ev === null
      ? 50
      : ev.type === 'mate'
        ? ev.value > 0 ? 100 : 0
        : 50 + (Math.max(-800, Math.min(800, ev.value)) / 800) * 50

  let label = ''
  if (ev !== null) {
    if (ev.type === 'mate') {
      label = `M${Math.abs(ev.value)}`
    } else if (Math.abs(ev.value) >= 10) {
      const abs = (Math.abs(ev.value) / 100).toFixed(1)
      label = ev.value > 0 ? `+${abs}` : `-${abs}`
    }
  }

  return (
    <div className="relative w-2.5 overflow-hidden rounded bg-[#2a2419]" data-testid="advantage-bar">
      <div
        className="absolute bottom-0 left-0 right-0 bg-[#efd9b4] transition-[height] duration-500"
        style={{ height: `${whitePct}%` }}
      />
      {label && (
        <span
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 text-[8px] font-bold leading-none ${
            whitePct > 50 ? 'bottom-0.5 text-[#241c0c]' : 'top-0.5 text-[#efd9b4]'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  )
}

export function ChessGame() {
  const [skill, setSkill] = useState(8)
  const [playerColor] = useState<Color>('white')
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const game = useChessGame({ playerColor, skill })

  const turn = game.fen.split(' ')[1]
  const playerTurn = turn === playerColor[0]

  const onPieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      // First interaction also unlocks the browser's audio context.
      primeAudio()
      // Optimistically reject; the async result updates board state via fen.
      void game.tryUserMove(sourceSquare, targetSquare)
      // chess.js inside the hook is the source of truth; returning false keeps
      // react-chessboard from animating an unconfirmed move.
      return false
    },
    [game],
  )

  const runReview = useCallback(async () => {
    setReviewing(true)
    try {
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
    } finally {
      setReviewing(false)
    }
  }, [game, playerColor, skill])

  const { capturedByWhite, capturedByBlack, advantage } = computeMaterial(game.fen)

  const lastMoveStyles = game.lastMove
    ? {
        [game.lastMove.from]: { background: 'rgba(205, 168, 99, 0.38)' },
        [game.lastMove.to]: { background: 'rgba(205, 168, 99, 0.52)' },
      }
    : {}

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <header className="mb-7 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-brass/30 bg-brass/10 text-2xl leading-none text-brass-bright">
            <span aria-hidden="true">♞</span>
          </span>
          <div>
            <h1 className="font-serif text-2xl font-semibold leading-tight text-ink sm:text-3xl">Chess Trainer</h1>
            <p className="text-sm text-faint">Play the coached engine — it explains every move.</p>
          </div>
        </div>
        <SoundToggle />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Board column */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line-bright bg-gradient-to-b from-[#2a2419] to-[#211c14] p-3 shadow-2xl sm:p-4">
            <CapturedRow pieces={capturedByBlack} advantage={advantage < 0 ? -advantage : 0} />
            <div className="flex items-stretch gap-2">
              <AdvantageBar eval={game.currentEval} />
              <div className="min-w-0 flex-1">
                <Chessboard
                  position={game.fen}
                  onPieceDrop={onPieceDrop}
                  boardOrientation={playerColor}
                  arePiecesDraggable={game.status === 'playing'}
                  animationDuration={250}
                  customSquareStyles={lastMoveStyles}
                  customBoardStyle={{ borderRadius: '6px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.7)' }}
                  customDarkSquareStyle={{ backgroundColor: '#9a7a4d' }}
                  customLightSquareStyle={{ backgroundColor: '#efd9b4' }}
                />
              </div>
            </div>
            <CapturedRow pieces={capturedByWhite} advantage={advantage > 0 ? advantage : 0} />
          </div>
          <StatusBar status={game.status} thinking={game.thinking} playerTurn={playerTurn} result={game.result} />
        </div>

        {/* Side panel */}
        <aside className="flex flex-col gap-5 rounded-2xl border border-line bg-surface/70 p-5">
          <StrengthSelector skill={skill} onChange={setSkill} />
          <div className="h-px bg-line" />
          <HintButton hint={game.hint} onHint={game.requestHint} />

          {game.canTakeBack && (
            <button
              type="button"
              onClick={game.takeBack}
              className="group inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface-2/70 px-3.5 py-2 text-sm font-semibold text-ink transition-colors duration-200 hover:border-brass/60 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 text-brass transition-colors duration-200 group-hover:text-brass-bright"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 7v6h6" />
                <path d="M3 13C5.5 6 15 3 21 9" />
              </svg>
              Take Back
            </button>
          )}

          {game.status === 'playing' && game.lastMoveClass && (
            <MoveBadge moveClass={game.lastMoveClass} explanation={game.lastMoveExplanation} />
          )}

          {game.status === 'gameover' && (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-brass/30 bg-brass/10 px-4 py-3 text-center">
                <p className="font-serif text-lg font-semibold text-brass-bright">Game over</p>
                <p className="text-sm text-muted">Result: {game.result}</p>
              </div>
              {!reviews && (
                <button
                  type="button"
                  onClick={runReview}
                  disabled={reviewing}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-brass px-4 py-2.5 text-sm font-semibold text-[#241c0c] transition-colors duration-200 hover:bg-brass-bright disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70"
                >
                  {reviewing ? 'Reviewing…' : 'Review my game'}
                </button>
              )}
            </div>
          )}
        </aside>
      </div>

      {game.status === 'gameover' && reviews && (
        <div className="mt-6">
          <ReviewPanel reviews={reviews} />
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

function StatusBar({
  status,
  thinking,
  playerTurn,
  result,
}: {
  status: 'playing' | 'gameover'
  thinking: boolean
  playerTurn: boolean
  result: string
}) {
  let dotClass = 'bg-felt'
  let label = 'Your move'
  if (status === 'gameover') {
    dotClass = 'bg-brass'
    label = `Game over · ${result}`
  } else if (thinking) {
    dotClass = 'bg-brass-bright'
    label = 'Engine is thinking'
  } else if (!playerTurn) {
    dotClass = 'bg-muted'
    label = 'Waiting…'
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-surface/70 px-4 py-3">
      <div className="flex items-center gap-2.5">
        {thinking ? (
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="think-dot" />
            <span className="think-dot" />
            <span className="think-dot" />
          </span>
        ) : (
          <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} aria-hidden="true" />
        )}
        <span className="text-sm font-semibold text-ink">{label}</span>
      </div>
      <span className="text-xs uppercase tracking-[0.14em] text-faint">vs. Stockfish</span>
    </div>
  )
}
