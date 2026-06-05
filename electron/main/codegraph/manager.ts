import path from 'node:path'
import {
  createVendoredToolHandler,
  getCodeGraphDistRoot,
  isNodeSqliteAvailable,
  loadVendoredCodeGraph,
  type VendoredToolHandler,
} from './bridge'

type Session = {
  handler: VendoredToolHandler
  cg: unknown
}

const sessions = new Map<string, Session>()
const ensureLocks = new Map<string, Promise<Session>>()
const indexingRoots = new Set<string>()

export type CodeGraphPublicStatus = {
  backendAvailable: boolean
  sqliteAvailable: boolean
  engineAvailable: boolean
  initialized: boolean
  indexing: boolean
  distPath: string
}

const startFileWatcher = (cg: unknown) => {
  const w = cg as { watch?: () => boolean }
  if (typeof w.watch === 'function') {
    try {
      w.watch()
    } catch {
      // ignore watcher failures (network fs etc.)
    }
  }
}

const resolveRoot = (projectRoot: string) => path.resolve(projectRoot.trim())

export const isCodeGraphBackendAvailable = () => isNodeSqliteAvailable()

export const isProjectCodeGraphReady = (projectRoot: string) => {
  try {
    const CodeGraph = loadVendoredCodeGraph()
    return CodeGraph.isInitialized(resolveRoot(projectRoot))
  } catch {
    return false
  }
}

export const getCodeGraphPublicStatus = (projectRoot: string): CodeGraphPublicStatus => {
  const root = resolveRoot(projectRoot)
  const sqliteAvailable = isNodeSqliteAvailable()
  let distPath = ''
  let engineAvailable = false
  if (sqliteAvailable) {
    try {
      distPath = getCodeGraphDistRoot()
      loadVendoredCodeGraph()
      engineAvailable = true
    } catch {
      engineAvailable = false
      distPath = ''
    }
  }
  const backendAvailable = sqliteAvailable && engineAvailable
  return {
    backendAvailable,
    sqliteAvailable,
    engineAvailable,
    initialized: root && backendAvailable ? isProjectCodeGraphReady(root) : false,
    indexing: root ? indexingRoots.has(root) : false,
    distPath,
  }
}

/** 打开项目或点按钮时调用：后台 init/index + 文件监听 */
export const startBackgroundCodeGraphIndex = (projectRoot: string): void => {
  const root = resolveRoot(projectRoot)
  if (!root || indexingRoots.has(root)) return
  indexingRoots.add(root)
  void ensureCodeGraphSession(root)
    .then((res) => {
      if (res.ok) startFileWatcher(res.session.cg)
    })
    .finally(() => {
      indexingRoots.delete(root)
    })
}

export const closeCodeGraphSession = (projectRoot: string) => {
  const root = resolveRoot(projectRoot)
  const s = sessions.get(root)
  if (s && typeof (s.cg as { close?: () => void }).close === 'function') {
    ;(s.cg as { close: () => void }).close()
  }
  sessions.delete(root)
  ensureLocks.delete(root)
}

export const ensureCodeGraphSession = async (
  projectRoot: string,
): Promise<{ ok: true; session: Session } | { ok: false; error: string }> => {
  const root = resolveRoot(projectRoot)
  if (!root) return { ok: false, error: 'projectRoot is required' }

  if (!isNodeSqliteAvailable()) {
    return {
      ok: false,
      error:
        'CodeGraph SQLite 不可用。请重新安装/打包 AxeCoder（内置 better-sqlite3），或升级至带 node:sqlite 的运行时。',
    }
  }

  const cached = sessions.get(root)
  if (cached) return { ok: true, session: cached }

  let pending = ensureLocks.get(root)
  if (!pending) {
    pending = (async () => {
      const CodeGraph = loadVendoredCodeGraph()
      let cg: unknown
      if (CodeGraph.isInitialized(root)) {
        cg = await CodeGraph.open(root, { sync: true })
      } else {
        cg = await CodeGraph.init(root, { index: true })
      }
      const handler = createVendoredToolHandler(cg)
      const session: Session = { cg, handler }
      sessions.set(root, session)
      startFileWatcher(cg)
      return session
    })()
    ensureLocks.set(root, pending)
  }

  try {
    const session = await pending
    return { ok: true, session }
  } catch (e) {
    ensureLocks.delete(root)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export const executeVendoredCodeGraphTool = async (
  projectRoot: string,
  mcpToolName: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; text: string }> => {
  const ready = await ensureCodeGraphSession(projectRoot)
  if (!ready.ok) return { ok: false, text: `Error: ${ready.error}` }

  const payload = { ...args, projectPath: resolveRoot(projectRoot) }
  const result = await ready.session.handler.execute(mcpToolName, payload)
  const text = result.content.map((c) => c.text).join('\n')
  return { ok: !result.isError, text: text || '(empty result)' }
}
