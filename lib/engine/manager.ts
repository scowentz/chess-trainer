import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { resolveStockfishPath } from './resolve-path'
import { parseInfoLine, parseBestMove } from './uci-parser'
import { strengthToUciOptions } from './strength'
import type { BestMoveResult, EngineEval } from './types'

type Job = { fn: () => Promise<void>; reject: (e: unknown) => void }

export class EngineManager {
  private proc: ChildProcessWithoutNullStreams | null = null
  private buffer = ''
  private queue: Job[] = []
  private running = false
  private lineHandlers: ((line: string) => void)[] = []
  private binaryPath: string
  private timeoutMs: number

  constructor(opts: { binaryPath?: string; timeoutMs?: number } = {}) {
    this.binaryPath = opts.binaryPath ?? resolveStockfishPath()
    this.timeoutMs = opts.timeoutMs ?? 8000
  }

  private ensureProc(): void {
    if (this.proc) return
    const proc = spawn(this.binaryPath, [])
    proc.stdout.setEncoding('utf8')
    proc.stdout.on('data', (chunk: string) => {
      this.buffer += chunk
      let idx: number
      while ((idx = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, idx).trim()
        this.buffer = this.buffer.slice(idx + 1)
        for (const h of [...this.lineHandlers]) h(line)
      }
    })
    proc.on('exit', () => {
      this.proc = null
    })
    proc.on('error', (err) => {
      this.proc = null
      this.lineHandlers = []
      this.buffer = ''
      for (const job of this.queue) {
        job.reject(err)
      }
      this.queue = []
      this.running = false
    })
    proc.stderr?.on('data', (_chunk: Buffer) => {
      // stderr output is diagnostic only; swallow to prevent crash on unpiped stderr
    })
    this.proc = proc
    this.write('uci')
  }

  private write(cmd: string): void {
    this.ensureProc()
    this.proc!.stdin.write(cmd + '\n')
  }

  /** Send `setup`, collect output lines until `isDone` matches; restart + reject on timeout. */
  private runCommand(setup: () => void, isDone: (line: string) => boolean): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      this.ensureProc()
      const lines: string[] = []
      const timer = setTimeout(() => {
        cleanup()
        this.restart()
        reject(new Error('engine timeout'))
      }, this.timeoutMs)
      const handler = (line: string): void => {
        lines.push(line)
        if (isDone(line)) {
          cleanup()
          resolve(lines)
        }
      }
      const cleanup = (): void => {
        clearTimeout(timer)
        this.lineHandlers = this.lineHandlers.filter((h) => h !== handler)
      }
      this.lineHandlers.push(handler)
      setup()
    })
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn: async () => {
          try {
            resolve(await fn())
          } catch (e) {
            reject(e)
          }
        },
        reject,
      })
      void this.drain()
    })
  }

  private async drain(): Promise<void> {
    if (this.running) return
    this.running = true
    while (this.queue.length) {
      const job = this.queue.shift()!
      await job.fn()
    }
    this.running = false
  }

  private go(
    fen: string,
    opts: { depth: number; skillOptions: [string, number][]; multipv?: number },
  ): Promise<BestMoveResult> {
    return this.enqueue(async () => {
      const multipv = opts.multipv ?? 1
      this.write(`setoption name MultiPV value ${multipv}`)
      for (const [name, value] of opts.skillOptions) {
        this.write(`setoption name ${name} value ${value}`)
      }
      this.write('ucinewgame')
      await this.runCommand(() => this.write('isready'), (l) => l === 'readyok')
      this.write(`position fen ${fen}`)
      const lines = await this.runCommand(
        () => this.write(`go depth ${opts.depth}`),
        (l) => l.startsWith('bestmove'),
      )

      // Keep the latest info per multipv index (engine emits increasing depths).
      const byIndex = new Map<number, { eval: EngineEval; pv: string[] }>()
      let evalResult: EngineEval | null = null
      let pv: string[] = []
      for (const line of lines) {
        const info = parseInfoLine(line)
        if (!info?.eval || !info.pv) continue
        const idx = info.multipv ?? 1
        byIndex.set(idx, { eval: info.eval, pv: info.pv })
        if (idx === 1) {
          evalResult = info.eval
          pv = info.pv
        }
      }
      const move = parseBestMove(lines[lines.length - 1]) ?? '(none)'

      const result: BestMoveResult = { move, eval: evalResult, pv }
      if (multipv > 1) {
        result.lines = [...byIndex.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, v]) => ({ move: v.pv[0], eval: v.eval }))
      }
      return result
    })
  }

  bestMove(fen: string, opts: { skill: number; depth?: number }): Promise<BestMoveResult> {
    return this.go(fen, { depth: opts.depth ?? 12, skillOptions: strengthToUciOptions(opts.skill) })
  }

  evaluate(fen: string, opts: { depth?: number; multipv?: number } = {}): Promise<BestMoveResult> {
    return this.go(fen, {
      depth: opts.depth ?? 14,
      skillOptions: strengthToUciOptions(20),
      multipv: opts.multipv,
    })
  }

  async analyzeGame(fens: string[], opts: { depth?: number } = {}): Promise<BestMoveResult[]> {
    const out: BestMoveResult[] = []
    for (const fen of fens) out.push(await this.evaluate(fen, opts))
    return out
  }

  health(): Promise<boolean> {
    return this.enqueue(() => this.runCommand(() => this.write('isready'), (l) => l === 'readyok'))
      .then(() => true)
      .catch(() => false)
  }

  restart(): void {
    if (this.proc) {
      try {
        this.proc.kill()
      } catch {
        // ignore
      }
      this.proc = null
    }
    this.lineHandlers = []
    this.buffer = ''
    for (const job of this.queue) {
      job.reject(new Error('engine restarted'))
    }
    this.queue = []
    this.running = false
  }

  dispose(): void {
    this.restart()
  }
}
