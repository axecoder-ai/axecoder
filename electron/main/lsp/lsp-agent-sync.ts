import fs from 'node:fs/promises'
import path from 'node:path'
import { ensureLspForProject, getLspServerManager } from './lsp-manager'

const agentDocVersions = new Map<string, number>()

const nextVersion = (absPath: string) => {
  const v = (agentDocVersions.get(absPath) ?? 0) + 1
  agentDocVersions.set(absPath, v)
  return v
}

/** Agent 写盘后同步主进程 LSP 文档（与编辑器 notify 互补）。 */
export const syncAgentFileToLsp = async (projectRoot: string, filePath: string): Promise<void> => {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath)
  let content = ''
  try {
    content = await fs.readFile(abs, 'utf-8')
  } catch {
    return
  }

  await ensureLspForProject(projectRoot)
  const mgr = getLspServerManager()
  if (!mgr) return

  const version = nextVersion(abs)
  if (mgr.isFileOpen(abs)) {
    await mgr.changeFile(abs, version, content)
  } else {
    await mgr.openFile(abs, content, version)
  }
}

export const resetAgentLspDocVersions = () => {
  agentDocVersions.clear()
}
