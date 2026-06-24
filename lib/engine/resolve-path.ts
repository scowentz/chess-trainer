import { existsSync } from 'fs'

export function resolveStockfishPath(): string {
  if (process.env.STOCKFISH_PATH && existsSync(process.env.STOCKFISH_PATH)) {
    return process.env.STOCKFISH_PATH
  }
  for (const p of ['/opt/homebrew/bin/stockfish', '/usr/local/bin/stockfish', '/usr/bin/stockfish']) {
    if (existsSync(p)) return p
  }
  return 'stockfish' // fall back to PATH; spawn will error clearly if absent
}
