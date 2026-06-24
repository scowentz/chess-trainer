'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Summary {
  id: number
  name: string
  eco: string | null
  color: string
  cardCount: number
  dueCount: number
}

export default function OpeningsDashboard() {
  const [items, setItems] = useState<Summary[] | null>(null)

  useEffect(() => {
    void fetch('/api/openings')
      .then((r) => r.json())
      .then((d) => setItems(d.repertoires as Summary[]))
  }, [])

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-ink">Openings</h1>
        <Link
          href="/openings/new"
          className="cursor-pointer rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-[#241c0c] transition-colors hover:bg-brass-bright"
        >
          Add opening
        </Link>
      </div>

      {!items ? (
        <p className="text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-muted">No openings yet. Add one to start drilling.</p>
      ) : (
        <ul className="grid gap-3">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={`/openings/${it.id}`}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-line bg-surface/70 px-4 py-3 transition-colors hover:border-brass/50"
              >
                <span>
                  <span className="font-serif text-lg text-ink">{it.name}</span>
                  <span className="ml-2 font-mono text-xs text-faint">{it.eco}</span>
                  <span className="ml-2 text-xs capitalize text-muted">· {it.color}</span>
                </span>
                <span className="text-sm text-brass-bright">{it.dueCount} due</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
