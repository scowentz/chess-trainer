// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

import NewOpeningPage from './new/page'

beforeEach(() => {
  push.mockReset()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/catalog')) {
        return { json: async () => ({ results: [{ id: 'C50:Italian Game', eco: 'C50', name: 'Italian Game', pgn: '1. e4' }] }) } as Response
      }
      // POST /api/openings
      return { json: async () => ({ id: 11, nodeCount: 5, cardCount: 3 }) } as Response
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('NewOpeningPage', () => {
  it('searches the catalog and creates a repertoire', async () => {
    render(<NewOpeningPage />)
    fireEvent.change(screen.getByPlaceholderText(/search openings/i), { target: { value: 'ital' } })
    await waitFor(() => expect(screen.getByText('Italian Game')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Italian Game'))
    fireEvent.click(screen.getByRole('button', { name: /start learning/i }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/openings/11'))
  })
})
