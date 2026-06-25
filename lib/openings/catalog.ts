import { Chess } from 'chess.js'
import fs from 'fs'
import path from 'path'

export interface CatalogEntry {
  id: string
  eco: string
  name: string
  pgn: string
}

export function parseCatalog(tsv: string): CatalogEntry[] {
  const seen = new Set<string>()
  const entries: CatalogEntry[] = []
  for (const line of tsv.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const [eco, name, pgn] = trimmed.split('\t')
    if (!eco || !name || !pgn) continue
    if (eco.toLowerCase() === 'eco') continue // stray header
    const id = `${eco}:${name}`
    if (seen.has(id)) continue
    seen.add(id)
    entries.push({ id, eco, name, pgn })
  }
  return entries
}

export function searchCatalog(entries: CatalogEntry[], query: string, limit = 30): CatalogEntry[] {
  const q = query.trim().toLowerCase()
  const matched = q
    ? entries.filter((e) => e.name.toLowerCase().includes(q) || e.eco.toLowerCase().includes(q))
    : entries
  return matched.slice(0, limit)
}

export function resolveStart(pgn: string): { startFen: string; startPath: string[] } {
  const game = new Chess()
  game.loadPgn(pgn)
  const startPath = game.history({ verbose: true }).map((h) => h.from + h.to + (h.promotion ?? ''))
  return { startFen: game.fen(), startPath }
}

let _cache: CatalogEntry[] | null = null
export function loadCatalog(): CatalogEntry[] {
  if (!_cache) {
    const file = path.join(process.cwd(), 'lib', 'openings', 'data', 'openings.tsv')
    _cache = parseCatalog(fs.readFileSync(file, 'utf8'))
  }
  return _cache
}
