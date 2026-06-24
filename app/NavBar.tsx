'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavBar() {
  const path = usePathname()

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm font-semibold transition-colors duration-150 ${
        path.startsWith(href)
          ? 'text-brass-bright'
          : 'text-muted hover:text-ink'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="sticky top-0 z-10 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 sm:px-6">
        <Link href="/" className="font-serif text-base font-semibold text-ink hover:text-brass-bright transition-colors">
          ♞ Chess Trainer
        </Link>
        <div className="flex items-center gap-5">
          {navLink('/play', 'Play')}
          {navLink('/openings', 'Openings')}
        </div>
      </div>
    </nav>
  )
}
