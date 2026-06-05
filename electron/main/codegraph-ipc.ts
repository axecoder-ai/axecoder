import { ipcMain, type BrowserWindow } from 'electron'
import { getConfig } from './config-store'
import {
  getCodeGraphPublicStatus,
  startBackgroundCodeGraphIndex,
  type CodeGraphPublicStatus,
} from './codegraph/manager'

export const registerCodeGraphIpc = (getMainWindow: () => BrowserWindow | null) => {
  void getMainWindow

  const boot = getCodeGraphPublicStatus('')
  console.log(
    `[codegraph] sqlite=${boot.sqliteAvailable} engine=${boot.engineAvailable} dist=${boot.distPath || '(none)'}`,
  )

  ipcMain.handle('codegraph:status', (_, projectRoot: string): CodeGraphPublicStatus => {
    return getCodeGraphPublicStatus(typeof projectRoot === 'string' ? projectRoot : '')
  })

  ipcMain.handle('codegraph:index', async (_, projectRoot: string) => {
    const root = typeof projectRoot === 'string' ? projectRoot.trim() : ''
    if (!root) return { ok: false as const, error: '未打开项目' }

    const cfg = await getConfig()
    if (cfg.agentFeatureCodeGraph === false) {
      return { ok: false as const, error: 'CodeGraph 已在设置中关闭（agentFeatureCodeGraph）' }
    }

    startBackgroundCodeGraphIndex(root)
    return { ok: true as const }
  })
}

/** 打开项目后：若开启 CodeGraph，后台建索引（不阻塞 UI） */
export const maybeAutoIndexCodeGraph = async (projectRoot: string) => {
  const root = projectRoot.trim()
  if (!root) return
  const cfg = await getConfig()
  if (cfg.agentFeatureCodeGraph === false) return
  startBackgroundCodeGraphIndex(root)
}
