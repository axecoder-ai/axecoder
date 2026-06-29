import { fork, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lazyApp } from './lazy-electron'
import { getConfig } from './config-store'
import {
  parseExtensionHostLine,
  serializeExtensionHostLine,
  type ExtensionHostLine,
} from './extension-host/protocol'

type Pending = {
  resolve: (v: unknown) => void
  reject: (e: Error) => void
  timer: ReturnType<typeof setTimeout>
}

type NotifyHandler = (channel: string, payload: unknown) => void

let bridge: ExtensionHostBridge | null = null
let enabledCache: boolean | null = null
let notifyHandler: NotifyHandler | null = null

export const resetExtensionHostBridgeForTests = (): void => {
  bridge?.shutdown()
  bridge = null
  enabledCache = null
  notifyHandler = null
}

export const setExtensionHostNotifyHandler = (fn: NotifyHandler | null): void => {
  notifyHandler = fn
}

export const isExtensionHostLspEnabled = async (): Promise<boolean> => {
  if (enabledCache !== null) return enabledCache
  const cfg = await getConfig()
  enabledCache = cfg.extensionHostLspEnabled !== false
  return enabledCache
}

export const getExtensionHostBridge = async (): Promise<ExtensionHostBridge | null> => {
  if (!(await isExtensionHostLspEnabled())) return null
  if (!bridge) bridge = new ExtensionHostBridge()
  bridge.ensureHost()
  return bridge
}

export const shutdownExtensionHostBridge = (): void => {
  bridge?.shutdown()
  bridge = null
}

export const resolveExtensionHostProcessPath = (): string => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [path.join(here, 'extension-host-process.js')]
  const appPath = lazyApp()?.getAppPath()
  if (appPath) {
    candidates.push(path.join(appPath, 'dist-electron/main/extension-host-process.js'))
  }
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return candidates[0]!
}

export class ExtensionHostBridge {
  private proc: ChildProcess | null = null
  private buf = ''
  private nextId = 1
  private pending = new Map<number, Pending>()

  ensureHost(): void {
    if (this.proc && !this.proc.killed) return
    const hostPath = resolveExtensionHostProcessPath()
    if (!fs.existsSync(hostPath)) {
      throw new Error(`Extension host not found at ${hostPath}`)
    }
    this.proc = fork(hostPath, [], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', AXECODER_EXTENSION_HOST: '1' },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    })
    this.proc.stdout?.on('data', (chunk: Buffer) => this.onStdout(chunk))
    this.proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim()
      if (text) console.error(`[extension-host] ${text}`)
    })
    this.proc.on('exit', () => {
      this.proc = null
      for (const [, p] of this.pending) {
        clearTimeout(p.timer)
        p.reject(new Error('Extension host exited'))
      }
      this.pending.clear()
    })
  }

  shutdown(): void {
    if (!this.proc) return
    try {
      void this.call('shutdown', {})
    } catch {
      /* ignore */
    }
    try {
      this.proc.kill()
    } catch {
      /* ignore */
    }
    this.proc = null
  }

  async call<T = unknown>(method: string, params?: unknown): Promise<T> {
    this.ensureHost()
    const id = this.nextId++
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Extension host call timeout: ${method}`))
      }, 120_000)
      this.pending.set(id, {
        resolve: (v) => resolve(v as T),
        reject,
        timer,
      })
      this.write({ type: 'req', id, method, params })
    })
  }

  private write(msg: ExtensionHostLine): void {
    if (!this.proc?.stdin?.writable) throw new Error('Extension host stdin not writable')
    this.proc.stdin.write(serializeExtensionHostLine(msg))
  }

  private onStdout(chunk: Buffer): void {
    this.buf += chunk.toString()
    let idx: number
    while ((idx = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, idx)
      this.buf = this.buf.slice(idx + 1)
      const msg = parseExtensionHostLine(line)
      if (!msg) continue

      if (msg.type === 'notify') {
        notifyHandler?.(msg.channel, msg.payload)
        continue
      }

      if (msg.type !== 'res') continue

      const p = this.pending.get(msg.id)
      if (!p) continue
      this.pending.delete(msg.id)
      clearTimeout(p.timer)
      if (msg.ok) p.resolve(msg.result)
      else p.reject(new Error(msg.error ?? 'Extension host error'))
    }
  }
}
