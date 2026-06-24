import type { ExplorerPosition } from './types'

const MASTERS_URL = 'https://explorer.lichess.ovh/masters'

export interface ExplorerClient {
  fetchPosition(fen: string): Promise<ExplorerPosition>
}

interface RawExplorer {
  white: number
  draws: number
  black: number
  opening: { eco: string; name: string } | null
  moves: { uci: string; san: string; white: number; draws: number; black: number }[]
}

export function createExplorerClient(opts: { fetchImpl?: typeof fetch; baseUrl?: string } = {}): ExplorerClient {
  const doFetch = opts.fetchImpl ?? fetch
  const baseUrl = opts.baseUrl ?? MASTERS_URL
  return {
    async fetchPosition(fen: string): Promise<ExplorerPosition> {
      const url = `${baseUrl}?fen=${encodeURIComponent(fen)}&moves=12&topGames=0`
      const res = await doFetch(url)
      if (!res.ok) throw new Error(`explorer HTTP ${res.status}`)
      const data = (await res.json()) as RawExplorer
      return {
        opening: data.opening,
        totalGames: data.white + data.draws + data.black,
        moves: data.moves.map((m) => ({
          uci: m.uci,
          san: m.san,
          white: m.white,
          draws: m.draws,
          black: m.black,
        })),
      }
    },
  }
}
