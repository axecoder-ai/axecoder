import { fork, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AgentProgressPayload } from '../../../src/utils/agent-progress'
import { handleAcpHostRequest } from './acp-host-handlers'
import {
  parseAgentWorkerLine,
  serializeAgentWorkerLine,
  type AgentWorkerLine,
} from '../agent-worker/protocol'

type Pending = {
  resolve: (v: unknown) => void
  reject: (e: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export const resolveStandaloneAgentWorkerPath = (): string => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.join(here, '..', 'agent-worker-process.js'),
    path.join(here, '..', '..', 'dist-electron/main/agent-worker-process.js'),
    path.join(process.cwd(), 'dist-electron/main/agent-worker-process.js'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return candidates[0]!
}

export class AcpStandaloneBridge {
  private proc: ChildProcess | null = null
  private buf = ''
  private nextId = 1
  private pending = new Map<number, Pending>()
  private progressListener: ((p: AgentProgressPayload) => void) | null = null

  setProgressListener(fn: ((p: AgentProgressPayload) => void) | null): void {
    this.progressListener = fn
  }

  ensureWorker(): void {
    if (this.proc && !this.proc.killed) return
    const workerPath = resolveStandaloneAgentWorkerPath()
    if (!fs.existsSync(workerPath)) {
      throw new Error(`Agent worker not found at ${workerPath}`)
    }
    this.proc = fork(workerPath, [], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', AXECODER_AGENT_WORKER: '1' },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    })
    this.proc.stdout?.on('data', (chunk: Buffer) => this.onStdout(chunk))
    this.proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim()
      if (text) process.stderr.write(`[axecoder-acp] ${text}\n`)
    })
    this.proc.on('exit', () => {
      this.proc = null
      for (const [, p] of this.pending) {
        clearTimeout(p.timer)
        p.reject(new Error('Agent worker exited'))
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
        reject(new Error(`Agent worker call timeout: ${method}`))
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
    if (!this.proc?.stdin) throw new Error('Agent worker stdin unavailable')
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
    if (!msg) return

    if (msg.type === 'res') {
      const p = this.pending.get(msg.id)
      if (!p) return
      clearTimeout(p.timer)
      this.pending.delete(msg.id)
      if (msg.ok) p.resolve(msg.result)
      else p.reject(new Error(msg.error ?? 'agent worker error'))
      return
    }

    if (msg.type === 'host') {
      try {
        if (msg.method === 'emitProgress') {
          const payload = msg.params as AgentProgressPayload
          this.progressListener?.(payload)
        }
        const result = await handleAcpHostRequest(msg.method, msg.params)
        this.write({ type: 'hostRes', id: msg.id, ok: true, result })
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        this.write({ type: 'hostRes', id: msg.id, ok: false, error })
      }
    }
  }
}

let sharedBridge: AcpStandaloneBridge | null = null

export const getAcpStandaloneBridge = (): AcpStandaloneBridge => {
  if (!sharedBridge) sharedBridge = new AcpStandaloneBridge()
  return sharedBridge
}

export const resetAcpStandaloneBridgeForTests = (): void => {
  sharedBridge?.shutdown()
  sharedBridge = null
}
