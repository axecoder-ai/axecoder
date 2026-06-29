import { fork, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app } from 'electron'
import { getConfig } from './config-store'
import { handleWorkshopWorkerHostRequest } from './workshop-worker/host-handlers'
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

let bridge: WorkshopWorkerBridge | null = null
let enabledCache: boolean | null = null
let workerUnavailable = false

export const resetWorkshopWorkerBridgeForTests = (): void => {
  bridge?.shutdown()
  bridge = null
  enabledCache = null
  workerUnavailable = false
}

export const disableWorkshopWorkerBridge = (): void => {
  workerUnavailable = true
  enabledCache = false
  bridge?.shutdown()
  bridge = null
}

export const isWorkshopWorkerEnabled = async (): Promise<boolean> => {
  if (enabledCache !== null) return enabledCache
  const cfg = await getConfig()
  enabledCache = cfg.workshopWorkerEnabled !== false
  return enabledCache
}

export const getWorkshopWorkerBridge = async (): Promise<WorkshopWorkerBridge | null> => {
  if (workerUnavailable) return null
  if (!(await isWorkshopWorkerEnabled())) return null
  if (!bridge) bridge = new WorkshopWorkerBridge()
  bridge.ensureWorker()
  return bridge
}

export const shutdownWorkshopWorkerBridge = (): void => {
  bridge?.shutdown()
  bridge = null
}

export const resolveWorkshopWorkerProcessPath = (): string => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.join(here, 'workshop-worker-process.js'),
    path.join(app.getAppPath(), 'dist-electron/main/workshop-worker-process.js'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return candidates[0]!
}

export class WorkshopWorkerBridge {
  private proc: ChildProcess | null = null
  private buf = ''
  private nextId = 1
  private pending = new Map<number, Pending>()

  ensureWorker(): void {
    if (this.proc && !this.proc.killed) return
    const workerPath = resolveWorkshopWorkerProcessPath()
    if (!fs.existsSync(workerPath)) {
      throw new Error(`Workshop worker not found at ${workerPath}`)
    }
    this.proc = fork(workerPath, [], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', AXECODER_WORKSHOP_WORKER: '1' },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    })
    this.proc.stdout?.on('data', (chunk: Buffer) => this.onStdout(chunk))
    this.proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim()
      if (text) console.error(`[workshop-worker] ${text}`)
    })
    this.proc.on('exit', () => {
      this.proc = null
      for (const [, p] of this.pending) {
        clearTimeout(p.timer)
        p.reject(new Error('Workshop worker exited'))
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
        reject(new Error(`Workshop worker call timeout: ${method}`))
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
    if (!this.proc?.stdin) throw new Error('Workshop worker stdin unavailable')
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
      else p.reject(new Error(msg.error ?? 'workshop worker error'))
      return
    }

    if (msg.type === 'host') {
      try {
        await handleWorkshopWorkerHostRequest(msg.method, msg.params)
        this.write({ type: 'hostRes', id: msg.id, ok: true })
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        this.write({ type: 'hostRes', id: msg.id, ok: false, error })
      }
    }
  }
}
