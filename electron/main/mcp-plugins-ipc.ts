import { ipcMain } from 'electron'
import { disconnectMcpServer, getMcpClient } from './agent/agent-mcp-runtime'
import { pluginToServerConfig } from './mcp-plugins-store'
import { getMcpPluginById } from './mcp-plugins-registry'
import { listMcpPluginViews, isPluginAuthenticated, type McpPluginView } from './mcp-plugins-list'
import { setPluginEnabled } from './mcp-plugins-store'
import { connectMcpPluginOAuth } from './mcp-oauth-connect'
import { clearMcpOAuthSession } from './mcp-oauth-store'
import { setSecret } from './secrets-store'

export type { McpPluginView }

const findView = async (id: string, projectRoot?: string) => {
  const views = await listMcpPluginViews(projectRoot)
  return views.find((v) => v.id === id)
}

export const registerMcpPluginsIpc = () => {
  ipcMain.handle('mcpPlugins:list', async (_, projectRoot?: string) => {
    try {
      const plugins = await listMcpPluginViews(
        typeof projectRoot === 'string' ? projectRoot : undefined,
      )
      return { ok: true as const, plugins }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle(
    'mcpPlugins:setEnabled',
    async (_, id: string, enabled: boolean, projectRoot?: string) => {
      try {
        const def = getMcpPluginById(id)
        if (!def) return { ok: false as const, error: `Unknown MCP plugin: ${id}` }
        const view = await findView(id, typeof projectRoot === 'string' ? projectRoot : undefined)
        if (view?.managedBy === 'mcp.json') {
          return { ok: false as const, error: 'This server is already configured in mcp.json' }
        }
        if (enabled && !(await isPluginAuthenticated(def))) {
          return {
            ok: false as const,
            error: 'Connect to Context7 first (OAuth sign-in required)',
          }
        }
        await setPluginEnabled(id, enabled)
        await disconnectMcpServer(def.serverName)
        return { ok: true as const }
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
      }
    },
  )

  ipcMain.handle('mcpPlugins:connect', async (_, id: string, projectRoot?: string) => {
    try {
      const def = getMcpPluginById(id)
      if (!def) return { ok: false as const, error: `Unknown MCP plugin: ${id}` }
      const view = await findView(id, typeof projectRoot === 'string' ? projectRoot : undefined)
      if (view?.managedBy === 'mcp.json') {
        return { ok: false as const, error: 'This server is already configured in mcp.json' }
      }
      if (def.authMode !== 'oauth') {
        return { ok: false as const, error: 'OAuth connect is not available for this plugin' }
      }
      const res = await connectMcpPluginOAuth(id)
      if (!res.ok) return res
      await setPluginEnabled(id, true)
      await disconnectMcpServer(def.serverName)
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('mcpPlugins:disconnect', async (_, id: string) => {
    try {
      const def = getMcpPluginById(id)
      if (!def) return { ok: false as const, error: `Unknown MCP plugin: ${id}` }
      await clearMcpOAuthSession(id)
      await setPluginEnabled(id, false)
      await disconnectMcpServer(def.serverName)
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('mcpPlugins:setApiKey', async (_, id: string, apiKey: string) => {
    try {
      const def = getMcpPluginById(id)
      if (!def?.secretKey) return { ok: false as const, error: `Unknown MCP plugin: ${id}` }
      await setSecret(def.secretKey, apiKey)
      await disconnectMcpServer(def.serverName)
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('mcpPlugins:test', async (_, id: string) => {
    try {
      const def = getMcpPluginById(id)
      if (!def) return { ok: false as const, error: `Unknown MCP plugin: ${id}` }
      const cfg = await pluginToServerConfig(def)
      if (!cfg) {
        return { ok: false as const, error: 'Not connected — use Connect to sign in first' }
      }
      const conn = await getMcpClient(cfg)
      if (!conn.ok) return { ok: false as const, error: conn.error }
      const tools = conn.pooled.toolNames ?? []
      await disconnectMcpServer(def.serverName)
      const lower = new Set(tools.map((t) => t.toLowerCase()))
      for (const expected of def.expectedTools) {
        if (!lower.has(expected.toLowerCase())) {
          return {
            ok: false as const,
            error: `Missing expected tool: ${expected} (got: ${tools.join(', ') || 'none'})`,
          }
        }
      }
      return { ok: true as const, tools }
    } catch (e) {
      await disconnectMcpServer(getMcpPluginById(id)?.serverName ?? '')
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })
}
