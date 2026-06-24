// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MoveBadge } from './MoveBadge'

afterEach(() => cleanup())

describe('MoveBadge', () => {
  it('renders the label and explanation for a class', () => {
    render(<MoveBadge moveClass="blunder" explanation="You left your queen on d3 hanging." />)
    expect(screen.getByText(/blunder/i)).toBeInTheDocument()
    expect(screen.getByText(/queen on d3/i)).toBeInTheDocument()
  })

  it('renders nothing when no class', () => {
    const { container } = render(<MoveBadge moveClass={null} explanation={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
