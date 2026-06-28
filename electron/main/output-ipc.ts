import { ipcMain, type BrowserWindow } from 'electron'
import {
  appendOutput,
  clearOutput,
  getOutputLines,
  listOutputChannels,
} from './output-channel'

export const registerOutputIpc = (getWin: () => BrowserWindow | null) => {
  ipcMain.handle('output:append', (_, channel: string, line: string) => {
    appendOutput(channel, line)
    getWin()?.webContents.send('output:updated', { channel, line })
    return { ok: true as const }
  })

  ipcMain.handle('output:clear', (_, channel: string) => {
    clearOutput(channel)
    getWin()?.webContents.send('output:cleared', { channel })
    return { ok: true as const }
  })

  ipcMain.handle('output:listChannels', () => ({
    ok: true as const,
    channels: listOutputChannels(),
  }))

  ipcMain.handle('output:getLines', (_, channel: string) => ({
    ok: true as const,
    lines: getOutputLines(channel),
  }))
}
