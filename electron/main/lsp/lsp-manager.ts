import { createLSPServerManager, type LSPServerManager } from './lsp-server-manager'

type InitState = 'not-started' | 'pending' | 'success' | 'failed'

let manager: LSPServerManager | undefined
let initState: InitState = 'not-started'
let initPromise: Promise<void> | undefined
let boundProjectRoot = ''

export const getLspServerManager = (): LSPServerManager | undefined => {
  if (initState === 'failed') return undefined
  return manager
}

export const getInitializationStatus = (): InitState | 'failed' => initState

export const waitForInitialization = async (): Promise<void> => {
  if (initState === 'success' || initState === 'failed') return
  if (initState === 'pending' && initPromise) await initPromise
}

export const isLspConnected = (): boolean => {
  if (initState === 'failed') return false
  const m = getLspServerManager()
  if (!m) return false
  const servers = m.getAllServers()
  if (servers.size === 0) return false
  for (const s of servers.values()) {
    if (s.state !== 'error') return true
  }
  return false
}

export const shutdownLspServerManager = async (): Promise<void> => {
  if (manager) await manager.shutdown()
  manager = undefined
  initState = 'not-started'
  initPromise = undefined
  boundProjectRoot = ''
}

export const ensureLspForProject = async (projectRoot: string): Promise<void> => {
  const root = projectRoot.trim()
  if (!root) return

  if (manager && boundProjectRoot === root && initState === 'success') return

  await shutdownLspServerManager()
  boundProjectRoot = root
  manager = createLSPServerManager()
  initState = 'pending'

  initPromise = manager
    .initialize(root)
    .then(() => {
      initState = manager!.getAllServers().size > 0 ? 'success' : 'failed'
      if (initState === 'failed') manager = undefined
    })
    .catch(() => {
      initState = 'failed'
      manager = undefined
    })

  await initPromise
}

/** 应用退出时调用 */
export const initializeLspServerManagerOnReady = (): void => {
  /* 懒加载：首次 Agent LSP 调用时 ensureLspForProject */
}
