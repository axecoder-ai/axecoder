import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import { getWorkshopSession } from './workshop/workshop-store'
import { getWorkshopDiagramXml } from './draw-io/draw-io-store'
import { setDrawIoMainWindowGetter } from './draw-io/draw-io-emit'

export const registerDrawIoIpc = (getMainWindow: () => BrowserWindow | null) => {
  setDrawIoMainWindowGetter(getMainWindow)

  ipcMain.handle(
    'drawIo:getDiagram',
    async (_, projectRoot: string, workshopId: string) => {
      const root = typeof projectRoot === 'string' ? projectRoot : ''
      const wid = typeof workshopId === 'string' ? workshopId.trim() : ''
      if (!root || !wid) return { ok: false as const, error: 'Invalid args' }
      const { session } = await getWorkshopSession(root, wid)
      if (!session) return { ok: false as const, error: 'Workshop not found' }
      return { ok: true as const, xml: getWorkshopDiagramXml(session) }
    },
  )
}
