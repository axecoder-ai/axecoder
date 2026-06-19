import type { BrowserWindow } from 'electron'

let getMainWindow: () => BrowserWindow | null = () => null

export const setDrawIoMainWindowGetter = (fn: () => BrowserWindow | null) => {
  getMainWindow = fn
}

export const emitDrawIoDiagramUpdated = (workshopId: string, xml: string) => {
  const win = getMainWindow()
  if (!win || win.isDestroyed()) return
  win.webContents.send('drawIo:diagramUpdated', { workshopId, xml })
}
