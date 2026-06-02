import { ipcMain } from 'electron'
import type { RuleSaveInput, RuleScope } from './rules-types'
import { deleteRule, listRules, readRule, saveRule } from './rules-store'
import { getConfig, setConfig } from '../config-store'

export const registerRulesIpc = () => {
  ipcMain.handle('rules:list', async (_, projectRoot?: string | null) => {
    try {
      return { ok: true as const, data: await listRules(projectRoot) }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('rules:read', async (_, scope: RuleScope, fileName: string, projectRoot?: string) => {
    try {
      return { ok: true as const, data: await readRule(scope, fileName, projectRoot) }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('rules:save', async (_, input: RuleSaveInput) => {
    try {
      return { ok: true as const, data: await saveRule(input) }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('rules:delete', async (_, scope: RuleScope, fileName: string, projectRoot?: string) => {
    try {
      return { ok: true as const, data: await deleteRule(scope, fileName, projectRoot) }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('rules:getThirdPartyImport', async () => {
    const cfg = await getConfig()
    return { ok: true as const, enabled: cfg.rulesIncludeThirdPartyPlugins === true }
  })

  ipcMain.handle('rules:setThirdPartyImport', async (_, enabled: boolean) => {
    try {
      await setConfig({ rulesIncludeThirdPartyPlugins: enabled })
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })
}
