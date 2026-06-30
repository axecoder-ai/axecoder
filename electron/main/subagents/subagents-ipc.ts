import { ipcMain } from 'electron'
import type { SubagentSaveInput, SubagentScope } from './subagents-types'
import { deleteSubagent, listSubagents, readSubagent, saveSubagent } from './subagents-store'

export const registerSubagentsIpc = () => {
  ipcMain.handle('subagents:list', async (_, projectRoot?: string | null) => {
    try {
      return { ok: true as const, data: await listSubagents(projectRoot) }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle(
    'subagents:read',
    async (_, scope: SubagentScope, fileName: string, projectRoot?: string) => {
      try {
        return { ok: true as const, data: await readSubagent(scope, fileName, projectRoot) }
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
      }
    },
  )

  ipcMain.handle('subagents:save', async (_, input: SubagentSaveInput) => {
    try {
      return { ok: true as const, data: await saveSubagent(input) }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle(
    'subagents:delete',
    async (_, scope: 'user' | 'project', fileName: string, projectRoot?: string) => {
      try {
        return { ok: true as const, data: await deleteSubagent(scope, fileName, projectRoot) }
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
      }
    },
  )
}
