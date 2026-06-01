import type { BrowserWindow } from 'electron'
import type { WorkshopProgressPayload } from './workshop-types'

let getMainWindow: (() => BrowserWindow | null) | null = null

export const bindWorkshopProgressWindow = (fn: () => BrowserWindow | null) => {
  getMainWindow = fn
}

export const emitWorkshopProgress = (payload: WorkshopProgressPayload) => {
  getMainWindow?.()?.webContents.send('workshop:progress', payload)
}
