export type Color = 'white' | 'black'

export interface EngineEval {
  /** 'cp' = centipawns from the side-to-move POV; 'mate' = moves to mate (sign = who mates). */
  type: 'cp' | 'mate'
  value: number
}

export interface BestMoveResult {
  /** UCI move, e.g. "e2e4", or "(none)". */
  move: string
  eval: EngineEval | null
  /** Principal variation in UCI. */
  pv: string[]
}
