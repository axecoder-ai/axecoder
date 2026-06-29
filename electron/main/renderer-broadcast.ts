import { lazyBrowserWindow } from './lazy-electron'

export const broadcastToRenderers = (channel: string, payload: unknown) => {
  const BrowserWindow = lazyBrowserWindow()
  if (!BrowserWindow?.getAllWindows) return
  for (const w of BrowserWindow.getAllWindows()) {
    if (w.isDestroyed()) continue
    w.webContents.send(channel, payload)
  }
}
