import { fork, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app } from 'electron'
import { getConfig } from './config-store'
import {
  parseAgentWorkerLine,
  serializeAgentWorkerLine,
  type AgentWorkerLine,
} from './agent-worker/protocol'

type Pending = {
  resolve: (v: unknown) => void
  reject: (e: Error) => void
  timer: ReturnType<typeof setTimeout>
}

let bridge: IndexerWorkerBridge | null = null
let enabledCache: boolean | null = null

export const resetIndexerWorkerBridgeForTests = (): void => {
  bridge?.shutdown()
  bridge = null
  enabledCache = null
}

export const isIndexerWorkerEnabled = async (): Promise<boolean> => {
  if (enabledCache !== null) return enabledCache
  const cfg = await getConfig()
  enabledCache = cfg.indexerWorkerEnabled !== false
  return enabledCache
}

export const getIndexerWorkerBridge = async (): Promise<IndexerWorkerBridge | null> => {
  if (!(await isIndexerWorkerEnabled())) return null
  if (!bridge) bridge = new IndexerWorkerBridge()
  bridge.ensureWorker()
  return bridge
}

export const shutdownIndexerWorkerBridge = (): void => {
  bridge?.shutdown()
  bridge = null
}

export const resolveIndexerWorkerProcessPath = (): string => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.join(here, 'indexer-worker-process.js'),
    path.join(app.getAppPath(), 'dist-electron/main/indexer-worker-process.js'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return candidates[0]!
}

export class IndexerWorkerBridge {
  private proc: ChildProcess | null = null
  private buf = ''
  private nextId = 1
  private pending = new Map<number, Pending>()

  ensureWorker(): void {
    if (this.proc && !this.proc.killed) return
    const workerPath = resolveIndexerWorkerProcessPath()
    if (!fs.existsSync(workerPath)) {
      throw new Error(`Indexer worker not found at ${workerPath}`)
    }
    this.proc = fork(workerPath, [], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', AXECODER_INDEXER_WORKER: '1' },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    })
    this.proc.stdout?.on('data', (chunk: Buffer) => this.onStdout(chunk))
    this.proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim()
      if (text) console.error(`[indexer-worker] ${text}`)
    })
    this.proc.on('exit', () => {
      this.proc = null
      for (const [, p] of this.pending) {
        clearTimeout(p.timer)
        p.reject(new Error('Indexer worker exited'))
      }
      this.pending.clear()
    })
  }

  shutdown(): void {
    if (!this.proc) return
    try {
      this.proc.kill()
    } catch {
      /* ignore */
    }
    this.proc = null
  }

  async call<T = unknown>(method: string, params?: unknown): Promise<T> {
    this.ensureWorker()
    const id = this.nextId++
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Indexer worker call timeout: ${method}`))
      }, 600_000)
      this.pending.set(id, {
        resolve: (v) => resolve(v as T),
        reject,
        timer,
      })
      this.write({ type: 'req', id, method, params })
    })
  }

  private write(msg: AgentWorkerLine): void {
    if (!this.proc?.stdin) throw new Error('Indexer worker stdin unavailable')
    this.proc.stdin.write(serializeAgentWorkerLine(msg))
  }

  private onStdout(chunk: Buffer): void {
    this.buf += chunk.toString()
    let idx = this.buf.indexOf('\n')
    while (idx >= 0) {
      const line = this.buf.slice(0, idx)
      this.buf = this.buf.slice(idx + 1)
      idx = this.buf.indexOf('\n')
      void this.handleLine(line)
    }
  }

  private async handleLine(line: string): Promise<void> {
    const msg = parseAgentWorkerLine(line)
    if (!msg || msg.type !== 'res') return
    const p = this.pending.get(msg.id)
    if (!p) return
    clearTimeout(p.timer)
    this.pending.delete(msg.id)
    if (msg.ok) p.resolve(msg.result)
    else p.reject(new Error(msg.error ?? 'indexer worker error'))
  }
}
