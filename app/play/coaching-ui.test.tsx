// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { BlunderModal } from './BlunderModal'
import { HintButton } from './HintButton'
import { StrengthSelector } from './StrengthSelector'
import { ReviewPanel } from './ReviewPanel'

afterEach(() => cleanup())

describe('BlunderModal', () => {
  it('shows the loss and fires callbacks', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<BlunderModal lossCp={250} onConfirm={onConfirm} onCancel={onCancel} />)
    expect(screen.getByText(/blunder/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /take it back/i }))
    expect(onCancel).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /play it anyway/i }))
    expect(onConfirm).toHaveBeenCalled()
  })
})

describe('HintButton', () => {
  it('shows progressive hint text', () => {
    const onHint = vi.fn()
    const { rerender } = render(<HintButton hint={{ piece: null, move: null }} onHint={onHint} />)
    fireEvent.click(screen.getByRole('button', { name: /hint/i }))
    expect(onHint).toHaveBeenCalled()
    rerender(<HintButton hint={{ piece: 'g1', move: null }} onHint={onHint} />)
    expect(screen.getByText(/g1/)).toBeInTheDocument()
    rerender(<HintButton hint={{ piece: 'g1', move: 'g1f3' }} onHint={onHint} />)
    expect(screen.getByText(/g1f3/)).toBeInTheDocument()
  })
})

describe('StrengthSelector', () => {
  it('reports changes', () => {
    const onChange = vi.fn()
    render(<StrengthSelector skill={8} onChange={onChange} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '12' } })
    expect(onChange).toHaveBeenCalledWith(12)
  })
})

describe('ReviewPanel', () => {
  it('renders each reviewed move', () => {
    render(
      <ReviewPanel
        reviews={[
          { ply: 1, mover: 'white', classification: 'blunder', bestMove: 'g1f3' },
          { ply: 2, mover: 'white', classification: 'good', bestMove: 'd2d4' },
        ]}
      />,
    )
    expect(screen.getByText(/blunder/i)).toBeInTheDocument()
    expect(screen.getByText(/g1f3/)).toBeInTheDocument()
  })

  it('renders the explanation alongside each review label', () => {
    render(
      <ReviewPanel
        reviews={[
          {
            ply: 1,
            mover: 'white',
            classification: 'blunder',
            bestMove: 'd1d2',
            explanation: 'You left your queen on d3 hanging.',
          },
        ]}
      />,
    )
    expect(screen.getByText(/blunder/i)).toBeInTheDocument()
    expect(screen.getByText(/queen on d3/i)).toBeInTheDocument()
  })
})
