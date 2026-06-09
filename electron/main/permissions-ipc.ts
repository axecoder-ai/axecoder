import { ipcMain } from 'electron'
import type { PermissionsPolicy } from './agent/agent-permission-rules'
import { buildGlobalPermissionsPolicy } from './agent/agent-permissions'
import { getConfig, setConfig } from './config-store'
import { axecoderPath } from './axecoder-dir'
import {
  getProjectPermissions,
  getProjectPermissionsPath,
  setProjectPermissions,
} from './project-permissions-store'
import type { AgentPermissionMode } from './agent/agent-permissions'

export type PermissionsView = {
  global: PermissionsPolicy
  globalPath: string
  project: PermissionsPolicy
  projectPath: string
  agentPermissionMode: AgentPermissionMode
}

const toView = async (projectRoot: string): Promise<PermissionsView> => {
  const cfg = await getConfig()
  return {
    global: buildGlobalPermissionsPolicy(cfg),
    globalPath: axecoderPath('config.json'),
    project: await getProjectPermissions(projectRoot),
    projectPath: projectRoot?.trim() ? getProjectPermissionsPath(projectRoot) : '',
    agentPermissionMode: cfg.agentPermissionMode ?? 'default',
  }
}

export const registerPermissionsIpc = () => {
  ipcMain.handle('permissions:get', async (_, projectRoot: string) => {
    try {
      return { ok: true as const, data: await toView(projectRoot ?? '') }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle(
    'permissions:setGlobal',
    async (
      _,
      input: {
        agentPermissionMode?: AgentPermissionMode
        allow?: string[]
        ask?: string[]
        deny?: string[]
      },
    ) => {
      try {
        await setConfig({
          agentPermissionMode: input.agentPermissionMode,
          agentPermissionAllowRules: input.allow,
          agentPermissionAskRules: input.ask,
          agentPermissionDenyRules: input.deny,
        })
        return { ok: true as const }
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
      }
    },
  )

  ipcMain.handle(
    'permissions:setProject',
    async (
      _,
      projectRoot: string,
      input: Partial<PermissionsPolicy>,
    ) => {
      try {
        const data = await setProjectPermissions(projectRoot, input)
        return { ok: true as const, data }
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
      }
    },
  )

  ipcMain.handle('permissions:writeProjectJson', async (_, projectRoot: string, jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText) as Partial<PermissionsPolicy>
      const data = await setProjectPermissions(projectRoot, parsed)
      return { ok: true as const, data }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('permissions:writeGlobalJson', async (_, jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText) as {
        agentPermissionMode?: AgentPermissionMode
        allow?: string[]
        ask?: string[]
        deny?: string[]
      }
      await setConfig({
        agentPermissionMode: parsed.agentPermissionMode,
        agentPermissionAllowRules: parsed.allow,
        agentPermissionAskRules: parsed.ask,
        agentPermissionDenyRules: parsed.deny,
      })
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })
}
