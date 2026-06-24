import { EngineManager } from './manager'

const globalForEngine = globalThis as unknown as { __engine?: EngineManager }

export function getEngine(): EngineManager {
  if (!globalForEngine.__engine) {
    globalForEngine.__engine = new EngineManager()
  }
  return globalForEngine.__engine
}

export { EngineManager }
export type { BestMoveResult, EngineEval, Color } from './types'
