'use client'

export function BlunderModal({
  lossCp,
  onConfirm,
  onCancel,
}: {
  lossCp: number
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="blunder-title"
      className="animate-overlay-in fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="animate-modal-in w-full max-w-sm rounded-2xl border border-line-bright bg-surface p-6 shadow-2xl">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-red-500/15 text-red-400">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </span>
          <h2 id="blunder-title" className="font-serif text-xl font-semibold text-ink">
            Possible blunder
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          That move looks like it loses about{' '}
          <span className="font-semibold text-red-300">{(lossCp / 100).toFixed(1)} pawns</span> of value. Are you sure?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-[#241c0c] transition-colors duration-200 hover:bg-brass-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70"
          >
            Take it back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="cursor-pointer rounded-lg border border-line-bright px-4 py-2 text-sm font-semibold text-muted transition-colors duration-200 hover:border-line-bright hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-bright"
          >
            Play it anyway
          </button>
        </div>
      </div>
    </div>
  )
}
