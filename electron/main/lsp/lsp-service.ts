import { createLSPServerManager, type LSPServerManager } from './lsp-server-manager'
import type { LSPServerInstance } from './lsp-server-instance'
import {
  getExtensionHostBridge,
  isExtensionHostLspEnabled,
  setExtensionHostNotifyHandler,
} from '../extension-host-bridge'

type InitState = 'not-started' | 'pending' | 'success' | 'failed'

type DiagnosticsCallback = (payload: unknown) => void

let localManager: LSPServerManager | undefined
let hostProxy: HostLspProxy | undefined
let initState: InitState = 'not-started'
let initPromise: Promise<void> | undefined
let boundProjectRoot = ''
let diagnosticsCallback: DiagnosticsCallback | null = null

class HostLspProxy implements LSPServerManager {
  async initialize(projectRoot: string): Promise<void> {
    const bridge = await getExtensionHostBridge()
    if (!bridge) throw new Error('Extension host unavailable')
    const res = await bridge.call<{ ok?: boolean; serverCount?: number }>('ensureProject', {
      projectRoot,
    })
    if ((res?.serverCount ?? 0) === 0) throw new Error('No LSP servers configured')
    await bridge.call('bindDiagnostics', {})
  }

  async shutdown(): Promise<void> {
    const bridge = await getExtensionHostBridge()
    if (bridge) await bridge.call('shutdown', {})
  }

  async sendRequest<T>(filePath: string, method: string, params: unknown): Promise<T | undefined> {
    const bridge = await getExtensionHostBridge()
    if (!bridge) return undefined
    return bridge.call<T | undefined>('sendRequest', { filePath, method, params })
  }

  async sendNotification(filePath: string, method: string, params: unknown): Promise<void> {
    const bridge = await getExtensionHostBridge()
    if (!bridge) return
    await bridge.call('sendNotification', { filePath, method, params })
  }

  async openFile(filePath: string, content: string, version?: number): Promise<void> {
    const bridge = await getExtensionHostBridge()
    if (!bridge) return
    await bridge.call('openFile', { filePath, content, version })
  }

  async changeFile(filePath: string, version: number, content: string): Promise<void> {
    const bridge = await getExtensionHostBridge()
    if (!bridge) return
    await bridge.call('changeFile', { filePath, version, content })
  }

  async closeFile(filePath: string): Promise<void> {
    const bridge = await getExtensionHostBridge()
    if (!bridge) return
    await bridge.call('closeFile', { filePath })
  }

  isFileOpen(filePath: string): boolean {
    return false
  }

  getLanguageId(filePath: string): string | undefined {
    return undefined
  }

  getAllServers(): Map<string, LSPServerInstance> {
    return new Map()
  }
}

const useHost = async (): Promise<boolean> => {
  if (!(await isExtensionHostLspEnabled())) return false
  try {
    await getExtensionHostBridge()
    return true
  } catch {
    return false
  }
}

const getActiveManager = (): LSPServerManager | undefined => {
  if (initState === 'failed') return undefined
  return hostProxy ?? localManager
}

export const setLspDiagnosticsCallback = (fn: DiagnosticsCallback | null): void => {
  diagnosticsCallback = fn
  setExtensionHostNotifyHandler((channel, payload) => {
    if (channel === 'diagnostics') diagnosticsCallback?.(payload)
  })
}

export const getLspServerManager = (): LSPServerManager | undefined => getActiveManager()

export const getInitializationStatus = (): InitState | 'failed' => initState

export const waitForInitialization = async (): Promise<void> => {
  if (initState === 'success' || initState === 'failed') return
  if (initState === 'pending' && initPromise) await initPromise
}

export const isLspConnected = (): boolean => {
  if (initState === 'failed') return false
  const m = getActiveManager()
  if (!m) return false
  if (hostProxy) return initState === 'success'
  const servers = m.getAllServers()
  if (servers.size === 0) return false
  for (const s of servers.values()) {
    if (s.state !== 'error') return true
  }
  return false
}

export const shutdownLspServerManager = async (): Promise<void> => {
  if (hostProxy) await hostProxy.shutdown()
  if (localManager) await localManager.shutdown()
  hostProxy = undefined
  localManager = undefined
  initState = 'not-started'
  initPromise = undefined
  boundProjectRoot = ''
}

export const ensureLspForProject = async (projectRoot: string): Promise<void> => {
  const root = projectRoot.trim()
  if (!root) return

  if (getActiveManager() && boundProjectRoot === root && initState === 'success') return

  await shutdownLspServerManager()
  boundProjectRoot = root
  initState = 'pending'

  initPromise = (async () => {
    const viaHost = await useHost()
    if (viaHost) {
      try {
        hostProxy = new HostLspProxy()
        await hostProxy.initialize(root)
        initState = 'success'
        return
      } catch {
        hostProxy = undefined
      }
    }

    localManager = createLSPServerManager()
    await localManager.initialize(root)
    initState = localManager.getAllServers().size > 0 ? 'success' : 'failed'
    if (initState === 'failed') localManager = undefined
  })().catch(() => {
    initState = 'failed'
    hostProxy = undefined
    localManager = undefined
  })

  await initPromise
}

export const initializeLspServerManagerOnReady = (): void => {
  /* 懒加载：首次 LSP 调用时 ensureLspForProject */
}

/** Host 模式下异步查询文件是否已打开 */
export const isLspFileOpen = async (filePath: string): Promise<boolean> => {
  if (hostProxy) {
    const bridge = await getExtensionHostBridge()
    if (!bridge) return false
    return Boolean(await bridge.call<boolean>('isFileOpen', { filePath }))
  }
  return localManager?.isFileOpen(filePath) ?? false
}

/** workspace/symbol：编辑器与 Agent 共用 */
export const lspWorkspaceSymbol = async (query: string): Promise<unknown[]> => {
  if (hostProxy) {
    const bridge = await getExtensionHostBridge()
    if (!bridge) return []
    const res = await bridge.call<unknown[]>('workspaceRequest', {
      method: 'workspace/symbol',
      params: { query },
    })
    return Array.isArray(res) ? res : []
  }

  const mgr = localManager
  if (!mgr) return []
  const out: unknown[] = []
  for (const server of mgr.getAllServers().values()) {
    if (server.state !== 'running') continue
    try {
      const res = await server.sendRequest<unknown[]>('workspace/symbol', { query })
      if (Array.isArray(res)) out.push(...res)
    } catch {
      /* skip */
    }
  }
  return out
}
