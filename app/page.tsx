import Link from 'next/link'

const FEATURES = [
  {
    title: 'Move-by-move coaching',
    body: 'Every move is graded — from Best to Blunder — with a plain-English reason why.',
  },
  {
    title: 'Blunder guardrails',
    body: 'About to hang a piece? A gentle warning lets you take it back before it counts.',
  },
  {
    title: 'Full game review',
    body: 'Finish a game and replay the story of your decisions, one ply at a time.',
  },
]

export default function Home() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-3xl place-items-center px-6 py-16">
      <div className="w-full text-center">
        <span className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-brass/30 bg-brass/10 text-4xl text-brass-bright">
          <span aria-hidden="true">♞</span>
        </span>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Chess Trainer</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          Play against a tunable engine that coaches you in real time — explaining the quality of every move so you
          actually get better.
        </p>

        <Link
          href="/play"
          className="mt-8 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brass px-6 py-3 text-base font-semibold text-[#241c0c] shadow-lg transition-colors duration-200 hover:bg-brass-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70"
        >
          Start playing
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
        <Link
          href="/openings"
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line px-6 py-3 text-base font-semibold text-ink transition-colors duration-200 hover:border-brass/60 hover:text-brass-bright"
        >
          Train openings
        </Link>

        <div className="mt-14 grid gap-4 text-left sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-surface/70 p-5">
              <h2 className="font-serif text-lg font-semibold text-brass-bright">{f.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
