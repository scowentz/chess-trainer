import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Chess Trainer</h1>
      <Link href="/play">Play vs. the coached engine →</Link>
    </main>
  )
}
