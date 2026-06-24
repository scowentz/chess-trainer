'use client'

export function HintButton({
  hint,
  onHint,
}: {
  hint: { piece: string | null; move: string | null }
  onHint: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onHint}
        className="group inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface-2/70 px-3.5 py-2 text-sm font-semibold text-ink transition-colors duration-200 hover:border-brass/60 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-brass transition-colors duration-200 group-hover:text-brass-bright"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 18h6" />
          <path d="M10 21h4" />
          <path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.9 1 .98 1.65L9.5 17h5l.12-1.55c.08-.66.48-1.25.98-1.65A6 6 0 0 0 12 3Z" />
        </svg>
        Hint
      </button>
      {hint.move ? (
        <p className="text-sm text-muted">
          Best move:{' '}
          <span className="rounded bg-felt/25 px-1.5 py-0.5 font-mono font-semibold tracking-wide text-brass-bright">
            {hint.move}
          </span>
        </p>
      ) : hint.piece ? (
        <p className="text-sm text-muted">
          Try moving the piece on{' '}
          <span className="rounded bg-felt/25 px-1.5 py-0.5 font-mono font-semibold tracking-wide text-brass-bright">
            {hint.piece}
          </span>
        </p>
      ) : null}
    </div>
  )
}
