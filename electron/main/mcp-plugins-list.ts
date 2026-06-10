import { getMcpJsonServerNames } from './agent/agent-mcp'
import { BUILTIN_MCP_PLUGINS, type McpPluginDefinition } from './mcp-plugins-registry'
import { readMcpPluginsFile } from './mcp-plugins-store'
import { hasMcpOAuthTokens } from './mcp-oauth-store'
import { getSecret } from './secrets-store'

export type McpPluginView = {
  id: string
  displayName: string
  description: string
  docUrl: string
  enabled: boolean
  authMode: 'oauth' | 'api_key'
  connected: boolean
  hasApiKey: boolean
  managedBy: 'plugin' | 'mcp.json'
}

export const isPluginAuthenticated = async (def: McpPluginDefinition): Promise<boolean> => {
  if (def.authMode === 'oauth') {
    if (await hasMcpOAuthTokens(def.id)) return true
    if (def.secretKey) return !!(await getSecret(def.secretKey)).trim()
    return false
  }
  if (!def.secretKey) return false
  return !!(await getSecret(def.secretKey)).trim()
}

export const listMcpPluginViews = async (projectRoot?: string): Promise<McpPluginView[]> => {
  const jsonNames = await getMcpJsonServerNames(projectRoot)
  const file = await readMcpPluginsFile()
  const views: McpPluginView[] = []
  for (const def of BUILTIN_MCP_PLUGINS) {
    const connected = await isPluginAuthenticated(def)
    const hasKey = def.secretKey ? !!(await getSecret(def.secretKey)).trim() : false
    const managedBy = jsonNames.has(def.serverName) ? 'mcp.json' : 'plugin'
    const pluginEnabled = file.plugins[def.id]?.enabled ?? false
    views.push({
      id: def.id,
      displayName: def.displayName,
      description: def.description,
      docUrl: def.docUrl,
      enabled: managedBy === 'mcp.json' ? true : pluginEnabled,
      authMode: def.authMode,
      connected,
      hasApiKey: hasKey,
      managedBy,
    })
  }
  return views
}
