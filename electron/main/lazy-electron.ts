import { createRequire } from 'node:module'

const requireElectron = createRequire(import.meta.url)

const isWorkerProcess = (): boolean =>
  process.env.AXECODER_WORKSHOP_WORKER === '1' ||
  process.env.AXECODER_AGENT_WORKER === '1' ||
  process.env.AXECODER_INDEXER_WORKER === '1'

export const lazyElectron = (): typeof import('electron') | null => {
  if (isWorkerProcess()) return null
  try {
    return requireElectron('electron') as typeof import('electron')
  } catch {
    return null
  }
}

export const lazyApp = () => lazyElectron()?.app
export const lazyIpcMain = () => lazyElectron()?.ipcMain
export const lazyShell = () => lazyElectron()?.shell
export const lazyBrowserWindow = () => lazyElectron()?.BrowserWindow
