// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'

let dropHandler: ((from: string, to: string) => boolean) | null = null
vi.mock('react-chessboard', () => ({
  Chessboard: (props: { onPieceDrop?: (f: string, t: string) => boolean; position?: string }) => {
    dropHandler = props.onPieceDrop ?? null
    return <div data-testid="board" data-fen={props.position} />
  },
}))
vi.mock('@/lib/sound/sounds', () => ({ playSound: vi.fn(), primeAudio: vi.fn() }))

import { DrillBoard } from './DrillBoard'
import type { DrillNode } from '@/lib/openings/drill-session'

afterEach(() => {
  cleanup()
  dropHandler = null
})

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const node: DrillNode = {
  fen: startFen,
  isTraineeTurn: true,
  acceptableUci: ['e2e4'],
  spineUci: 'e2e4',
  opponentReplies: [],
}

describe('DrillBoard', () => {
  it('reports a correct book move', () => {
    const onReview = vi.fn()
    render(<DrillBoard nodes={[node]} startFen={startFen} color="white" onReview={onReview} />)
    act(() => {
      dropHandler?.('e2', 'e4')
    })
    expect(onReview).toHaveBeenCalledWith(startFen, true)
  })

  it('reports an off-book move as incorrect and shows a correction', () => {
    const onReview = vi.fn()
    render(<DrillBoard nodes={[node]} startFen={startFen} color="white" onReview={onReview} />)
    act(() => {
      dropHandler?.('a2', 'a3')
    })
    expect(onReview).toHaveBeenCalledWith(startFen, false)
    expect(screen.getByText(/book move/i)).toBeInTheDocument()
  })
})
