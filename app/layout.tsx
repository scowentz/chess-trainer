import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Chess Trainer',
  description: 'Play a coached chess engine that explains the quality of every move.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
