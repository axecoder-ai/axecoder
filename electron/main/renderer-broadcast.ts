import { BrowserWindow } from 'electron'

export const broadcastToRenderers = (channel: string, payload: unknown) => {
  for (const w of BrowserWindow.getAllWindows()) {
    if (w.isDestroyed()) continue
    w.webContents.send(channel, payload)
  }
}
