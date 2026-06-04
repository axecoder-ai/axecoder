import { ipcMain } from 'electron'
import type { SkillSaveInput, SkillScope } from './skills-types'
import { deleteSkill, listSkills, readSkill, saveSkill } from './skills-store'

export const registerSkillsIpc = () => {
  ipcMain.handle('skills:list', async (_, projectRoot?: string | null) => {
    try {
      return { ok: true as const, data: await listSkills(projectRoot) }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle(
    'skills:read',
    async (_, scope: SkillScope, folderName: string, projectRoot?: string) => {
      try {
        return { ok: true as const, data: await readSkill(scope, folderName, projectRoot) }
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
      }
    },
  )

  ipcMain.handle('skills:save', async (_, input: SkillSaveInput) => {
    try {
      return { ok: true as const, data: await saveSkill(input) }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle(
    'skills:delete',
    async (_, scope: 'user' | 'project', folderName: string, projectRoot?: string) => {
      try {
        return { ok: true as const, data: await deleteSkill(scope, folderName, projectRoot) }
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
      }
    },
  )
}
