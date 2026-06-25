'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Detail {
  repertoire: { id: number; name: string; eco: string | null; color: string; built_at: string }
  nodes: { fen: string; is_trainee_turn: number }[]
}

export default function OpeningOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void fetch(`/api/openings/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.repertoire) setDetail(d as Detail)
        else router.replace('/openings')
      })
  }, [id, router])

  async function rebuild() {
    setBusy(true)
    try {
      await fetch(`/api/openings/${id}/rebuild`, { method: 'POST' })
      const fresh = await fetch(`/api/openings/${id}`).then((r) => r.json())
      setDetail(fresh)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    await fetch(`/api/openings/${id}`, { method: 'DELETE' })
    router.push('/openings')
  }

  if (!detail) return <main className="mx-auto max-w-2xl px-4 py-8 text-muted">Loading…</main>

  const cardCount = detail.nodes.filter((n) => n.is_trainee_turn === 1).length

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="font-serif text-2xl font-semibold text-ink">{detail.repertoire.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {detail.repertoire.eco} · <span className="capitalize">{detail.repertoire.color}</span> · {cardCount} positions
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/openings/${id}/drill`}
          className="cursor-pointer rounded-lg bg-brass px-5 py-2.5 text-sm font-semibold text-[#241c0c] transition-colors hover:bg-brass-bright"
        >
          Start drill
        </Link>
        <button
          type="button"
          onClick={rebuild}
          disabled={busy}
          className="cursor-pointer rounded-lg border border-line px-4 py-2.5 text-sm text-muted transition-colors hover:text-ink disabled:opacity-60"
        >
          {busy ? 'Rebuilding…' : 'Rebuild from explorer'}
        </button>
        <button
          type="button"
          onClick={remove}
          className="cursor-pointer rounded-lg border border-red-500/40 px-4 py-2.5 text-sm text-red-300 transition-colors hover:bg-red-500/10"
        >
          Delete
        </button>
      </div>
    </main>
  )
}
