'use client'

import { useMemo, useRef, useState, useCallback } from 'react'
import { Chess, type Move } from 'chess.js'
import { BLUNDER_WARNING_CP } from '@/lib/engine/constants'
import type { MoveClass } from '@/lib/engine/classify'
import { gradeMove } from '@/lib/engine/grade'
import { playSound, type SoundType } from '@/lib/sound/sounds'
import type { Color, BestMoveResult, EngineEval } from '@/lib/engine/types'

type Status = 'playing' | 'gameover'

interface PendingBlunder {
  from: string
  to: string
  lossCp: number
}

interface Square2 {
  from: string
  to: string
}

function resultOf(game: Chess): string {
  if (!game.isGameOver()) return '*'
  if (game.isCheckmate()) return game.turn() === 'w' ? '0-1' : '1-0'
  return '1/2-1/2'
}

/** Pick the sound that best matches what just happened on the board. */
function soundForMove(game: Chess, mv: Move): SoundType {
  if (game.isGameOver()) return 'gameEnd'
  if (game.isCheck()) return 'check'
  if (mv.flags.includes('k') || mv.flags.includes('q')) return 'castle'
  if (mv.flags.includes('c') || mv.flags.includes('e')) return 'capture'
  return 'move'
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// A short, human-feeling pause so the engine doesn't reply instantly.
const randomThinkMs = () => 280 + Math.random() * 360

function normalizeToWhite(ev: EngineEval | null, sideToMove: Color): EngineEval | null {
  if (!ev) return null
  if (sideToMove === 'white') return ev
  return { type: ev.type, value: -ev.value }
}

export function useChessGame(opts: {
  playerColor: Color
  skill: number
  fetchImpl?: typeof fetch
  /** Override the engine's "thinking" pause (ms). Mainly for tests. */
  engineDelayMs?: number
}) {
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
  const [thinking, setThinking] = useState(false)
  const [lastMove, setLastMove] = useState<Square2 | null>(null)
  const [currentEval, setCurrentEval] = useState<EngineEval | null>(null)

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
    setThinking(true)
    try {
      // Fetch the move and wait out a human-feeling pause concurrently, so the
      // engine never snaps back instantly even when the server is fast.
      const [res] = await Promise.all([
        post('/api/engine/move', { fen: game.fen(), skill: opts.skill }),
        delay(opts.engineDelayMs ?? randomThinkMs()),
      ])
      if (res.move && res.move !== '(none)') {
        const from = res.move.slice(0, 2)
        const to = res.move.slice(2, 4)
        const mv = game.move({ from, to, promotion: res.move[4] ?? 'q' })
        setLastMove({ from, to })
        playSound(soundForMove(game, mv))
        sync()
        setCurrentEval(normalizeToWhite(res.eval, engineColor))
      }
    } finally {
      setThinking(false)
    }
  }, [opts.skill, opts.engineDelayMs, post, sync])

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

      // Instant feedback: show the move on the board before analysis completes.
      setFen(fenAfter)
      setLastMove({ from, to })
      playSound(soundForMove(probe, probeMove))

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
      setCurrentEval(normalizeToWhite(afterEval.eval, engineColor))

      if (lossCp >= BLUNDER_WARNING_CP) {
        const blunder = { from, to, lossCp }
        pendingBlunderRef.current = blunder
        setPendingBlunder(blunder)
        playSound('blunder')
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
    // Revert the optimistic board update so the position snaps back.
    setFen(gameRef.current.fen())
    setLastMove(null)
    setCurrentEval(null)
  }, [])

  const takeBack = useCallback(() => {
    const game = gameRef.current
    if (game.history().length < 2) return
    game.undo()
    game.undo()
    setLastMove(null)
    setLastMoveClass(null)
    setLastMoveExplanation(null)
    setCurrentEval(null)
    sync()
  }, [sync])

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
    () => {
      const canTakeBack =
        gameRef.current.history().length >= 2 &&
        status === 'playing' &&
        !thinking &&
        pendingBlunder === null
      return {
        fen,
        status,
        result,
        pendingBlunder,
        hint,
        lastMoveClass,
        lastMoveExplanation,
        thinking,
        lastMove,
        currentEval,
        canTakeBack,
        tryUserMove,
        confirmPendingMove,
        cancelPendingMove,
        requestHint,
        takeBack,
        game: gameRef.current,
      }
    },
    [
      fen,
      status,
      result,
      pendingBlunder,
      hint,
      lastMoveClass,
      lastMoveExplanation,
      thinking,
      lastMove,
      currentEval,
      tryUserMove,
      confirmPendingMove,
      cancelPendingMove,
      requestHint,
      takeBack,
    ],
  )
}
