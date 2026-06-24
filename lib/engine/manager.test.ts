import { describe, it, expect, afterAll } from 'vitest'
import { spawnSync } from 'child_process'
import { EngineManager } from './manager'
import { resolveStockfishPath } from './resolve-path'
import { existsSync } from 'fs'

const path = resolveStockfishPath()
const installed =
  path !== 'stockfish'
    ? existsSync(path)
    : spawnSync('which', ['stockfish'], { encoding: 'utf8' }).status === 0
const d = installed ? describe : describe.skip

const engine = new EngineManager()
afterAll(() => engine.dispose())

d('EngineManager (real Stockfish)', () => {
  it('reports healthy', async () => {
    expect(await engine.health()).toBe(true)
  })

  it('finds mate-in-1 (Rh1-h8#)', async () => {
    // White: Kb6, Rh1. Black: Ka8. White to move: h1h8 is mate.
    const fen = 'k7/8/1K6/8/8/8/8/7R w - - 0 1'
    const res = await engine.bestMove(fen, { skill: 20, depth: 12 })
    expect(res.move).toBe('h1h8')
  })

  it('evaluate returns an eval and a best move from the start position', async () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const res = await engine.evaluate(start, { depth: 10 })
    expect(res.move).toMatch(/^[a-h][1-8][a-h][1-8]/)
    expect(res.eval).not.toBeNull()
  })

  it('serializes concurrent calls without crashing', async () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const results = await Promise.all([
      engine.evaluate(start, { depth: 8 }),
      engine.evaluate(start, { depth: 8 }),
    ])
    expect(results).toHaveLength(2)
    results.forEach((r) => expect(r.move).toMatch(/^[a-h][1-8]/))
  })
})
