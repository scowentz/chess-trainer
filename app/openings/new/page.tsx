'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Color } from '@/lib/engine/types'

interface CatalogEntry {
  id: string
  eco: string
  name: string
  pgn: string
}

export default function NewOpeningPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CatalogEntry[]>([])
  const [selected, setSelected] = useState<CatalogEntry | null>(null)
  const [color, setColor] = useState<Color>('white')
  const [depth, setDepth] = useState(12)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void fetch(`/api/openings/catalog?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setResults(d.results as CatalogEntry[])
      })
    return () => {
      active = false
    }
  }, [query])

  async function create() {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/openings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogId: selected.id, color, maxDepth: depth }),
      })
      const data = (await res.json()) as { id?: number; error?: string }
      if (!res.ok || !data.id) {
        setError(data.error ?? 'Failed to build opening. Please try again.')
        return
      }
      router.push(`/openings/${data.id}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-serif text-2xl font-semibold text-ink">Add an opening</h1>

      <input
        type="text"
        placeholder="Search openings…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 w-full rounded-lg border border-line bg-surface-2/70 px-3.5 py-2 text-ink placeholder:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60"
      />

      <ul className="mb-5 max-h-64 overflow-auto rounded-lg border border-line">
        {results.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => setSelected(e)}
              className={`flex w-full cursor-pointer items-center justify-between px-3.5 py-2 text-left text-sm transition-colors hover:bg-surface-2 ${
                selected?.id === e.id ? 'bg-surface-2 text-brass-bright' : 'text-ink'
              }`}
            >
              <span>{e.name}</span>
              <span className="font-mono text-xs text-faint">{e.eco}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mb-5 flex items-center gap-3">
        <span className="text-sm text-muted">Play as:</span>
        {(['white', 'black'] as Color[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm capitalize transition-colors ${
              color === c ? 'border-brass bg-brass/15 text-brass-bright' : 'border-line text-muted hover:text-ink'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <label className="mb-6 flex items-center gap-3 text-sm text-muted">
        Depth: <span className="tabular-nums text-ink">{depth}</span>
        <input type="range" min={8} max={20} value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
      </label>

      <button
        type="button"
        onClick={create}
        disabled={!selected || busy}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brass px-5 py-2.5 text-sm font-semibold text-[#241c0c] transition-colors hover:bg-brass-bright disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? 'Building…' : 'Start learning'}
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-300">{error}</p>
      )}
    </main>
  )
}
