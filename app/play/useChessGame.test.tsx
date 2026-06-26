// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChessGame } from './useChessGame'

function makeFetch(handlers: Record<string, unknown>) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const path = String(url)
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    const key = Object.keys(handlers).find((k) => path.includes(k))!
    const value = handlers[key]
    const data = typeof value === 'function' ? (value as (b: unknown) => unknown)(body) : value
    return { ok: true, json: async () => data } as Response
  })
}

describe('useChessGame', () => {
  it('accepts a normal move and gets an engine reply', async () => {
    const fetchImpl = makeFetch({
      '/api/engine/evaluate': { move: 'e2e4', eval: { type: 'cp', value: 20 }, pv: [] },
      '/api/engine/move': { move: 'e7e5', eval: { type: 'cp', value: 10 }, pv: [] },
    })
    const { result } = renderHook(() =>
      useChessGame({ playerColor: 'white', skill: 8, fetchImpl: fetchImpl as unknown as typeof fetch }),
    )

    let accepted = false
    await act(async () => {
      accepted = await result.current.tryUserMove('e2', 'e4')
    })
    expect(accepted).toBe(true)
    expect(result.current.pendingBlunder).toBeNull()
    // Engine reply applied: black has moved, so it's white's turn again and fen has black's pawn on e5.
    await waitFor(() => expect(result.current.fen).toContain(' w '))
    expect(result.current.fen).toContain('4p3') // black pawn on e5 rank
  })

  it('flags a blunder and does not commit until confirmed', async () => {
    // Before eval (white to move): +50 white. After eval (black to move): +300 black = -300 white.
    const fetchImpl = makeFetch({
      '/api/engine/evaluate': (b: { fen: string }) =>
        b.fen.includes(' w ')
          ? { move: 'x', eval: { type: 'cp', value: 50 }, pv: [] }
          : { move: 'x', eval: { type: 'cp', value: 300 }, pv: [] },
      '/api/engine/move': { move: 'e7e5', eval: null, pv: [] },
    })
    const { result } = renderHook(() =>
      useChessGame({ playerColor: 'white', skill: 8, fetchImpl: fetchImpl as unknown as typeof fetch }),
    )

    let accepted = true
    await act(async () => {
      accepted = await result.current.tryUserMove('e2', 'e4')
    })
    expect(accepted).toBe(false)
    expect(result.current.pendingBlunder).not.toBeNull()
    expect(result.current.pendingBlunder?.lossCp).toBeGreaterThanOrEqual(150)
  })

  it('sets lastMoveClass and explanation after a committed move', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('/api/engine/evaluate')) {
        return {
          json: async () => ({
            move: 'e2e4',
            eval: { type: 'cp', value: 20 },
            pv: ['e2e4'],
            lines: [
              { move: 'e2e4', eval: { type: 'cp', value: 20 } },
              { move: 'd2d4', eval: { type: 'cp', value: 18 } },
            ],
          }),
        } as Response
      }
      // engine reply move
      return { json: async () => ({ move: 'e7e5', eval: null, pv: [] }) } as Response
    })

    const { result } = renderHook(() => useChessGame({ playerColor: 'white', skill: 8, fetchImpl: fetchImpl as unknown as typeof fetch }))
    await act(async () => {
      await result.current.tryUserMove('e2', 'e4')
    })
    expect(result.current.lastMoveClass).not.toBeNull()
    expect(typeof result.current.lastMoveExplanation).toBe('string')
  })

  it('reveals hint progressively', async () => {
    const fetchImpl = makeFetch({
      '/api/engine/evaluate': { move: 'g1f3', eval: { type: 'cp', value: 20 }, pv: ['g1f3'] },
    })
    const { result } = renderHook(() =>
      useChessGame({ playerColor: 'white', skill: 8, fetchImpl: fetchImpl as unknown as typeof fetch }),
    )

    await act(async () => {
      await result.current.requestHint()
    })
    expect(result.current.hint.piece).toBe('g1')
    expect(result.current.hint.move).toBeNull()

    await act(async () => {
      await result.current.requestHint()
    })
    expect(result.current.hint.move).toBe('g1f3')
  })

  it('sets currentEval after engine replies', async () => {
    const fetchImpl = makeFetch({
      '/api/engine/evaluate': { move: 'e2e4', eval: { type: 'cp', value: 20 }, pv: [] },
      '/api/engine/move': { move: 'e7e5', eval: { type: 'cp', value: 10 }, pv: [] },
    })
    const { result } = renderHook(() =>
      useChessGame({ playerColor: 'white', skill: 8, fetchImpl: fetchImpl as unknown as typeof fetch, engineDelayMs: 0 }),
    )

    await act(async () => {
      await result.current.tryUserMove('e2', 'e4')
    })
    await waitFor(() => expect(result.current.currentEval).not.toBeNull())
    expect(result.current.currentEval?.type).toBe('cp')
  })

  it('canTakeBack is false at game start', () => {
    const fetchImpl = makeFetch({
      '/api/engine/evaluate': { move: 'e2e4', eval: { type: 'cp', value: 20 }, pv: [] },
      '/api/engine/move': { move: 'e7e5', eval: null, pv: [] },
    })
    const { result } = renderHook(() =>
      useChessGame({ playerColor: 'white', skill: 8, fetchImpl: fetchImpl as unknown as typeof fetch }),
    )
    expect(result.current.canTakeBack).toBe(false)
  })

  it('takeBack restores position to before the last player move', async () => {
    const fetchImpl = makeFetch({
      '/api/engine/evaluate': { move: 'e2e4', eval: { type: 'cp', value: 20 }, pv: [] },
      '/api/engine/move': { move: 'e7e5', eval: { type: 'cp', value: 10 }, pv: [] },
    })
    const { result } = renderHook(() =>
      useChessGame({ playerColor: 'white', skill: 8, fetchImpl: fetchImpl as unknown as typeof fetch, engineDelayMs: 0 }),
    )
    const startFen = result.current.fen

    await act(async () => {
      await result.current.tryUserMove('e2', 'e4')
    })
    await waitFor(() => expect(result.current.canTakeBack).toBe(true))

    act(() => { result.current.takeBack() })

    expect(result.current.fen).toBe(startFen)
    expect(result.current.currentEval).toBeNull()
    expect(result.current.lastMoveClass).toBeNull()
    expect(result.current.canTakeBack).toBe(false)
  })

  it('canTakeBack is false while engine is thinking', async () => {
    let resolveMove!: (v: unknown) => void
    const movePromise = new Promise((res) => { resolveMove = res })
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('/api/engine/evaluate'))
        return { ok: true, json: async () => ({ move: 'e2e4', eval: { type: 'cp', value: 20 }, pv: [] }) } as Response
      return { ok: true, json: () => movePromise } as unknown as Response
    })
    const { result } = renderHook(() =>
      useChessGame({ playerColor: 'white', skill: 8, fetchImpl: fetchImpl as unknown as typeof fetch, engineDelayMs: 0 }),
    )

    void act(async () => { await result.current.tryUserMove('e2', 'e4') })
    // engine reply is pending; thinking should be true, canTakeBack false
    await waitFor(() => expect(result.current.thinking).toBe(true))
    expect(result.current.canTakeBack).toBe(false)
    resolveMove({ move: 'e7e5', eval: null, pv: [] })
  })
})
