import type { Readable, Writable } from 'node:stream'
import { createLSPServerManager, type LSPServerManager } from '../lsp/lsp-server-manager'
import {
  parseExtensionHostLine,
  serializeExtensionHostLine,
  type ExtensionHostLine,
  type ExtensionHostResponse,
} from './protocol'

type Handler = (params: unknown) => Promise<unknown>

let manager: LSPServerManager | undefined
let boundProjectRoot = ''
let diagnosticsBound = false

const bindDiagnostics = (write: (msg: ExtensionHostLine) => void) => {
  if (diagnosticsBound || !manager) return
  for (const server of manager.getAllServers().values()) {
    server.onNotification('textDocument/publishDiagnostics', (params: unknown) => {
      write({ type: 'notify', channel: 'diagnostics', payload: params })
    })
  }
  diagnosticsBound = true
}

const resetManager = async () => {
  if (manager) await manager.shutdown()
  manager = undefined
  boundProjectRoot = ''
  diagnosticsBound = false
}

const handlers: Record<string, Handler> = {
  ping: async () => ({ pong: true }),

  ensureProject: async (params) => {
    const projectRoot = String((params as { projectRoot?: string })?.projectRoot ?? '').trim()
    if (!projectRoot) return { ok: false, error: 'No project' }
    if (manager && boundProjectRoot === projectRoot) {
      return { ok: true, serverCount: manager.getAllServers().size }
    }
    await resetManager()
    boundProjectRoot = projectRoot
    manager = createLSPServerManager()
    await manager.initialize(projectRoot)
    return { ok: true, serverCount: manager.getAllServers().size }
  },

  openFile: async (params) => {
    const p = params as { filePath: string; content: string; version?: number }
    if (!manager) throw new Error('LSP not initialized')
    await manager.openFile(p.filePath, p.content, p.version)
    return { ok: true }
  },

  changeFile: async (params) => {
    const p = params as { filePath: string; content: string; version: number }
    if (!manager) throw new Error('LSP not initialized')
    await manager.changeFile(p.filePath, p.version, p.content)
    return { ok: true }
  },

  closeFile: async (params) => {
    const p = params as { filePath: string }
    if (!manager) return { ok: true }
    await manager.closeFile(p.filePath)
    return { ok: true }
  },

  sendRequest: async (params) => {
    const p = params as { filePath: string; method: string; params: unknown }
    if (!manager) return undefined
    return manager.sendRequest(p.filePath, p.method, p.params)
  },

  sendNotification: async (params) => {
    const p = params as { filePath: string; method: string; params: unknown }
    if (!manager) return
    await manager.sendNotification(p.filePath, p.method, p.params)
  },

  isFileOpen: async (params) => {
    const p = params as { filePath: string }
    if (!manager) return false
    return manager.isFileOpen(p.filePath)
  },

  getLanguageId: async (params) => {
    const p = params as { filePath: string }
    if (!manager) return undefined
    return manager.getLanguageId(p.filePath)
  },

  getServerStates: async () => {
    if (!manager) return {}
    const out: Record<string, string> = {}
    for (const [name, server] of manager.getAllServers()) {
      out[name] = server.state
    }
    return out
  },

  workspaceRequest: async (params) => {
    const p = params as { method: string; params: unknown }
    if (!manager) return []
    const out: unknown[] = []
    for (const server of manager.getAllServers().values()) {
      if (server.state !== 'running') continue
      try {
        const res = await server.sendRequest<unknown>(p.method, p.params)
        if (Array.isArray(res)) out.push(...res)
        else if (res !== undefined && res !== null) out.push(res)
      } catch {
        /* skip */
      }
    }
    return out
  },

  shutdown: async () => {
    await resetManager()
    return { ok: true }
  },
}

export const runExtensionHostLspLoop = (stdin: Readable, stdout: Writable): void => {
  let buf = ''

  const write = (msg: ExtensionHostLine) => {
    stdout.write(serializeExtensionHostLine(msg))
  }

  const respond = (id: number, ok: boolean, result?: unknown, error?: string) => {
    const res: ExtensionHostResponse = { type: 'res', id, ok, result, error }
    write(res)
  }

  stdin.on('data', (chunk: Buffer) => {
    buf += chunk.toString()
    let idx: number
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx)
      buf = buf.slice(idx + 1)
      const msg = parseExtensionHostLine(line)
      if (!msg) continue

      if (msg.type === 'notify') continue

      if (msg.type === 'res') continue

      if (msg.type !== 'req') continue

      void (async () => {
        try {
          if (msg.method === 'bindDiagnostics') {
            bindDiagnostics(write)
            respond(msg.id, true, { bound: true })
            return
          }
          const handler = handlers[msg.method]
          if (!handler) {
            respond(msg.id, false, undefined, `Unknown method: ${msg.method}`)
            return
          }
          const result = await handler(msg.params)
          respond(msg.id, true, result)
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e)
          respond(msg.id, false, undefined, err)
        }
      })()
    }
  })
}
