'use client'

export function ReviewPanel({
  reviews,
}: {
  reviews: { ply: number; mover: string; classification: string; bestMove: string }[]
}) {
  return (
    <div>
      <h2>Game review</h2>
      <ul>
        {reviews.map((r) => (
          <li key={r.ply}>
            Move {Math.ceil(r.ply / 2)} ({r.mover}): <strong>{r.classification}</strong> — best was {r.bestMove}
          </li>
        ))}
      </ul>
    </div>
  )
}
