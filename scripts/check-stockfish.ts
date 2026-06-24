import { spawnSync } from 'child_process'
import { existsSync } from 'fs'

function resolve(): string | null {
  if (process.env.STOCKFISH_PATH && existsSync(process.env.STOCKFISH_PATH)) return process.env.STOCKFISH_PATH
  for (const p of ['/opt/homebrew/bin/stockfish', '/usr/local/bin/stockfish', '/usr/bin/stockfish']) {
    if (existsSync(p)) return p
  }
  const which = spawnSync('which', ['stockfish'], { encoding: 'utf8' })
  return which.status === 0 ? which.stdout.trim() : null
}

const path = resolve()
if (!path) {
  console.error('Stockfish not found. Install with: brew install stockfish')
  process.exit(1)
}
console.log(`Stockfish found at: ${path}`)
