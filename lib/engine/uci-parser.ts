import type { EngineEval } from './types'

export function parseBestMove(line: string): string | null {
  const m = line.match(/^bestmove\s+(\S+)/)
  return m ? m[1] : null
}

export function parseInfoLine(
  line: string,
): { depth?: number; eval?: EngineEval; pv?: string[] } | null {
  if (!line.startsWith('info ')) return null
  const result: { depth?: number; eval?: EngineEval; pv?: string[] } = {}

  const depthM = line.match(/\bdepth\s+(\d+)/)
  if (depthM) result.depth = parseInt(depthM[1], 10)

  const cpM = line.match(/\bscore\s+cp\s+(-?\d+)/)
  const mateM = line.match(/\bscore\s+mate\s+(-?\d+)/)
  if (cpM) result.eval = { type: 'cp', value: parseInt(cpM[1], 10) }
  else if (mateM) result.eval = { type: 'mate', value: parseInt(mateM[1], 10) }

  const pvM = line.match(/\bpv\s+(.+)$/)
  if (pvM) result.pv = pvM[1].trim().split(/\s+/)

  return result
}
