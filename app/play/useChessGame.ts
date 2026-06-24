'use client'

import { useMemo, useRef, useState, useCallback } from 'react'
import { Chess } from 'chess.js'
import { BLUNDER_WARNING_CP } from '@/lib/engine/constants'
import type { MoveClass } from '@/lib/engine/classify'
import { gradeMove } from '@/lib/engine/grade'
import type { Color, BestMoveResult } from '@/lib/engine/types'

type Status = 'playing' | 'gameover'

interface PendingBlunder {
  from: string
  to: string
  lossCp: number
}

function resultOf(game: Chess): string {
  if (!game.isGameOver()) return '*'
  if (game.isCheckmate()) return game.turn() === 'w' ? '0-1' : '1-0'
  return '1/2-1/2'
}

export function useChessGame(opts: { playerColor: Color; skill: number; fetchImpl?: typeof fetch }) {
  const doFetch = useRef(opts.fetchImpl ?? fetch).current
  const gameRef = useRef(new Chess())
  const [fen, setFen] = useState(gameRef.current.fen())
  const [status, setStatus] = useState<Status>('playing')
  const [result, setResult] = useState('*')
  const pendingBlunderRef = useRef<PendingBlunder | null>(null)
  const [pendingBlunder, setPendingBlunder] = useState<PendingBlunder | null>(null)
  const [hint, setHint] = useState<{ piece: string | null; move: string | null }>({ piece: null, move: null })
  const hintStage = useRef(0)
  const [lastMoveClass, setLastMoveClass] = useState<MoveClass | null>(null)
  const [lastMoveExplanation, setLastMoveExplanation] = useState<string | null>(null)
  const pendingFeedbackRef = useRef<{ moveClass: MoveClass; text: string } | null>(null)

  const engineColor: Color = opts.playerColor === 'white' ? 'black' : 'white'

  const post = useCallback(
    async (url: string, body: unknown): Promise<BestMoveResult> => {
      const res = await doFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return (await res.json()) as BestMoveResult
    },
    // doFetch is captured once from a ref — stable, no need in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const sync = useCallback(() => {
    const game = gameRef.current
    setFen(game.fen())
    if (game.isGameOver()) {
      setStatus('gameover')
      setResult(resultOf(game))
    }
  }, [])

  const engineReply = useCallback(async () => {
    const game = gameRef.current
    if (game.isGameOver()) return
    const res = await post('/api/engine/move', { fen: game.fen(), skill: opts.skill })
    if (res.move && res.move !== '(none)') {
      game.move({ from: res.move.slice(0, 2), to: res.move.slice(2, 4), promotion: res.move[4] ?? 'q' })
      sync()
    }
  }, [opts.skill, post, sync])

  const commit = useCallback(
    (from: string, to: string) => {
      const game = gameRef.current
      game.move({ from, to, promotion: 'q' })
      setHint({ piece: null, move: null })
      hintStage.current = 0
      const fb = pendingFeedbackRef.current
      if (fb) {
        setLastMoveClass(fb.moveClass)
        setLastMoveExplanation(fb.text)
        pendingFeedbackRef.current = null
      }
      sync()
    },
    [sync],
  )

  const tryUserMove = useCallback(
    async (from: string, to: string): Promise<boolean> => {
      const game = gameRef.current
      if (game.turn() !== opts.playerColor[0]) return false

      const fenBefore = game.fen()
      const probe = new Chess(fenBefore)
      let probeMove
      try {
        probeMove = probe.move({ from, to, promotion: 'q' })
      } catch {
        return false // illegal move
      }
      const fenAfter = probe.fen()

      // Build the full played UCI including promotion suffix when the move was a promotion.
      // chess.js sets flags 'p' (or 'cp' for capture-promotion) when a promotion occurred.
      const isPromotion = probeMove.flags.includes('p')
      const playedUci = from + to + (isPromotion ? (probeMove.promotion ?? 'q') : '')

      const [beforeEval, afterEval] = await Promise.all([
        post('/api/engine/evaluate', { fen: fenBefore, multipv: 2 }),
        post('/api/engine/evaluate', { fen: fenAfter }),
      ])

      const { classification: moveClass, explanation: text, lossCp } = gradeMove({
        before: beforeEval,
        after: afterEval,
        fenBefore,
        playedUci,
        mover: opts.playerColor,
      })

      pendingFeedbackRef.current = { moveClass, text }

      if (lossCp >= BLUNDER_WARNING_CP) {
        const blunder = { from, to, lossCp }
        pendingBlunderRef.current = blunder
        setPendingBlunder(blunder)
        return false
      }

      commit(from, to)
      void engineReply()
      return true
    },
    [commit, engineColor, engineReply, opts.playerColor, post],
  )

  const confirmPendingMove = useCallback(async () => {
    const current = pendingBlunderRef.current
    if (!current) return
    setPendingBlunder(null)
    pendingBlunderRef.current = null
    commit(current.from, current.to)
    await engineReply()
  }, [commit, engineReply])

  const cancelPendingMove = useCallback(() => {
    setPendingBlunder(null)
    pendingBlunderRef.current = null
    pendingFeedbackRef.current = null
  }, [])

  const requestHint = useCallback(async () => {
    const res = await post('/api/engine/evaluate', { fen: gameRef.current.fen() })
    const best = res.move
    if (hintStage.current === 0) {
      setHint({ piece: best.slice(0, 2), move: null })
      hintStage.current = 1
    } else {
      setHint({ piece: best.slice(0, 2), move: best })
    }
  }, [post])

  return useMemo(
    () => ({
      fen,
      status,
      result,
      pendingBlunder,
      hint,
      lastMoveClass,
      lastMoveExplanation,
      tryUserMove,
      confirmPendingMove,
      cancelPendingMove,
      requestHint,
      game: gameRef.current,
    }),
    [
      fen,
      status,
      result,
      pendingBlunder,
      hint,
      lastMoveClass,
      lastMoveExplanation,
      tryUserMove,
      confirmPendingMove,
      cancelPendingMove,
      requestHint,
    ],
  )
}
