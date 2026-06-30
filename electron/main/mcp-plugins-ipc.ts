import { ipcMain } from 'electron'
import { disconnectMcpServer, disconnectMcpServerScoped, getMcpClient } from './agent/agent-mcp-runtime'
import { loadMcpConfig } from './agent/agent-mcp'
import { pluginToServerConfig, setPluginEnabled, setPluginSecret } from './mcp-plugins-store'
import { getMcpPluginById } from './mcp-plugins-registry'
import { listMcpPluginViews, isPluginAuthenticated, type McpPluginView } from './mcp-plugins-list'
import { connectMcpPluginOAuth } from './mcp-oauth-connect'
import { clearMcpOAuthSession } from './mcp-oauth-store'

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
        const root = typeof projectRoot === 'string' ? projectRoot : undefined
        if (enabled && def.projectScoped && !root?.trim()) {
          return { ok: false as const, error: `Open a project to enable ${def.displayName}` }
        }
        if (
          enabled &&
          !def.projectScoped &&
          !(await isPluginAuthenticated(def, root))
        ) {
          const msg =
            def.authMode === 'oauth'
              ? `Connect to ${def.displayName} first (OAuth sign-in required)`
              : `Configure ${def.displayName} credentials first`
          return { ok: false as const, error: msg }
        }
        await setPluginEnabled(id, enabled, typeof projectRoot === 'string' ? projectRoot : undefined)
        await disconnectMcpServerScoped(def.serverName)
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
      if (view?.managedBy === 'mcp.json' && def.authMode !== 'oauth') {
        return { ok: false as const, error: 'This server is already configured in mcp.json' }
      }
      if (def.authMode !== 'oauth') {
        return { ok: false as const, error: 'OAuth connect is not available for this plugin' }
      }
      const res = await connectMcpPluginOAuth(id)
      if (!res.ok) return res
      if (view?.managedBy !== 'mcp.json') {
        await setPluginEnabled(id, true)
      }
      await disconnectMcpServer(def.serverName)
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('mcpPlugins:disconnect', async (_, id: string, projectRoot?: string) => {
    try {
      const def = getMcpPluginById(id)
      if (!def) return { ok: false as const, error: `Unknown MCP plugin: ${id}` }
      const view = await findView(id, typeof projectRoot === 'string' ? projectRoot : undefined)
      await clearMcpOAuthSession(id)
      if (view?.managedBy !== 'mcp.json') {
        await setPluginEnabled(id, false)
      }
      await disconnectMcpServer(def.serverName)
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('mcpPlugins:setApiKey', async (_, id: string, apiKey: string, projectRoot?: string) => {
    try {
      const def = getMcpPluginById(id)
      if (!def?.secretKey) return { ok: false as const, error: `Unknown MCP plugin: ${id}` }
      if (def.projectScoped && !projectRoot?.trim()) {
        return { ok: false as const, error: 'Open a project to save MongoDB credentials' }
      }
      await setPluginSecret(
        def.secretKey,
        apiKey,
        typeof projectRoot === 'string' ? projectRoot : undefined,
        def.projectScoped,
      )
      await disconnectMcpServerScoped(def.serverName)
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('mcpPlugins:test', async (_, id: string, projectRoot?: string) => {
    try {
      const def = getMcpPluginById(id)
      if (!def) return { ok: false as const, error: `Unknown MCP plugin: ${id}` }
      const view = await findView(id, typeof projectRoot === 'string' ? projectRoot : undefined)
      let cfg: Awaited<ReturnType<typeof pluginToServerConfig>>
      if (view?.managedBy === 'mcp.json') {
        const { servers } = await loadMcpConfig(
          typeof projectRoot === 'string' ? projectRoot : undefined,
        )
        cfg = servers.find((s) => s.name === def.serverName) ?? null
      } else {
        cfg = await pluginToServerConfig(
          def,
          typeof projectRoot === 'string' ? projectRoot : undefined,
        )
      }
      if (!cfg) {
        return { ok: false as const, error: 'Not connected — configure credentials first' }
      }
      const conn = await getMcpClient(cfg)
      if (!conn.ok) return { ok: false as const, error: conn.error }
      const tools = conn.pooled.toolNames ?? []
      await disconnectMcpServer(cfg.poolKey ?? cfg.name)
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
