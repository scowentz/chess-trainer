// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Stub react-chessboard so the test doesn't depend on its rendering internals.
vi.mock('react-chessboard', () => ({
  Chessboard: (props: { position?: string }) => <div data-testid="board" data-fen={props.position} />,
}))

import { ChessGame } from './ChessGame'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('ChessGame', () => {
  it('renders the board and strength selector', () => {
    render(<ChessGame />)
    expect(screen.getByTestId('board')).toBeInTheDocument()
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })
})
