import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app } from 'electron'

const CMD_TIMEOUT_MS = 45_000
const VALID_ACTIONS = new Set(['navigate', 'snapshot', 'click', 'type', 'screenshot'])

export type WebRunArgs = {
  action: string
  url?: string
  selector?: string
  text?: string
}

type Pending = {
  resolve: (v: { ok: true; text: string } | { ok: false; error: string }) => void
  timer: ReturnType<typeof setTimeout>
}

let bridge: BrowserBridge | null = null

export const resolveBrowserRunnerPath = (): string => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.join(here, 'browser-runner.mjs'),
    path.join(app.getAppPath(), 'electron/main/agent/browser-runner.mjs'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return candidates[candidates.length - 1]!
}

class BrowserBridge {
  private proc: ChildProcessWithoutNullStreams | null = null
  private buf = ''
  private nextId = 1
  private pending = new Map<number, Pending>()

  private ensureProc() {
    if (this.proc) return
    const runner = resolveBrowserRunnerPath()
    if (!fs.existsSync(runner)) {
      throw new Error(`browser-runner.mjs not found at ${runner}. Run: npx playwright install chromium`)
    }
    this.proc = spawn(process.execPath, [runner], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    this.proc.stdout.on('data', (chunk: Buffer) => {
      this.buf += chunk.toString()
      let idx = this.buf.indexOf('\n')
      while (idx >= 0) {
        const line = this.buf.slice(0, idx).trim()
        this.buf = this.buf.slice(idx + 1)
        idx = this.buf.indexOf('\n')
        if (!line) continue
        try {
          const msg = JSON.parse(line) as { id?: number; ok?: boolean; text?: string; error?: string }
          if (typeof msg.id !== 'number') continue
          const p = this.pending.get(msg.id)
          if (!p) continue
          clearTimeout(p.timer)
          this.pending.delete(msg.id)
          if (msg.ok) p.resolve({ ok: true, text: String(msg.text ?? '') })
          else p.resolve({ ok: false, error: String(msg.error ?? 'browser error') })
        } catch {
          // ignore malformed line
        }
      }
    })
    this.proc.on('exit', () => {
      this.proc = null
      for (const [, p] of this.pending) {
        clearTimeout(p.timer)
        p.resolve({ ok: false, error: 'browser subprocess exited' })
      }
      this.pending.clear()
    })
  }

  async send(args: WebRunArgs): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
    this.ensureProc()
    if (!this.proc?.stdin) return { ok: false, error: 'browser subprocess not ready' }
    const id = this.nextId++
    const payload = JSON.stringify({ id, ...args })
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        resolve({ ok: false, error: 'WebRun timed out' })
      }, CMD_TIMEOUT_MS)
      this.pending.set(id, { resolve, timer })
      this.proc!.stdin!.write(`${payload}\n`)
    })
  }

  async shutdown() {
    if (!this.proc?.stdin) return
    try {
      await this.send({ action: 'shutdown' })
    } catch {
      this.proc?.kill()
    }
    this.proc = null
  }
}

const getBridge = () => {
  if (!bridge) bridge = new BrowserBridge()
  return bridge
}

export const runWebRun = async (
  args: WebRunArgs,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  const action = args.action.trim()
  if (!VALID_ACTIONS.has(action)) {
    return { ok: false, error: `action must be one of: ${[...VALID_ACTIONS].join(', ')}` }
  }
  if (action === 'navigate') {
    const url = (args.url ?? '').trim()
    if (!url) return { ok: false, error: 'url is required for navigate' }
    if (!/^https?:\/\//i.test(url)) return { ok: false, error: 'url must start with http:// or https://' }
  }
  try {
    return await getBridge().send(args)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export const resetBrowserBridgeForTests = () => {
  bridge = null
}
