export interface ExplorerMove {
  uci: string
  san: string
  white: number
  draws: number
  black: number
}

export interface ExplorerPosition {
  opening: { eco: string; name: string } | null
  totalGames: number
  moves: ExplorerMove[]
}
