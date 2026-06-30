import { fork, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app } from 'electron'
import { getConfig } from './config-store'
import { handleAgentWorkerHostRequest } from './agent-worker/host-handlers'
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

let bridge: AgentWorkerBridge | null = null
let enabledCache: boolean | null = null

export const resetAgentWorkerBridgeForTests = (): void => {
  bridge?.shutdown()
  bridge = null
  enabledCache = null
}

export const isAgentWorkerEnabled = async (): Promise<boolean> => {
  if (enabledCache !== null) return enabledCache
  const cfg = await getConfig()
  enabledCache = cfg.agentWorkerEnabled !== false
  return enabledCache
}

export const getAgentWorkerBridge = async (): Promise<AgentWorkerBridge | null> => {
  if (!(await isAgentWorkerEnabled())) return null
  if (!bridge) bridge = new AgentWorkerBridge()
  bridge.ensureWorker()
  return bridge
}

export const shutdownAgentWorkerBridge = (): void => {
  bridge?.shutdown()
  bridge = null
}

export const resolveAgentWorkerProcessPath = (): string => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.join(here, 'agent-worker-process.js'),
    path.join(app.getAppPath(), 'dist-electron/main/agent-worker-process.js'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return candidates[0]!
}

export class AgentWorkerBridge {
  private proc: ChildProcess | null = null
  private buf = ''
  private nextId = 1
  private pending = new Map<number, Pending>()
  private pendingHost = new Map<number, { resolve: () => void; reject: (e: Error) => void }>()

  ensureWorker(): void {
    if (this.proc && !this.proc.killed) return
    const workerPath = resolveAgentWorkerProcessPath()
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
      if (text) console.error(`[agent-worker] ${text}`)
    })
    this.proc.on('exit', () => {
      this.proc = null
      for (const [, p] of this.pending) {
        clearTimeout(p.timer)
        p.reject(new Error('Agent worker exited'))
      }
      this.pending.clear()
      for (const [, p] of this.pendingHost) {
        p.reject(new Error('Agent worker exited'))
      }
      this.pendingHost.clear()
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
        const result = await handleAgentWorkerHostRequest(msg.method, msg.params)
        this.write({ type: 'hostRes', id: msg.id, ok: true, result })
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        this.write({ type: 'hostRes', id: msg.id, ok: false, error })
      }
      return
    }
  }
}
