import { ipcMain } from 'electron'
import type { ModelSaveInput } from './models-types'
import {
  listModels,
  saveModel,
  deleteModel,
  toggleModel,
  setActiveModel,
} from './models-store'

export const registerModelsIpc = () => {
  ipcMain.handle('models:list', async () => listModels())

  ipcMain.handle('models:save', async (_, input: ModelSaveInput) => {
    try {
      return { ok: true as const, data: await saveModel(input) }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('models:delete', async (_, id: string) => {
    try {
      return { ok: true as const, data: await deleteModel(id) }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('models:toggle', async (_, id: string, enabled: boolean) => {
    try {
      return { ok: true as const, data: await toggleModel(id, enabled) }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('models:setActive', async (_, id: string) => {
    try {
      return { ok: true as const, data: await setActiveModel(id) }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })
}
