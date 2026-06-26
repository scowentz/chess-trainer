// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

// Stub react-chessboard so the test doesn't depend on its rendering internals.
vi.mock('react-chessboard', () => ({
  Chessboard: (props: { position?: string }) => <div data-testid="board" data-fen={props.position} />,
}))

import { ChessGame } from './ChessGame'

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('ChessGame', () => {
  it('renders the board and strength selector', () => {
    render(<ChessGame />)
    expect(screen.getByTestId('board')).toBeInTheDocument()
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('renders the advantage bar', () => {
    render(<ChessGame />)
    expect(screen.getByTestId('advantage-bar')).toBeInTheDocument()
  })

  it('does not show take-back button at game start', () => {
    render(<ChessGame />)
    expect(screen.queryByRole('button', { name: /take back/i })).not.toBeInTheDocument()
  })
})
